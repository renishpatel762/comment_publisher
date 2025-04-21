import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "redis";
// import connectDb from "./cassandraDb";
// import { runMigration } from "./cassandraDb/init";
// import { insertComment } from "./commentRepo";
import { v4 as uuidv4 } from "uuid";
import {
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

      console.log({comment,author});
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
app.listen(PORT, () => {
  console.log(`Comment Publisher Service running on port ${PORT}`);
});
