import { DataProvider, repeatedElement, useSelector } from "@plasmicapp/host";
import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { type GlobalContextMeta } from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import { pascalCase } from "change-case";

import get from "dlv";
import React, { ReactNode, useContext } from "react";
import { queryOperators } from "./utils";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-content-stack";

const makeDataProviderName = (contentType: string) =>
  `currentContentstack${pascalCase(contentType)}Item`;

interface ContentStackCredentialsProviderProps {
  apiKey: string;
  accessToken: string;
  environment: string;
}

const CredentialsContext = React.createContext<
  ContentStackCredentialsProviderProps | undefined
>(undefined);

export const ContentStackCredentialsProviderMeta: GlobalContextMeta<ContentStackCredentialsProviderProps> =
  {
    name: "ContentStackCredentialsProvider",
    displayName: "ContentStack Credentials Provider",
    description:
      "The API key is a unique key assigned to each stack. Learn how to [get your API key](https://www.contentstack.com/docs/developers/apis/content-management-api/#how-to-get-stack-api-key).",
    importName: "ContentStackCredentialsProvider",
    importPath: modulePath,
    props: {
      apiKey: {
        type: "string",
        displayName: "API Key",
        description: "API Key of your Stack ",
        defaultValue: "blt02f7b45378b008ee",
      },
      accessToken: {
        type: "string",
        displayName: "Access Token ",
        description: "Access Token",
        defaultValue: "cs5b69faf35efdebd91d08bcf4",
      },
      environment: {
        type: "string",
        displayName: "Environment",
        defaultValue: "production",
      },
    },
  };

