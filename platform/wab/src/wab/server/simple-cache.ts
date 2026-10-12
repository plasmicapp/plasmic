import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

export interface SimpleCache {
  get(key: string): Promise<string | undefined>;

  put(key: string, value: string): Promise<void>;
}

export class DynamoDbCache implements SimpleCache {
  constructor(private client: DynamoDBClient) {}

  async get(key: string): Promise<string | undefined> {
    const command = new GetItemCommand({
      TableName: "llm-cache",
      Key: { key: { S: key } },
    });
    const response = await this.client.send(command);
    if (response.Item?.["my-value"]?.S) {
      return response.Item["my-value"].S;
    } else {
      return undefined;
    }
  }

  async put(key: string, value: string): Promise<void> {
    const command = new PutItemCommand({
      TableName: "llm-cache",
      Item: { key: { S: key }, "my-value": { S: value } },
    });
    await this.client.send(command);
  }
}
