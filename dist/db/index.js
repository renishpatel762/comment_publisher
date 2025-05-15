"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ddbDocClient = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const REGION = process.env.AWS_REGION;
const translateConfig = {
    marshallOptions: {
        convertClassInstanceToMap: true,
        removeUndefinedValues: true,
    },
};
const client = new client_dynamodb_1.DynamoDBClient({
    region: REGION,
    credentials: {
        accessKeyId: (_a = process.env.AWS_ACCESS_KEY_ID) !== null && _a !== void 0 ? _a : "",
        secretAccessKey: (_b = process.env.AWS_SECRET_ACCESS_KEY) !== null && _b !== void 0 ? _b : "",
    },
});
exports.ddbDocClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, translateConfig);
