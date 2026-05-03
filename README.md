# 📍 LiveTrack — Real-time Location Sharing

A real-time location sharing application built with **Kafka**, **Socket.IO**, and **Leaflet.js**. Only authenticated users can share their location, while anyone can view the live map.

---

## ✨ Features

- 🗺️ **Live Map** — Real-time location updates rendered on an interactive Leaflet.js map
- 🔐 **Authentication** — Sign up / Login via a custom OIDC server (OAuth 2.0 Authorization Code Flow)
- 📡 **Location Sharing** — Only logged-in users can broadcast their location
- 👁️ **Public Viewing** — Anyone can open the map and see active users
- ⚡ **Kafka-powered** — Location updates are streamed through Apache Kafka for scalability
- 🔄 **Socket.IO** — Low-latency real-time communication between server and clients

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Leaflet.js |
| Backend | Node.js, Express.js |
| Real-time | Socket.IO |
| Message Broker | Apache Kafka (KafkaJS) |
| Auth | Custom OIDC Server (OAuth 2.0) |
| Containerization | Docker, Docker Compose |

---

## 📁 Folder Structure

```
root/
├── public/
│   └── index.html           # Frontend — map + auth UI
├── src/
│   ├── index.js             # Entry point
│   ├── config/
│   │   ├── kafka-client.js  # Kafka client setup
│   │   └── kafka-admin.js   # Topic creation script
│   ├── controllers/
│   │   └── auth.controller.js
│   ├── routes/
│   │   └── auth.routes.js
│   └── services/
│       ├── socket.service.js      # Socket.IO + Kafka consumer/producer
│       └── database-processer.js  # Kafka consumer for DB writes
├── .env
├── docker-compose.yaml
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- pnpm
- Docker & Docker Compose

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2. Install dependencies

```bash
pnpm i
```

### 3. Setup environment variables

Create a `.env` file in the root:

```env
PORT=8000
NODE_ENV=development

# Auth (OIDC Server)
ISSUER=https://your-oidc-server.com
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:8000

# Kafka
KAFKA_BROKER=localhost:9092
```

### 4. Start Kafka via Docker

```bash
docker compose up -d
```

### 5. Create Kafka topics

```bash
pnpm run kafka:setup
```

### 6. Start the development server

```bash
pnpm run dev
```

App will be running at **http://localhost:8000** 🎉

---

## 📜 Scripts

| Script | Command | Description |
|---|---|---|
| `start` | `node src/index.js` | Production server |
| `dev` | `node --watch src/index.js` | Development with auto-reload |
| `kafka:setup` | `node src/config/kafka-admin.js` | Create Kafka topics |

---

## 🔑 Auth Flow

1. User clicks **Login / Sign Up** → redirected to OIDC server
2. After login, redirected back with `?code=xxx` in the URL
3. App exchanges the code for `accessToken` + `refreshToken` via `/api/auth/callback`
4. Tokens stored in **httpOnly cookies** (never exposed to JavaScript)
5. `/api/auth/me` verifies the token and returns user info
6. Logged-in users see their name + a **Logout** button; guests see the **Login** button