import http from "node:http";
import path from "node:path";
import "dotenv/config";

import cookieParser from "cookie-parser";

import express from "express";
import { Server } from "socket.io";

import { kafkaClient } from "./kafka-client.js";

async function main() {
  const PORT = process.env.PORT ?? 8000;

  const app = express();
  const server = http.createServer(app);
  const io = new Server();

  app.use(express.json());
  app.use(cookieParser());

  const kafkaProducer = kafkaClient.producer();
  await kafkaProducer.connect();

  const kafkaConsumer = kafkaClient.consumer({
    groupId: `socket-server-${PORT}`,
  });
  await kafkaConsumer.connect();

  await kafkaConsumer.subscribe({
    topics: ["location-updates"],
    fromBeginning: true,
  });

  kafkaConsumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat }) => {
      const data = JSON.parse(message.value.toString());
      console.log(`KafkaConsumer Data Received`, { data });
      io.emit("server:location:update", {
        id: data.id,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      await heartbeat();
    },
  });

  io.attach(server);

  io.on("connection", (socket) => {
    console.log(`[Socket:${socket.id}]: Connected Success...`);

    socket.on("client:location:update", async (locationData) => {
      const { latitude, longitude } = locationData;
      console.log(
        `[Socket:${socket.id}]:client:location:update:`,
        locationData,
      );

      await kafkaProducer.send({
        topic: "location-updates",
        messages: [
          {
            key: socket.id,
            value: JSON.stringify({ id: socket.id, latitude, longitude }),
          },
        ],
      });
    });
  });

  app.use(express.static(path.resolve("./public")));

  app.get("/health", (req, res) => {
    return res.json({ healthy: true });
  });

  app.get("/api/auth/signin", (req, res) => {
    const issuer = process.env.ISSUER ?? "";
    const clientId = process.env.CLIENT_ID ?? "";

    const signinUrl = issuer.endsWith("/")
      ? `${issuer}api/auth/signin?client_id=${clientId}`
      : `${issuer}/api/auth/signin?client_id=${clientId}`;
    return res.redirect(signinUrl);
  });

  app.post("/api/auth/callback", async (req, res) => {
    const { code } = req.body;

    if (!code) return res.status(400).json({ error: "Missing code" });

    try {
      const issuer = process.env.ISSUER.endsWith("/")
        ? process.env.ISSUER
        : `${process.env.ISSUER}/`;

      const requestBody = {
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
      };

      const tokenRes = await fetch(`${issuer}api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const rawResponse = await tokenRes.json();

      if (!tokenRes.ok) {
        return res
          .status(401)
          .json({ error: "Token exchange failed", detail: rawResponse });
      }

      const {
        data: { accessToken, refreshToken },
      } = rawResponse;

      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60,
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("Auth callback error:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies?.access_token;

    if (!token) return res.status(401).json({ authenticated: false });

    try {
      const issuer = process.env.ISSUER.endsWith("/")
        ? process.env.ISSUER
        : `${process.env.ISSUER}/`;

      const userRes = await fetch(`${issuer}api/auth/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawResponse = await userRes.json();

      if (!userRes.ok) return res.status(401).json({ authenticated: false });

      const { data: user } = rawResponse;
      return res.json({ authenticated: true, user });
    } catch (err) {
      console.error("Auth me error:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    return res.json({ success: true });
  });

  server.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`),
  );
}

main();
