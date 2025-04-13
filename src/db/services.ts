import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { IComment } from "../interfaces";
import { ddbDocClient } from ".";

export const storeComment = async (comment: IComment) => {
  const command = new PutCommand({
    TableName: "Comments",
    Item: comment,
  });

  return await ddbDocClient.send(command);
};
