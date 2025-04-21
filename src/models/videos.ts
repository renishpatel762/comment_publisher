import dotenv from "dotenv";
import AWS from "aws-sdk";

dotenv.config();

AWS.config.update({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const dynamodb = new AWS.DynamoDB();

const params: AWS.DynamoDB.CreateTableInput = {
  TableName: "Videos",
  KeySchema: [
    { AttributeName: "id", KeyType: "HASH" },
  ],
  AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

async function createVideosTable() {
  try {
    const data = await dynamodb.createTable(params).promise();
    console.log(
      "✅ Videos table created successfully:",
      JSON.stringify(data, null, 2)
    );
  } catch (err) {
    console.error("❌ Error creating Videos table:", err);
  }
}

createVideosTable();