export function ContentStackCredentialsProvider({
  apiKey,
  accessToken,
  environment,
  children,
}: React.PropsWithChildren<ContentStackCredentialsProviderProps>) {
  return (
    <CredentialsContext.Provider value={{ apiKey, accessToken, environment }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface ContentStackFetcherProps {
  contentType: string;
  children?: ReactNode;
  className?: string;
  noLayout?: boolean;
  filterField?: string;
  queryOperator?: string;
  filterValue?: string | number;
  limit?: number;
  noAutoRepeat?: boolean;
  setControlContextData?: (data: {
    types?: { title: string; uid: string }[];
    filterFields?: string[];
    queryOptions?: [];
  }) => void;
}

export const ContentStackFetcherMeta: CodeComponentMeta<ContentStackFetcherProps> =
  {
    name: "ContentStackFetcher",
    displayName: "ContentStack Fetcher",
    importName: "ContentStackFetcher",
    importPath: modulePath,
    providesData: true,
    description:
      "Fetches ContentStack data and repeats content of children once for every row fetched. ",
    defaultStyles: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gridRowGap: "8px",
      gridColumnGap: "8px",
      padding: "8px",
      maxWidth: "100%",
    },
    props: {
      children: {
        type: "slot",
        defaultValue: {
          type: "vbox",
          styles: {
            padding: "8px",
          },
          children: {
            type: "component",
            name: "ContentStackField",
          },
        },
      },
      contentType: {
        type: "choice",
        options: (props, ctx) =>
          ctx?.types?.map((type: any) => ({
            label: type?.title,
            value: type?.uid,
          })) ?? [],
        displayName: "Content type",
        description: "Content type to be queried.",
      },
      filterField: {
        type: "choice",
        displayName: "Filter field",
        description: "Field (from Collection) to filter by",
        options: (props, ctx) => ctx?.filterFields ?? [],
        hidden: (props) => !props.contentType,
      },
      queryOperator: {
        type: "choice",
        displayName: "Query Operator",
        description: "Query Operator filter by",
        options: (props, ctx) => ctx?.queryOptions ?? [],
        hidden: (props) => !props.filterField,
      },
      filterValue: {
        type: "string",
        displayName: "Filter value",
        description: "Value to filter by, should be of filter field type",
      },
      limit: {
        type: "number",
        displayName: "Limit",
        description: "Limit",
      },
      noAutoRepeat: {
        type: "boolean",
        displayName: "No auto-repeat",
        description: "Do not automatically repeat children for every entries.",
        defaultValue: false,
      },
      noLayout: {
        type: "boolean",
        displayName: "No layout",
        description:
          "When set, ContentStack Fetcher will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
        defaultValue: false,
      },
    },
  };

export function ContentStackFetcher({
  contentType,
  filterField,
  filterValue,
  queryOperator,
  limit,
  noAutoRepeat,
  children,
  className,
  noLayout,
  setControlContextData,
}: ContentStackFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    limit,
    contentType,
    filterField,
    filterValue,
    queryOperator,
    creds,
  });

  const allContentTypes = usePlasmicQueryData<any | null>(
    `${cacheKey}/contentTypes`,
    async () => {
      const resp = await fetch(
        "https://cdn.contentstack.io/v3/content_types?include_count=true&include_global_field_schema=true",
        {
          headers: {
            api_key: creds.apiKey,
            access_token: creds.accessToken,
          },
        }
      );
      return resp.json();
    }
  );
  const contentTypes = allContentTypes.data ?? [];

  const { data: entriesData } = usePlasmicQueryData<any | null>(
    contentType ? `${cacheKey}/${contentType}/entries` : null,
    async () => {
      const url = `https://cdn.contentstack.io/v3/content_types/${contentType}/entries?environment=${creds.environment}`;
      let query;

      if (limit) {
        query = `${url}&limit=${limit}`;
      } else {
        query = url;
      }
      const resp = await fetch(query, {
        headers: {
          api_key: creds.apiKey,
          access_token: creds.accessToken,
        },
      });
      return await resp.json();
    }
  );

  const { data: filteredData } = usePlasmicQueryData<any | null>(
    contentType && filterField && filterValue && entriesData
      ? `${cacheKey}/${contentType}/filtered`
      : null,
    async () => {
      if (
        !contentType &&
        !filterField &&
        !filterValue &&
        !entriesData &&
        !contentTypes
      ) {
        return null;
      }
      const matched = Object.values(entriesData)
        .flatMap((model: any) => (Array.isArray(model) ? model : [model]))
        .map((item: any) => {
          const fields = Object.entries(item).find(
            (el) => el[0] === filterField
          );
          return fields;
        });

      let url;
      if (!queryOperator) {
        Object.values(matched)
          .map((model: any) => (Array.isArray(model) ? model : [model]))
          .map((item: any) => {
            if (typeof item[1] === "number" && typeof item[1] !== "object") {
              url = `https://cdn.contentstack.io/v3/content_types/${contentType}/entries?environment=${creds.environment}&query={"${filterField}" : ${filterValue}}`;
            } else if (
              typeof item[1] !== "number" &&
              typeof item[1] !== "object" &&
              typeof item[1] === "string"
            ) {
              url = `https://cdn.contentstack.io/v3/content_types/${contentType}/entries?environment=${
                creds.environment
              }&query=${JSON.stringify({
                [filterField as string]: filterValue,
              })}`;
            } else {
              url = "";
            }
          });
      } else if (queryOperator === "$ne" || queryOperator === "$regex") {
        Object.values(matched)
          .map((model: any) => (Array.isArray(model) ? model : [model]))
          .map((item: any) => {
            if (typeof item[1] === "number" && typeof item[1] !== "object") {
              url = `https://cdn.contentstack.io/v3/content_types/${contentType}/entries?environment=${creds.environment}&query={"${filterField}":{"${queryOperator}":${filterValue}}}`;
            } else if (
              typeof item[1] !== "number" &&
              typeof item[1] !== "object" &&
              typeof item[1] === "string"
            ) {
              url = `https://cdn.contentstack.io/v3/content_types/${contentType}/entries?environment=${
                creds.environment
              }&query=${JSON.stringify({
                [filterField as string]: { [queryOperator]: filterValue },
              })}`;
            } else {
              url = "";
            }
          });
      } else {
        url = `https://cdn.contentstack.io/v3/content_types/${contentType}/entries?environment=${creds.environment}&query={"${filterField}":{"${queryOperator}" :${filterValue}}}`;
      }

      const resp = await fetch(url as string, {
        headers: {
          api_key: creds.apiKey,
          access_token: creds.accessToken,
        },
      });
      return await resp.json();
    }
  );

  if (!contentTypes) {
    return <div>Please configure the ContentStack credentials</div>;
  }

  const types = Object.values(contentTypes).flatMap((model: any) => {
    return model;
  });

  setControlContextData?.({
    types: types,
  });

  if (!creds.apiKey || !creds.accessToken || !creds.environment) {
    return (
      <div>
        Please specify a valid API Credentials: API Key, Access Token and
        Environment
      </div>
    );
  }

  if (!entriesData) {
    return <div>Please specify content type </div>;
  }

  const fieldsForFilter = Object.values(entriesData)
    .flatMap((model: any) => (Array.isArray(model) ? model : [model]))
    .map((item: any) => {
      const fields = Object.keys(item).filter((field) => {
        const value = get(item, field);
        return (
          (typeof value !== "object" &&
            field !== "images" &&
            typeof value === "number") ||
          (typeof value === "string" &&
            !value.match(
              /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?Z?/gm
            ) &&
            !value.match(/^blt.*/))
        );
      });
      return fields;
    });

  let operators;

  const matchedFields = Object.values(entriesData)
    .flatMap((model: any) => (Array.isArray(model) ? model : [model]))
    .map((item: any) => {
      const fields = Object.entries(item).find((el) => el[0] === filterField);
      return fields;
    });

  Object.values(matchedFields)
    .map((model: any) => (Array.isArray(model) ? model : [model]))
    .map((item: any) => {
      if (typeof item[1] === "number" && typeof item[1] !== "object") {
        operators = queryOperators;
      } else if (
        typeof item[1] !== "number" &&
        typeof item[1] !== "object" &&
        typeof item[1] === "string"
      ) {
        operators = [
          {
            value: "",
            label: "Is",
          },
          {
            value: "$ne",
            label: "Is not",
          },
          {
            value: "$regex",
            label: "Matches regex",
          },
        ];
      }
    });

  setControlContextData?.({
    queryOptions: operators,
    types: types,
    filterFields: fieldsForFilter[0],
  });

  if (queryOperator && !filterValue && !filterField) {
    return <div>Please specify a Filter Field and a Filter Value</div>;
  }
  if (!queryOperator && filterValue && !filterField) {
    return <div>Please specify a Query Operator and a Filter Field</div>;
  }
  if (!queryOperator && !filterValue && filterField) {
    return <div>Please specify a Query Operator and a Filter Value</div>;
  }

  if (queryOperator && filterValue && !filterField) {
    return <div>Please specify a Filter Field</div>;
  }

  if (queryOperator && !filterValue && filterField) {
    return <div>Please specify a Filter Value</div>;
  }

  const entries = Object.values(entriesData).flatMap((item: any) =>
    Array.isArray(item) ? item : [item]
  );

  let renderedData;

  if (filteredData) {
    const filtered = Object.values(filteredData).flatMap(
      (model: any) => model
    ).length;

    if (filtered === 0) {
      return <div>No published entry found </div>;
    }

    const filteredEntries = Object.values(filteredData).flatMap((model: any) =>
      Array.isArray(model) ? model : [model]
    );

    renderedData = filteredEntries?.map((item: any, index: number) => (
      <DataProvider
        key={item._id}
        name={"contentstackItem"}
        data={item}
        hidden={true}
      >
        <DataProvider name={makeDataProviderName(contentType)} data={item}>
          {repeatedElement(index, children)}
        </DataProvider>
      </DataProvider>
    ));
  } else {
    const filteredEntries = Object.values(entriesData).flatMap((model: any) =>
      Array.isArray(model) ? model : [model]
    );
    renderedData = filteredEntries?.map((item: any, index: number) => (
      <DataProvider
        key={item._id}
        name={"contentstackItem"}
        data={item}
        hidden={true}
      >
        <DataProvider name={makeDataProviderName(contentType)} data={item}>
          {repeatedElement(index, children)}
        </DataProvider>
      </DataProvider>
    ));
  }

  return (
    <DataProvider data={entries} name="contentStackItems">
      {noAutoRepeat ? (
        children
      ) : (
        <DataProvider
          name={"contentstackSchema"}
          data={types?.find((type: any) => type.uid === contentType)?.schema}
          hidden={true}
        >
          {noLayout ? (
            <> {renderedData} </>
          ) : (
            <div className={className}> {renderedData} </div>
          )}
        </DataProvider>
      )}
    </DataProvider>
  );
}

