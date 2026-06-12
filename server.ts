import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import pool from "./src/server/db";

dotenv.config();

// Backend routes
import authRoutes from "./src/server/routes/authRoutes";
import postsRoutes from "./src/server/routes/postsRoutes";
import messageRoutes from "./src/server/routes/messageRoutes";
import notificationRoutes from "./src/server/routes/notificationRoutes";
import userRoutes from "./src/server/routes/userRoutes";
import geminiRoutes from "./src/server/routes/geminiRoutes";
import searchRoutes from "./src/server/routes/searchRoutes";
import reelRoutes from "./src/server/routes/reelRoutes";
import adRoutes from "./src/server/routes/adRoutes";
import databaseRoutes from "./src/server/routes/databaseRoutes";
import liveRoutes from "./src/server/routes/liveRoutes";
import { sendMessage } from "./src/server/controllers/messageController";
import { initDb } from "./src/server/initDb";
import { setIO } from "./src/server/socketStore";

export let ioInstance: Server;

async function startServer() {
  await initDb();
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });
  ioInstance = io;
  setIO(io);

  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/posts", postsRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/gemini", geminiRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/reels", reelRoutes);
  app.use("/api/ads", adRoutes);
  app.use("/api/database", databaseRoutes);
  app.use("/api/live", liveRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Unmatched API routes return JSON 404, preventing HTML fallback issues
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global JSON error handler for API routes
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API Error Handler Caught:", err);
    res.status(err.status || err.statusCode || 500).json({ 
      error: err.message || "An unexpected server error occurred." 
    });
  });

  // Socket.io logic
  const onlineUsers = new Map<string, string>(); // userId -> socketId

  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    socket.on("join_room", async ({ roomId, userId }) => {
      if (roomId) {
        socket.join(roomId);
      }
      if (userId) {
        const uId = Number(userId);
        if (isNaN(uId) || uId <= 0) return;

        try {
          // Perform an existence check to avoid user_status foreign key constraint failures for invalid/guest sessions
          const checkUser = await pool.query("SELECT 1 FROM users WHERE id = $1", [uId]);
          if (checkUser && checkUser.rows && checkUser.rows.length > 0) {
            onlineUsers.set(uId.toString(), socket.id);
            socket.join(`user_${uId}`);
            
            // Store raw online status in DB for durability
            await pool.query(
              `INSERT INTO user_status (user_id, is_online, last_seen) 
               VALUES ($1, TRUE, CURRENT_TIMESTAMP)
               ON CONFLICT (user_id) 
               DO UPDATE SET is_online = TRUE, last_seen = CURRENT_TIMESTAMP`,
              [uId]
            );
          } else {
            console.warn(`Attempted join_room with non-existent user ID: ${uId}`);
          }
        } catch (dbErr) {
          console.error("Failed to update status in DB:", dbErr);
        }
      }
      io.emit("user_status", Array.from(onlineUsers.keys()));
    });

    socket.on("send_message", async (data) => {
      const { roomId, senderId, receiverId, text, type, attachmentUrl, replyToId } = data;
      try {
        await sendMessage(senderId, receiverId, text || '', type || 'text', attachmentUrl || null, replyToId || null);
      } catch (err) {
        console.error("Socket error saving message:", err);
      }
    });

    socket.on("react_message", (data) => {
      const { messageId, reactions, roomId, receiverId } = data;
      io.to(roomId).emit("receive_reaction", { messageId, reactions });
      if (receiverId) {
        io.to(`user_${receiverId}`).emit("receive_reaction", { messageId, reactions });
      }
    });

    socket.on("typing", (data) => {
      const { roomId, userId, isTyping, senderUsername, receiverId } = data;
      socket.broadcast.emit("user_typing", data);
      if (receiverId) {
        io.to(`user_${receiverId}`).emit("user_typing", data);
      }
    });

    socket.on("seen_receipt", async (data) => {
      const { senderId, receiverId } = data;
      try {
        await pool.query(
          `UPDATE messages SET status = 'seen' 
           WHERE sender_id = $1 AND receiver_id = $2 AND status != 'seen'`,
          [senderId, receiverId]
        );
        io.to(`user_${senderId}`).emit("messages_seen", { seenBy: receiverId, senderId });
      } catch (err) {
        console.error("Failed to update seen receipts on socket:", err);
      }
    });

    // --- Live Streaming Real-time Event Handling ---
    socket.on("join_live", async ({ streamId, userId }) => {
      socket.join(`live_stream_${streamId}`);
      console.log(`Socket [${socket.id}]: User ${userId} joined live room live_stream_${streamId}`);
      try {
        await pool.query(`UPDATE live_streams SET viewer_count = viewer_count + 1 WHERE id = $1`, [streamId]);
        const countRes = await pool.query(`SELECT viewer_count FROM live_streams WHERE id = $1`, [streamId]);
        const count = countRes?.rows?.[0]?.viewer_count || 1;
        io.to(`live_stream_${streamId}`).emit("live_viewers_update", { streamId, count });
        io.to(`live_stream_${streamId}`).emit("viewer_count_updated", { streamId, count });
      } catch (err) {
        console.error("Failed to handle user joining live room:", err);
      }
    });

    socket.on("leave_live", async ({ streamId, userId }) => {
      socket.leave(`live_stream_${streamId}`);
      console.log(`Socket [${socket.id}]: User ${userId} left live room live_stream_${streamId}`);
      try {
        await pool.query(`UPDATE live_streams SET viewer_count = GREATEST(0, viewer_count - 1) WHERE id = $1`, [streamId]);
        const countRes = await pool.query(`SELECT viewer_count FROM live_streams WHERE id = $1`, [streamId]);
        const count = countRes?.rows?.[0]?.viewer_count || 0;
        io.to(`live_stream_${streamId}`).emit("live_viewers_update", { streamId, count });
        io.to(`live_stream_${streamId}`).emit("viewer_count_updated", { streamId, count });
      } catch (err) {
        console.error("Failed to handle user leaving live room:", err);
      }
    });

    socket.on("disconnect", async () => {
      let disconnectedUserId: string | null = null;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }
      
      if (disconnectedUserId) {
        try {
          await pool.query(
            `UPDATE user_status SET is_online = FALSE, last_seen = CURRENT_TIMESTAMP 
             WHERE user_id = $1`,
            [disconnectedUserId]
          );
        } catch (dbErr) {
          console.error("Presence status save failure on disconnect:", dbErr);
        }
      }

      io.emit("user_status", Array.from(onlineUsers.keys()));
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
