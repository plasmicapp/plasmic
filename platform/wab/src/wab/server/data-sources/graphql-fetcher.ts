import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";
import { GraphqlDataSource } from "@/wab/shared/data-sources-meta/graphql-meta";
import { isEmpty, isString } from "lodash";
import fetch, { Response } from "node-fetch";

export function makeGraphqlFetcher(source: GraphqlDataSource) {
  return new GraphqlFetcher(source);
}

// From https://stackoverflow.com/a/46543255/43118
const introspectionQuery = `
query IntrospectionQuery {
  __schema {
    queryType {
      name
    }
    mutationType {
      name
    }
    subscriptionType {
      name
    }
    types {
      ...FullType
    }
    directives {
      name
      description
      locations
      args {
        ...InputValue
      }
    }
  }
}

fragment FullType on __Type {
  kind
  name
  description
  fields(includeDeprecated: true) {
    name
    description
    args {
      ...InputValue
    }
    type {
      ...TypeRef
    }
    isDeprecated
    deprecationReason
  }
  inputFields {
    ...InputValue
  }
  interfaces {
    ...TypeRef
  }
  enumValues(includeDeprecated: true) {
    name
    description
    isDeprecated
    deprecationReason
  }
  possibleTypes {
    ...TypeRef
  }
}

fragment InputValue on __InputValue {
  name
  description
  type {
    ...TypeRef
  }
  defaultValue
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
}
`;

export class GraphqlFetcher {
  private readonly baseUrl: string;
  constructor(private source: GraphqlDataSource) {
    this.baseUrl = source.settings.baseUrl;
  }
  async query(opts: {
    query: string;
    variables?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    const res = await fetch(this.makePath(), {
      method: "POST",
      headers: this.makeHeaders(opts.headers),
      body: JSON.stringify({
        query: opts.query,
        variables: opts.variables,
      }),
    });
    return processResult(res);
  }

  /** Just an alias for query, needed since we need `write` operations */
  async mutation(opts: {
    query: string;
    variables?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    return this.query(opts);
  }

  private makePath(params?: Record<string, string>) {
    const url = new URL(this.baseUrl);
    const searchParams = new URLSearchParams(params);
    Array.from(searchParams.entries()).forEach(([k, v]) => {
      url.searchParams.append(k, v);
    });
    return url.toString();
  }

  private makeHeaders(headers?: Record<string, string>) {
    return {
      ...this.source.settings.commonHeaders,
      ...headers,
    };
  }

  async getSchema() {
    return this.query({
      query: introspectionQuery,
    });
  }
}

async function processResult(res: Response) {
  let processedResponse: string | any = await res.text();
  const statusCode = res.status;
  try {
    processedResponse = JSON.parse(processedResponse);
  } catch {}
  if (statusCode >= 400) {
    throw new DataSourceError(
      isString(processedResponse) || !isEmpty(processedResponse)
        ? processedResponse
        : undefined,
      statusCode
    );
  }
  return {
    data: {
      response: processedResponse,
      statusCode,
      headers: Object.fromEntries(res.headers.entries()),
    },
  };
}
