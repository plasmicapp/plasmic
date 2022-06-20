import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import * as ContentStack from "contentstack";
import L from "lodash";
import React, { ReactNode, useContext } from "react";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-content-stack";

interface ContentStackCredentialsProviderProps {
  apiKey: string;
  accessToken: string;
  environment: string;
}

const CredentialsContext = React.createContext<
  ContentStackCredentialsProviderProps | undefined
>(undefined);

export const ContentStackCredentialsProviderMeta: GlobalContextMeta<ContentStackCredentialsProviderProps> = {
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
  entryUID?: string;
  contentType?: string;
  children?: ReactNode;
  className?: string;
  noLayout?: boolean;
  setControlContextData?: (data: {
    types?: { title: string; uid: string }[];
    entries?: { title: string; uid: string }[];
  }) => void;
}

export const ContentStackFetcherMeta: ComponentMeta<ContentStackFetcherProps> = {
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
        ctx?.types?.map((type) => ({
          label: type.title,
          value: type.uid,
        })) ?? [],
      displayName: "Content type",
      description: "Content type to be queried.",
    },
    entryUID: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.entries?.map((entry) => ({
          label: entry.title,
          value: entry.uid,
        })) ?? [],
      displayName: "Entry UID",
      description: "Query in Content Type.",
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
  entryUID,
  contentType,
  children,
  className,
  noLayout,
  setControlContextData,
}: ContentStackFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    creds,
    contentType,
    entryUID,
  });
  const Stack = ContentStack.Stack({
    api_key: creds.apiKey,
    delivery_token: creds.accessToken,
    environment: creds.environment,
  });

  const { data: entryData } = usePlasmicQueryData<any | null>(
    cacheKey,
    async () => {
      if (!contentType || !entryUID) {
        return undefined;
      }
      const Query = Stack.ContentType(`${contentType}`).Entry(`${entryUID}`);
      const result = await Query.fetch();
      const response = await result.toJSON();
      return response;
    }
  );

  const { data: contentTypes } = usePlasmicQueryData<any | null>(
    `${cacheKey}/contentTypes`,
    async () => {
      return (
        await Stack.getContentTypes({ include_global_field_schema: true })
      ).content_types;
    }
  );

  const { data: entriesData } = usePlasmicQueryData<any | null>(
    `${cacheKey}/entries`,
    async () => {
      if (!contentType) {
        return undefined;
      }
      return await Stack.ContentType(`${contentType}`).Query().toJSON().find();
    }
  );

  setControlContextData?.({
    types: contentTypes,
    entries: entriesData?.[0],
  });

  if (!creds.apiKey || !creds.accessToken || !creds.environment) {
    return (
      <div>
        Please specify a valid API Credentials: API Key, Access Token and
        Environment
      </div>
    );
  }

  let renderedData;
  if (contentType && entryUID) {
    renderedData = (
      <DataProvider name={"contentStackItem"} data={entryData}>
        {children}
      </DataProvider>
    );
  } else if (contentType && !entryUID) {
    const entries = entriesData?.flat();
    renderedData = entries?.map((item: any, index: number) => (
      <DataProvider key={item._id} name={"contentStackItem"} data={item}>
        {repeatedElement(index, children)}
      </DataProvider>
    ));
  } else {
    return <div>Please select a content type.</div>;
  }

  return (
    <DataProvider
      name={"contentStackSchema"}
      data={contentTypes?.find((type: any) => type.uid === contentType)?.schema}
    >
      {noLayout ? (
        <> {renderedData} </>
      ) : (
        <div className={className}> {renderedData} </div>
      )}
    </DataProvider>
  );
}

interface ContentStackFieldProps {
  className?: string;
  objectPath?: (string | number)[];
  setControlContextData?: (data: { data: Record<string, any> }) => void;
}
export const ContentStackFieldMeta: ComponentMeta<ContentStackFieldProps> = {
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
  const item = useSelector("contentStackItem");
  if (!item) {
    return (
      <div>ContentStackField must be used within a ContentStackFetcher </div>
    );
  }
  const schema = useSelector("contentStackSchema");

  setControlContextData?.({
    data: item,
  });

  if (!objectPath) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const isRichText = () =>
    schema?.find((field: any) => field.uid === L.get(objectPath, 0))
      ?.field_metadata?.allow_rich_text;

  const data = L.get(item, objectPath);
  if (typeof data === "object" && data?.content_type?.startsWith("image")) {
    return <img {...rest} src={data.url} />;
  } else if (!data || typeof data === "object") {
    return <div {...rest}>Please specify a valid field.</div>;
  } else if (isRichText()) {
    return <div {...rest} dangerouslySetInnerHTML={{ __html: data }} />;
  } else {
    return <div {...rest}> {data} </div>;
  }
}
