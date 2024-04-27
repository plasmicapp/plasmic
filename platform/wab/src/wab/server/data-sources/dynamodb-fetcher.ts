import {
  SqlalchemyClient,
  SQLITE_TO_BUILDER_TYPE,
} from "@/wab/server/data-sources/pybackend-client/pybackend-client";
import { DynamoDbDataSource } from "@/wab/shared/data-sources-meta/dynamodb-meta";
import { DataSourceSchema } from "@plasmicapp/data-sources";

// From https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBMapper.DataTypes.html
const DYNAMODB_TO_BUILDER_TYPE = {
  N: "number",
  S: "string", // Dates are ISO8601 strings
  B: "string",
  BOOL: "boolean",
} as const;

export function makeDynamoDbFetcher(source: DynamoDbDataSource) {
  return new DynamoDbImpl(source).createFetcher();
}

export class DynamoDbImpl {
  private sqlalchemy: SqlalchemyClient;

  constructor(private source: DynamoDbDataSource) {
    this.sqlalchemy = new SqlalchemyClient(
      undefined,
      {
        dburi: `dynamodb://${source.settings.accessKeyId}:${source.credentials.secretAccessKey}@dynamodb.${source.settings.region}.amazonaws.com:443?verify=false`,
      },
      this.getSchema.bind(this)
    );
  }

  createFetcher() {
    return this.sqlalchemy.createFetcher();
  }

  async getSchema(): Promise<DataSourceSchema> {
    // This returns us for each table the set of indexable fields, which is good as the set of fields to filter by.
    // But this isn't all fields!
    const tableMap: Record<string, { name: string; type: string }[]> =
      await this.sqlalchemy.executeOp({
        op: "inspect",
      });

    // TODO
    // We can't rely on inspect due to the schemaless nature - it only returns "key".
    // The API does have a DescribeTable call, but AttributeDefinitions only contains key attributes.
    // No other choice but to sniff for the non-filter-able fields....
    // We would need to introduce a way to identify which fields are indexable vs not.

    return {
      tables: Object.keys(tableMap).map((tableName) => {
        return {
          id: tableName,
          fields: tableMap[tableName].map((column) => {
            return {
              id: column.name,
              readOnly: false,
              type: SQLITE_TO_BUILDER_TYPE[column.type],
            };
          }),
        };
      }),
    };
  }
}
