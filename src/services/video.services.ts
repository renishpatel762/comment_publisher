import { DeleteCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { IVideo } from "../interfaces";
import { ddbDocClient } from "../db";

export const storeVideo = async (video: IVideo) => {
  const command = new PutCommand({
    TableName: "Videos",
    Item: {
      ...video,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    },
  });

  return await ddbDocClient.send(command);
};

export const getAllVideos = async () => {
  const params = {
    TableName: "Videos",
  };

  try {
    const data = await ddbDocClient.send(new ScanCommand(params));
    return data.Items || [];
  } catch (error) {
    console.error("❌ Error fetching videos:", error);
    throw new Error("Failed to fetch videos.");
  }
};

export const deleteVideoById = async (id: string) => {
  const params = {
    TableName: "Videos",
    Key: { id },
  };

  try {
    await ddbDocClient.send(new DeleteCommand(params));
    console.log(`✅ Deleted video with id: ${id}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Error deleting video:", error);
    throw new Error("Failed to delete video.");
  }
};
