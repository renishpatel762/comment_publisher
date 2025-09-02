import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "redis";
import { v4 as uuidv4 } from "uuid";
import { IComment } from "./interfaces";
import { logger } from "./lokiLogger";
import { 
  metricsMiddleware, 
  trackRedisOperation, 
  commentsPublishedTotal,
  activeConnections,
  register 
} from "./metrics";

const app = express();
app.use(express.json());
app.use(cors());

// Apply metrics middleware
app.use(metricsMiddleware);

const REDIS_URL = process.env.REDIS_URL;
const CHANNEL = `live-comments`;

// Create a Redis publisher client
const publisher = createClient({
  url: REDIS_URL,
});
publisher.on("error", (err) => {
  console.error("Redis Publisher Error:", err);
  logger.error("Redis Publisher Error", { error: err.message });
});

publisher.on("connect", () => {
  activeConnections.inc();
  logger.info("Redis publisher connected");
});

publisher.on("end", () => {
  activeConnections.dec();
  logger.info("Redis publisher disconnected");
});

(async () => {
  await publisher.connect();
  console.log("Publisher connected to Redis");
})();

app.post(
  "/videos/:videoId/comments",
  async (req: Request, res: Response): Promise<any> => {
    const startTime = Date.now();
    try {
      const { videoId } = req.params;
      const { comment, author } = req.body;

      logger.info("Comment creation request", { 
        videoId, 
        author, 
        hasComment: !!comment 
      });

      if (!comment) {
        logger.warn("Comment creation failed - missing comment", { videoId, author });
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

      // Publish in Redis with metrics tracking
      const message = JSON.stringify(commentData);
      await trackRedisOperation('publish', async () => {
        await publisher.publish(CHANNEL, message);
      });

      // Track successful comment publication
      commentsPublishedTotal.labels(videoId).inc();

      const processingTime = Date.now() - startTime;
      console.log(
        `[${new Date().toISOString()}] Published message for video ${videoId}: ${message}`
      );
      
      logger.info('Comment published successfully', { 
        videoId, 
        commentId: commentData.id,
        processingTime: `${processingTime}ms`
      });

      return res.status(200).json({ 
        status: "Comment published", 
        commentId: commentData.id,
        message 
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Error publishing comment:", error);
      logger.error('Error publishing comment', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        videoId: req.params.videoId,
        processingTime: `${processingTime}ms`
      });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'comment_publisher',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.send(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  logger.info('Service shutting down');
  await publisher.disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Comment Publisher Service running on port ${PORT}`);
  logger.info(`Comment Publisher Service started`, { port: PORT });
});