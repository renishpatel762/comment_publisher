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
exports.deleteVideoById = exports.getAllVideos = exports.storeVideo = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const storeVideo = (video) => __awaiter(void 0, void 0, void 0, function* () {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: "Videos",
        Item: Object.assign(Object.assign({}, video), { id: (0, uuid_1.v4)(), createdAt: new Date().toISOString() }),
    });
    return yield db_1.ddbDocClient.send(command);
});
exports.storeVideo = storeVideo;
const getAllVideos = () => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        TableName: "Videos",
    };
    try {
        const data = yield db_1.ddbDocClient.send(new lib_dynamodb_1.ScanCommand(params));
        return data.Items || [];
    }
    catch (error) {
        console.error("❌ Error fetching videos:", error);
        throw new Error("Failed to fetch videos.");
    }
});
exports.getAllVideos = getAllVideos;
const deleteVideoById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        TableName: "Videos",
        Key: { id },
    };
    try {
        yield db_1.ddbDocClient.send(new lib_dynamodb_1.DeleteCommand(params));
        console.log(`✅ Deleted video with id: ${id}`);
        return { success: true };
    }
    catch (error) {
        console.error("❌ Error deleting video:", error);
        throw new Error("Failed to delete video.");
    }
});
exports.deleteVideoById = deleteVideoById;
