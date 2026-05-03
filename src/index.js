import http from "node:http";
import path from "node:path";
import "dotenv/config";

import cookieParser from "cookie-parser";
import express from "express";
import { Server } from "socket.io";

import { initSocketService } from "./services/socket.services.js";
import authRoutes from "./routes/auth.routes.js";

async function main() {
  const PORT = process.env.PORT ?? 8000;

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
