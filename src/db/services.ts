import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GetCommentsParams, IComment } from "../interfaces";
import { ddbDocClient } from ".";

export const storeComment = async (comment: IComment) => {
  const command = new PutCommand({
    TableName: "VideoComments",
    Item: comment,
  });

  return await ddbDocClient.send(command);
};

export const getPaginatedCommentsByVideoId = async ({
  videoId,
  limit = 10,
  lastEvaluatedKey,
}: GetCommentsParams) => {
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
    const data = await ddbDocClient.send(new QueryCommand(params));
    return {
      comments: data.Items,
      nextPageKey: data.LastEvaluatedKey,
    };
  } catch (error) {
    console.error("❌ Error fetching paginated comments:", error);
    throw new Error("Failed to fetch comments.");
  }
}
