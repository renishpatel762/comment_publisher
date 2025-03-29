import express, { Request, Response } from "express";
import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT || "6379";
const CHANNEL = `live-comments`;

// Create a Redis publisher client
const publisher = createClient({
  socket: {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT),
  },
});
publisher.on("error", (err) => console.error("Redis Publisher Error:", err));

(async () => {
  await publisher.connect();
  console.log("Publisher connected to Redis");
})();

// Fix: Ensure the handler returns a valid Response
//TODO: fix tsx error
app.post(
  "/videos/:videoId/comments",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { videoId } = req.params;
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({ error: "Comment text is required" });
      }

      const message = JSON.stringify({
        videoId,
        cmtText: comment,
        time: new Date().toISOString(),
      });

      await publisher.publish(CHANNEL, message);

      return res.status(200).json({ status: "Comment published" });
    } catch (error) {
      console.error("Error publishing comment:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Comment Publisher Service running on port ${PORT}`);
});
