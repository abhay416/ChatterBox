
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

// Simple in-memory cache for API responses
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

const getCacheKey = (req) => {
  return `${req.method}-${req.originalUrl}`;
};

const cacheMiddleware = (duration = 30000) => {
  return (req, res, next) => {
    const key = getCacheKey(req);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < duration) {
      return res.json(cached.data);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function (data) {
      cache.set(key, { data, timestamp: Date.now() });
      // Clean up old cache entries
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// CORS (ensure it runs before body parsing to avoid preflight/body issues)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

// allow larger JSON bodies for base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Simple request logger to help debug 404/route problems
app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl}`);
  next();
});
// Health endpoint for quick readiness checks
app.get('/health', (req, res) => {
  const state = mongoose.connection?.readyState;
  res.json({ ok: true, dbReadyState: state });
});


// Routes with caching for read-only endpoints
app.use("/api/auth", authRoutes);
app.use("/api/posts", cacheMiddleware(), postRoutes); // Cache posts for 30 seconds
app.use("/api/users", cacheMiddleware(), userRoutes); // Cache user data for 30 seconds  
app.use("/api/chats", chatRoutes); // Don't cache chat (real-time)

// Debug: list registered routes (helps diagnose 404s)
const listRoutes = () => {
  try {
    console.log('Registered routes:');
    app._router.stack.forEach(function (middleware) {
      if (middleware.route) { // routes registered directly on the app
        const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
        console.log(`[route] ${methods} ${middleware.route.path}`);
      } else if (middleware.name === 'router') { // router middleware
        middleware.handle.stack.forEach(function (handler) {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
            console.log(`[route] ${methods} ${handler.route.path}`);
          }
        });
      }
    });
  } catch (e) {
    console.error('Failed to list routes', e);
  }
};


// Connect mongo and start server with Socket.IO
const PORT = process.env.PORT || 5002;
const http = require('http');
const { Server } = require('socket.io');

// Helper: start server once DB is ready
function startServer() {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
  });

  // expose io via global so controllers can emit events
  global.io = io;

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('join', (roomId) => {
      try { socket.join(roomId); } catch (e) { }
    });
    socket.on('leave', (roomId) => {
      try { socket.leave(roomId); } catch (e) { }
    });
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Modern Mongoose connection (v6+): no deprecated options
const mongoUri = process.env.MONGO_URI;
const mongoLocalUri = process.env.MONGO_URI_LOCAL || 'mongodb://127.0.0.1:27017/chatterbox';
const DB_FALLBACK_LOCAL = String(process.env.DB_FALLBACK_LOCAL || 'true').toLowerCase() === 'true';
const DB_CONNECT_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 2);
const DB_CONNECT_INITIAL_BACKOFF_MS = Number(process.env.DB_CONNECT_INITIAL_BACKOFF_MS || 1000);
const DB_CONNECT_MAX_BACKOFF_MS = Number(process.env.DB_CONNECT_MAX_BACKOFF_MS || 5000);
if (!mongoUri) {
  console.error("Missing MONGO_URI in environment. Add it to .env.");
  process.exit(1);
}

// Log a sanitized URI (without credentials) for diagnostics
try {
  const uriForLog = mongoUri.replace(/:\S+@/g, ':***@');
  console.log("Connecting to MongoDB…", uriForLog);
} catch { }

// Retry with exponential backoff to handle transient network/IP issues
async function connectWithRetry(maxAttempts = DB_CONNECT_RETRIES) {
  let attempt = 1;
  while (attempt <= maxAttempts) {
    try {
      await mongoose.connect(mongoUri);
      console.log("MongoDB connected");
      return true;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt} failed:`);
      console.error(err?.message || err);
      if (attempt === maxAttempts) return false;
      const delay = Math.min(DB_CONNECT_MAX_BACKOFF_MS, DB_CONNECT_INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1));
      console.log(`Retrying in ${Math.round(delay / 1000)}s…`);
      await new Promise(res => setTimeout(res, delay));
      attempt++;
    }
  }
}

(async () => {
  let ok = await connectWithRetry();
  if (!ok) {
    if (!DB_FALLBACK_LOCAL) {
      console.error("Failed to connect to MongoDB after retries.");
      console.error("Checklist: 1) Atlas Network Access has your IP (or 0.0.0.0/0 for dev), 2) Credentials correct and URL-encoded, 3) Using mongodb+srv URI, 4) Cluster is running.");
      return; // keep process alive for nodemon, but do not start server
    }
    console.error("Failed to connect to Atlas after retries. Falling back to local MongoDB…");
    try {
      console.log("Connecting to local MongoDB:", mongoLocalUri);
      await mongoose.connect(mongoLocalUri);
      console.log("Local MongoDB connected");
      ok = true;
    } catch (e) {
      console.error("Local MongoDB connection failed:", e?.message || e);
      console.error("Checklist: 1) Atlas Network Access has your IP (or 0.0.0.0/0 for dev), 2) Credentials correct and URL-encoded, 3) Using mongodb+srv URI, 4) Cluster is running, 5) If using local, ensure MongoDB service is running.");
      return; // keep process alive for nodemon, but do not start server
    }
  }
  if (ok) startServer();
})();
