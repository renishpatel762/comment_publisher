"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const redis_1 = require("redis");
// import connectDb from "./cassandraDb";
// import { runMigration } from "./cassandraDb/init";
// import { insertComment } from "./commentRepo";
const uuid_1 = require("uuid");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const comment_services_1 = require("./services/comment.services");
const video_services_1 = require("./services/video.services");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const REDIS_URL = process.env.REDIS_URL;
const CHANNEL = `live-comments`;
// Create a Redis publisher client
const publisher = (0, redis_1.createClient)({
    url: REDIS_URL,
});
publisher.on("error", (err) => console.error("Redis Publisher Error:", err));
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield publisher.connect();
    console.log("Publisher connected to Redis");
}))();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();
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
app.post("/videos/:videoId/comments", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoId } = req.params;
        const { comment, author } = req.body;
        console.log({ comment, author });
        if (!comment) {
            return res.status(400).json({ error: "Comment text is required" });
        }
        // Store comment in database
        const commentData = {
            id: (0, uuid_1.v4)(),
            author,
            videoId,
            comment,
            likes: 0,
            createdAt: new Date().toISOString(),
        };
        yield (0, comment_services_1.storeComment)(commentData);
        // publish in redis
        const message = JSON.stringify(commentData);
        yield publisher.publish(CHANNEL, message);
        console.log(`[${new Date().toISOString()}] Published message for video ${videoId}: ${message}`);
        return res.status(200).json({ status: "Comment published", message });
    }
    catch (error) {
        console.error("Error publishing comment:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.delete("/videos/:videoId/comments", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoId } = req.params;
        if (!videoId) {
            return res.status(400).json({ error: "videoId is required" });
        }
        yield (0, comment_services_1.deleteCommentsByVideoId)(videoId);
        const message = `All comments deleted of videoId: ${videoId}`;
        console.log("message: ", message);
        return res.status(200).json({ status: true, message });
    }
    catch (error) {
        console.error("Error publishing comment:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.get("/videos/:videoId/comments", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { videoId } = req.params;
    const { limit, nextPageKey } = req.query;
    try {
        const [totalCommentsCount, result] = yield Promise.all([
            (0, comment_services_1.getTotalCommentsCount)(videoId),
            (0, comment_services_1.getPaginatedCommentsByVideoId)({
                videoId: videoId,
                limit: Number(limit) || 10,
                lastEvaluatedKey: nextPageKey
                    ? JSON.parse(decodeURIComponent(nextPageKey))
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
    }
    catch (err) {
        console.error("Error getting comments:", err);
        res.status(500).json({ message: "Failed to get comments." });
    }
}));
app.post("/videos", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { url, name } = req.body;
    if (!url || !name) {
        res.status(400).json({ error: "url or name are required" });
        return;
    }
    try {
        yield (0, video_services_1.storeVideo)({
            url,
            name,
        });
        res.status(201).json({ message: "Video created successfully" });
    }
    catch (error) {
        console.error("Error creating video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.get("/videos", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videos = yield (0, video_services_1.getAllVideos)();
        res.status(200).json({
            message: "Videos fetched successfully",
            data: videos,
        });
    }
    catch (error) {
        console.error("Error creating video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.delete("/videos/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id || typeof id !== "string") {
            res.status(400).json({ error: "id is required" });
            return;
        }
        const videos = yield (0, video_services_1.deleteVideoById)(id);
        res.status(200).json({
            message: "Videos fetched successfully",
            data: videos,
        });
    }
    catch (error) {
        console.error("Error creating video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Comment Publisher Service running on port ${PORT}`);
});
