import dotenv from "dotenv";
import AWS from "aws-sdk";

dotenv.config();

// Configure AWS
AWS.config.update({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const dynamodb = new AWS.DynamoDB();

const params: AWS.DynamoDB.CreateTableInput = {
  TableName: "VideoComments",
  KeySchema: [
    { AttributeName: "videoId", KeyType: "HASH" },
    { AttributeName: "createdAt", KeyType: "RANGE" },
  ],
  AttributeDefinitions: [
    { AttributeName: "videoId", AttributeType: "S" },
    { AttributeName: "createdAt", AttributeType: "S" },
    { AttributeName: "userId", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
  GlobalSecondaryIndexes: [
    {
      IndexName: "UserIndex",
      KeySchema: [
        { AttributeName: "userId", KeyType: "HASH" },
        { AttributeName: "createdAt", KeyType: "RANGE" },
      ],
      Projection: {
        ProjectionType: "ALL",
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ],
};

async function createTable() {
  try {
    const data = await dynamodb.createTable(params).promise();
    console.log(
      "✅ Table created successfully:",
      JSON.stringify(data, null, 2)
    );
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
}

createTable();
