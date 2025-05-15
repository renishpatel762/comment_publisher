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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommentsByVideoId = exports.getTotalCommentsCount = exports.getPaginatedCommentsByVideoId = exports.storeComment = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const db_1 = require("../db");
const storeComment = (comment) => __awaiter(void 0, void 0, void 0, function* () {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: "VideoComments",
        Item: comment,
    });
    return yield db_1.ddbDocClient.send(command);
});
exports.storeComment = storeComment;
const getPaginatedCommentsByVideoId = (_a) => __awaiter(void 0, [_a], void 0, function* ({ videoId, limit = 10, lastEvaluatedKey, }) {
    const params = {
        TableName: "VideoComments",
        KeyConditionExpression: "videoId = :videoId",
        ExpressionAttributeValues: {
            ":videoId": videoId,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: false, // Most recent comments first
    };
    try {
        const data = yield db_1.ddbDocClient.send(new lib_dynamodb_1.QueryCommand(params));
        return {
            comments: data.Items,
            nextPageKey: data.LastEvaluatedKey,
        };
    }
    catch (error) {
        console.error("❌ Error fetching paginated comments:", error);
        throw new Error("Failed to fetch comments.");
    }
});
exports.getPaginatedCommentsByVideoId = getPaginatedCommentsByVideoId;
// TODO: Make it more efficient.
const getTotalCommentsCount = (videoId) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        TableName: "VideoComments",
        KeyConditionExpression: "videoId = :videoId",
        ExpressionAttributeValues: {
            ":videoId": videoId,
        },
        Select: "COUNT",
    };
    try {
        const data = yield db_1.ddbDocClient.send(new lib_dynamodb_1.QueryCommand(params));
        return data.Count || 0;
    }
    catch (error) {
        console.error("❌ Error fetching total comment count:", error);
        return 0; // Fail-safe fallback
    }
});
exports.getTotalCommentsCount = getTotalCommentsCount;
const deleteCommentsByVideoId = (videoId) => __awaiter(void 0, void 0, void 0, function* () {
    // Step 1: Query all comments for the given videoId
    const queryCommand = new lib_dynamodb_1.QueryCommand({
        TableName: "VideoComments",
        KeyConditionExpression: "videoId = :videoId",
        ExpressionAttributeValues: {
            ":videoId": videoId,
        },
        ProjectionExpression: "videoId, createdAt", // Fetch only keys needed for deletion
    });
    const { Items } = yield db_1.ddbDocClient.send(queryCommand);
    if (!Items || Items.length === 0) {
        console.log(`No comments found for videoId ${videoId}.`);
        return;
    }
    // Step 2: Delete each comment
    const deletePromises = Items.map((item) => {
        const deleteCommand = new lib_dynamodb_1.DeleteCommand({
            TableName: "VideoComments",
            Key: {
                videoId: item.videoId,
                createdAt: item.createdAt,
            },
        });
        return db_1.ddbDocClient.send(deleteCommand);
    });
    yield Promise.all(deletePromises);
    console.log(`Deleted ${Items.length} comments for videoId ${videoId}.`);
});
exports.deleteCommentsByVideoId = deleteCommentsByVideoId;
