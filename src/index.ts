import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "redis";
// import connectDb from "./cassandraDb";
// import { runMigration } from "./cassandraDb/init";
// import { insertComment } from "./commentRepo";
import { v4 as uuidv4 } from "uuid";
import http from "http";
import { Server } from "socket.io";
import {
  deleteCommentsByVideoId,
  getPaginatedCommentsByVideoId,
  getTotalCommentsCount,
  storeComment,
} from "./services/comment.services";
import { IComment } from "./interfaces";
import {
  deleteVideoById,
  getAllVideos,
  storeVideo,
} from "./services/video.services";

const app = express();
app.use(express.json());
app.use(cors());

const REDIS_URL = process.env.REDIS_URL;
const CHANNEL = `live-comments`;

// Create a Redis publisher client
const publisher = createClient({
  url: REDIS_URL,
});
publisher.on("error", (err) => console.error("Redis Publisher Error:", err));

(async () => {
  await publisher.connect();
  console.log("Publisher connected to Redis");
})();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_HOST,
  },
});

const emailToSocketIdMap = new Map<string, string>();
const socketIdToEmailMap = new Map<string, string>();

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("room:join", (data) => {
    console.log("Received message:", data);
    // Broadcast to all other clients
    // socket.broadcast.emit("message", data);
    const { email, room } = data;

    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);

    socket.join(room);

    io.to(room).emit("user:joined", { email, socketId: socket.id });
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", (data) => {
    console.log("user:call:", data);
    const { to, offer } = data;
    io.to(to).emit("incoming:call", {
      from: socket.id,
      offer,
    });
  });

  socket.on("call:accepted", (data) => {
    console.log("call:accepted:", data);
    const { to, answer } = data;
    io.to(to).emit("call:accepted", {
      from: socket.id,
      answer,
    });
  });

  socket.on("peer:nego:needed", (data) => {
    console.log("peer:nego:needed:", data);
    const { to, offer } = data;
    io.to(to).emit("peer:nego:needed", {
      from: socket.id,
      offer,
    });
  });

  socket.on("peer:nego:done", (data) => {
    console.log("peer:nego:done:", data);
    const { to, answer } = data;
    io.to(to).emit("peer:nego:final", {
      from: socket.id,
      answer,
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// runMigration()
//   .then(() => {
//     // Connecting to db
//     connectDb();
//   })
//   .then(() => {
//     console.log("✅ App connected to Cassandra (with keyspace)");
//   })
//   .catch((err) => {
//     console.error("❌ Error connecting Cassandra after migration:", err);
//   });

// Fix: Ensure the handler returns a valid Response
//TODO: fix tsx error
app.post(
  "/videos/:videoId/comments",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { videoId } = req.params;
      const { comment, author } = req.body;

      console.log({ comment, author });
      if (!comment) {
        return res.status(400).json({ error: "Comment text is required" });
      }

      // Store comment in database
      const commentData: IComment = {
        id: uuidv4(),
        author,
        videoId,
        comment,
        likes: 0,
        createdAt: new Date().toISOString(),
      };
      await storeComment(commentData);

      // publish in redis
      const message = JSON.stringify(commentData);
      await publisher.publish(CHANNEL, message);
      console.log(
        `[${new Date().toISOString()}] Published message for video ${videoId}: ${message}`
      );

      return res.status(200).json({ status: "Comment published", message });
    } catch (error) {
      console.error("Error publishing comment:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

app.delete(
  "/videos/:videoId/comments",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { videoId } = req.params;
      if (!videoId) {
        return res.status(400).json({ error: "videoId is required" });
      }

      await deleteCommentsByVideoId(videoId);

      const message = `All comments deleted of videoId: ${videoId}`;
      console.log("message: ", message);

      return res.status(200).json({ status: true, message });
    } catch (error) {
      console.error("Error publishing comment:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

app.get("/videos/:videoId/comments", async (req, res) => {
  const { videoId } = req.params;
  const { limit, nextPageKey } = req.query;

  try {
    const [totalCommentsCount, result] = await Promise.all([
      getTotalCommentsCount(videoId),
      getPaginatedCommentsByVideoId({
        videoId: videoId,
        limit: Number(limit) || 10,
        lastEvaluatedKey: nextPageKey
          ? JSON.parse(decodeURIComponent(nextPageKey as string))
          : undefined,
      }),
    ]);

    res.json({
      count: totalCommentsCount,
      comments: result.comments,
      nextPageKey: result.nextPageKey
        ? encodeURIComponent(JSON.stringify(result.nextPageKey))
        : null,
    });
  } catch (err) {
    console.error("Error getting comments:", err);
    res.status(500).json({ message: "Failed to get comments." });
  }
});

app.post("/videos", async (req: Request, res: Response) => {
  const { url, name } = req.body;
  if (!url || !name) {
    res.status(400).json({ error: "url or name are required" });
    return;
  }

  try {
    await storeVideo({
      url,
      name,
    });
    res.status(201).json({ message: "Video created successfully" });
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/videos", async (req: Request, res: Response) => {
  try {
    const videos = await getAllVideos();
    res.status(200).json({
      message: "Videos fetched successfully",
      data: videos,
    });
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/videos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const videos = await deleteVideoById(id);
    res.status(200).json({
      message: "Videos fetched successfully",
      data: videos,
    });
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Comment Publisher Service running on port ${PORT}`);
});
