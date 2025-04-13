import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TranslateConfig } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION;
const translateConfig: TranslateConfig = {
  marshallOptions: {
    convertClassInstanceToMap: true,
  },
};

const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});
export const ddbDocClient = DynamoDBDocumentClient.from(client, translateConfig);
