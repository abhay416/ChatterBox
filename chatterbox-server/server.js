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

/* ===================== CACHE ===================== */
const cache = new Map();
const CACHE_TTL = 30000;

const getCacheKey = (req) => `${req.method}-${req.originalUrl}`;

const cacheMiddleware = (duration = CACHE_TTL) => (req, res, next) => {
  const key = getCacheKey(req);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < duration) {
    return res.json(cached.data);
  }

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    cache.set(key, { data, timestamp: Date.now() });
    if (cache.size > 100) cache.delete(cache.keys().next().value);
    return originalJson(data);
  };

  next();
};

/* ===================== MIDDLEWARE ===================== */
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl}`);
  next();
});

/* ===================== HEALTH ===================== */
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    dbReadyState: mongoose.connection?.readyState
  });
});

/* ===================== ROUTES ===================== */
app.use("/api/auth", authRoutes);
app.use("/api/posts", cacheMiddleware(), postRoutes);
app.use("/api/users", cacheMiddleware(), userRoutes);
app.use("/api/chats", chatRoutes);

/* ===================== MONGODB ===================== */
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("Missing MONGO_URI");
}

let cached = global.__mongoose;
if (!cached) {
  cached = global.__mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri).then((m) => m);
  }

  cached.conn = await cached.promise;
  console.log("MongoDB connected");
  return cached.conn;
}

connectDB().catch(err => {
  console.error("MongoDB connection failed:", err.message);
});

/* ===================== SOCKET.IO (LOCAL ONLY) ===================== */
if (!process.env.VERCEL) {
  const http = require("http");
  const { Server } = require("socket.io");
  const PORT = process.env.PORT || 5002;

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
  });

  global.io = io;

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join", (roomId) => socket.join(roomId));
    socket.on("leave", (roomId) => socket.leave(roomId));

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

/* ===================== EXPORT (CRITICAL FIX) ===================== */
module.exports = app;