interface ContentStackFieldProps {
  className?: string;
  objectPath?: (string | number)[];
  setControlContextData?: (data: { data: Record<string, any> }) => void;
}
export const ContentStackFieldMeta: CodeComponentMeta<ContentStackFieldProps> =
  {
    name: "ContentStackField",
    displayName: "ContentStack Field",
    importName: "ContentStackField",
    importPath: modulePath,
    props: {
      objectPath: {
        type: "dataSelector",
        data: (props, ctx) => ctx?.data ?? {},
        displayName: "Field",
        description: "Field to be displayed.",
      },
    },
  };
export function ContentStackField({
  objectPath,
  setControlContextData,
  ...rest
}: ContentStackFieldProps) {
  const item = useSelector("contentstackItem");
  if (!item) {
    return (
      <div>ContentStackField must be used within a ContentStackFetcher </div>
    );
  }
  const schema = useSelector("contentstackSchema");

  setControlContextData?.({
    data: item,
  });

  if (!objectPath) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const isRichText = () =>
    schema?.find((field: any) => field.uid === get(objectPath, [0]))
      ?.field_metadata?.allow_rich_text;

  const data = get(item, objectPath);
  if (typeof data === "object" && data?.content_type?.startsWith("image")) {
    return <img {...rest} src={data.url} />;
  } else if (!data || typeof data === "object") {
    return <div {...rest}> Please specify a valid field.</div>;
  } else if (isRichText()) {
    return <div {...rest} dangerouslySetInnerHTML={{ __html: data }} />;
  } else {
    return <div {...rest}> {data} </div>;
  }
}
