# ChatterBox Setup

## Prerequisites
- Node.js 18+
- npm
- Optional: Docker (for local MongoDB)

## Environment
- Copy `chatterbox-server/.env.sample` to `chatterbox-server/.env` and fill values.
- For dev, prefer local MongoDB and fast startup:
  - `DB_CONNECT_RETRIES=1`
  - `DB_FALLBACK_LOCAL=true`

## Start Local MongoDB (Docker)
```powershell
docker pull mongo:6
mkdir C:\mongo-data
docker run --name chatterbox-mongo -p 27017:27017 -v C:\mongo-data:/data/db -d mongo:6
```

## Run Server
```powershell
cd chatterbox-server
npm install
nodemon server.js
```
- Health check: http://localhost:5002/health

## Run Client
```powershell
cd chatterbox-client
npm install
npm run dev
```

## Client API Base
- Client uses `VITE_API_URL` if set, else defaults to `http://localhost:5002/api`.
- To change, create `chatterbox-client/.env`:
```
VITE_API_URL=http://localhost:5002/api
```

## Atlas Tips
- Add your current IP in Atlas Network Access (or 0.0.0.0/0 for dev).
- URL-encode special characters in passwords (e.g., `@` → `%40`).
- Use SRV URI: `mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/chatterbox?retryWrites=true&w=majority`.
