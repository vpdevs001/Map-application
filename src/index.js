import http from "node:http";
import path from "node:path";
import "dotenv/config";

import cookieParser from "cookie-parser";
import express from "express";
import { Server } from "socket.io";

import { kafkaClient } from "./config/kafka-client.js";
import { initSocketService } from "./services/socket.service.js";
import authRoutes from "./routes/auth.routes.js";

async function main() {
  const PORT = process.env.PORT ?? 8000;

  // ── Kafka topic setup ──────────────────────────
  const admin = kafkaClient.admin();
  await admin.connect();
  await admin.createTopics({
    waitForLeaders: true,
    topics: [{ topic: "location-updates", numPartitions: 2 }],
  });
  await admin.disconnect();
  console.log("Kafka topics ready ✅");

  // ── Express + Socket.IO ────────────────────────
  const app = express();
  const server = http.createServer(app);
  const io = new Server();

  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/auth", authRoutes);
  app.use(express.static(path.resolve("./public")));
  app.get("/health", (req, res) => res.json({ healthy: true }));

  io.attach(server);
  await initSocketService(io);

  server.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`),
  );
}

main();
