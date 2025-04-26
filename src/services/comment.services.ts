import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { GetCommentsParams, IComment } from "../interfaces";
import { ddbDocClient } from "../db";

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
};

// TODO: Make it more efficient.
export const getTotalCommentsCount = async (
  videoId: string
): Promise<number> => {
  const params: QueryCommandInput = {
    TableName: "VideoComments",
    KeyConditionExpression: "videoId = :videoId",
    ExpressionAttributeValues: {
      ":videoId": videoId,
    },
    Select: "COUNT",
  };

  try {
    const data = await ddbDocClient.send(new QueryCommand(params));
    return data.Count || 0;
  } catch (error) {
    console.error("❌ Error fetching total comment count:", error);
    return 0; // Fail-safe fallback
  }
};

export const deleteCommentsByVideoId = async (videoId: string) => {
  // Step 1: Query all comments for the given videoId
  const queryCommand = new QueryCommand({
    TableName: "VideoComments",
    KeyConditionExpression: "videoId = :videoId",
    ExpressionAttributeValues: {
      ":videoId": videoId,
    },
    ProjectionExpression: "videoId, createdAt", // Fetch only keys needed for deletion
  });

  const { Items } = await ddbDocClient.send(queryCommand);

  if (!Items || Items.length === 0) {
    console.log(`No comments found for videoId ${videoId}.`);
    return;
  }

  // Step 2: Delete each comment
  const deletePromises = Items.map((item) => {
    const deleteCommand = new DeleteCommand({
      TableName: "VideoComments",
      Key: {
        videoId: item.videoId,
        createdAt: item.createdAt,
      },
    });
    return ddbDocClient.send(deleteCommand);
  });

  await Promise.all(deletePromises);

  console.log(`Deleted ${Items.length} comments for videoId ${videoId}.`);
};
