import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import { createClient } from "redis";
// import connectDb from "./db";
// import { runMigration } from "./db/init";
// import { insertComment } from "./commentRepo";
import cors from "cors";

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

      //write in db
      // await insertComment(comment,author);
      
      //prepare string message
      const message = JSON.stringify({
        videoId,
        cmtText: comment,
        time: new Date().toISOString(),
      });
      
      // publish in redis
      await publisher.publish(CHANNEL, message);

      return res.status(200).json({ status: "Comment published", message });
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
