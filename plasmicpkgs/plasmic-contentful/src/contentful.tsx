import { documentToHtmlString } from "@contentful/rich-text-html-renderer";
import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import { pascalCase } from "change-case";
import * as Contentful from "contentful";
import get from "dlv";

import React, { ReactNode, useContext } from "react";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-contentful";

const makeDataProviderName = (contentType: string) =>
  `currentContentful${pascalCase(contentType)}Item`;

interface ContentfulCredentialsProviderProps {
  space: string;
  accessToken: string;
  environment?: string;
}

const CredentialsContext = React.createContext<
  ContentfulCredentialsProviderProps | undefined
>(undefined);

export const ContentfulCredentialsProviderMeta: GlobalContextMeta<ContentfulCredentialsProviderProps> = {
  name: "Contentful CredentialsProvider",
  displayName: "Contentful Credentials Provider",
  description:
    "Any client requesting content from the CDA needs to provide an access token that has access to the environment you're requesting content from. Learn how to [get your API key](https://www.contentful.com/developers/docs/references/authentication/).",
  importName: "ContentfulCredentialsProvider",
  importPath: modulePath,
  props: {
    space: {
      type: "string",
      displayName: "Space",
      description: "Name of your space",
      defaultValue: "lmfbwqzbh93n",
    },
    accessToken: {
      type: "string",
      displayName: "Access Token ",
      description: "Access Token",
      defaultValue: "aWvf6oSLTuqxKCxSUpokajdQr84hGQFE6zoJG7DVVLg",
    },
    environment: {
      type: "string",
      displayName: "Environment",
      defaultValue: "master",
    },
  },
};

export function ContentfulCredentialsProvider({
  accessToken,
  space,
  environment,
  children,
}: React.PropsWithChildren<ContentfulCredentialsProviderProps>) {
  return (
    <CredentialsContext.Provider value={{ space, accessToken, environment }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface ContentfulFetcherProps {
  entryID?: string;
  contentType?: string;
  children?: ReactNode;
  className?: string;
  limit?: number;
  order?: string;
  noLayout?: boolean;
  setControlContextData?: (data: {
    types?: { name: string; id: string }[];
    entries?: { id: string }[];
  }) => void;
}

export const ContentfulFetcherMeta: ComponentMeta<ContentfulFetcherProps> = {
  name: "ContentfulFetcher",
  displayName: "Contentful Fetcher",
  importName: "ContentfulFetcher",
  importPath: modulePath,
  providesData: true,
  description:
    "Fetches Contentful data and repeats content of children once for every row fetched. ",
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
          name: "ContentfulField",
        },
      },
    },
    contentType: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.types?.map((type: any) => ({
          label: type?.name,
          value: type?.sys?.id,
        })) ?? [],
      displayName: "Content type",
      description: "Content type to be queried.",
    },
    entryID: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.entries?.map((entry: any) => ({
          label: entry?.sys?.id,
          value: entry?.sys?.id,
        })) ?? [],
      displayName: "Entry ID",
      description: "Query in Content Type.",
      defaultValueHint: "all",
    },
    limit: {
      type: "number",
      displayName: "Limit",
      description: "Limit the number of entries that are returned.",
      defaultValue: 1000,
    },
    order: {
      type: "string",
      displayName: "Order",
      description: "Order entries with a specific attribute.",
    },
    noLayout: {
      type: "boolean",
      displayName: "No layout",
      description:
        "When set, Contentful Fetcher will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
      defaultValue: false,
    },
  },
};

export function ContentfulFetcher({
  entryID,
  contentType,
  children,
  className,
  limit,
  noLayout,
  order,
  setControlContextData,
}: ContentfulFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    creds,
  });
  const client = Contentful.createClient({
    space: creds.space,
    accessToken: creds.accessToken,
  });

  const { data: contentTypes, error: contentTypesError } = usePlasmicQueryData<
    any | null
  >(`${cacheKey}/contentTypes`, async () => {
    const response = await client.getContentTypes();
    return response;
  });

  const { data: entriesData, error: entriesDataError } = usePlasmicQueryData<
    any | null
  >(
    contentType
      ? `${cacheKey}/${contentType}/entriesData/${limit}/${order}`
      : null,
    async () => {
      const response = await client.getEntries({
        content_type: `${contentType?.toString()}`,
        limit,
        order,
      });
      return response;
    }
  );

  const { data: entryData, error: entryDataError } = usePlasmicQueryData<
    any | null
  >(entryID ? `${cacheKey}/entry/${entryID}` : null, async () => {
    const response = await client.getEntry(`${entryID}`);
    return response;
  });

  setControlContextData?.({
    types: contentTypes?.items,
    entries: entriesData?.items,
  });

  if (!creds.space || !creds.accessToken) {
    return (
      <div>
        Please specify a valid API Credentials: Space, Access Token and
        Environment
      </div>
    );
  }

  if (contentTypesError || entriesDataError || entryDataError) {
    if (contentTypesError) {
      return (
        <div className={className}>Error: {contentTypesError.message}</div>
      );
    } else if (entriesDataError) {
      return <div className={className}>Error: {entriesDataError.message}</div>;
    } else {
      return (
        <div className={className}>Error: {entriesDataError!.message}</div>
      );
    }
  }

  let renderedData;
  if (contentType && entryID) {
    renderedData = (
      <DataProvider name={"contentfulItem"} data={entryData} hidden={true}>
        <DataProvider name={makeDataProviderName(contentType)} data={entryData}>
          {children}
        </DataProvider>
      </DataProvider>
    );
  } else if (contentType) {
    if (entriesData?.items?.length === 0) {
      return <div className={className}>{contentType} is empty</div>;
    }
    renderedData = entriesData?.items?.map((item: any, index: number) => (
      <DataProvider
        key={item?.sys?.id}
        name={"contentfulItem"}
        data={item}
        hidden={true}
      >
        <DataProvider name={makeDataProviderName(contentType)} data={item}>
          {repeatedElement(index, children)}
        </DataProvider>
      </DataProvider>
    ));
  } else {
    return <div> Please choose the Content Type</div>;
  }

  return noLayout ? (
    <> {renderedData} </>
  ) : (
    <div className={className}> {renderedData} </div>
  );
}

interface ContentfulFieldProps {
  className?: string;
  objectPath?: (string | number)[];
  setControlContextData?: (data: { data: object }) => void;
}

export const ContentfulFieldMeta: ComponentMeta<ContentfulFieldProps> = {
  name: "ContentfulField",
  displayName: "Contentful Field",
  importName: "ContentfulField",
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

export function ContentfulField({
  className,
  objectPath,
  setControlContextData,
}: ContentfulFieldProps) {
  const item = useSelector("contentfulItem")?.fields;
  if (!item) {
    return <div>ContentfulField must be used within a ContentfulFetcher </div>;
  }
  setControlContextData?.({
    data: item,
  });
  if (!objectPath) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const data = get(item, objectPath);
  if (
    typeof data === "object" &&
    "nodeType" in data &&
    data.nodeType === "document"
  ) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: documentToHtmlString(data) }}
      />
    );
  } else if (
    typeof data === "object" &&
    "contentType" in data &&
    data.contentType.includes("image")
  ) {
    return <img className={className} src={data.url} />;
  } else if (!data) {
    return <div>Please specify a valid field.</div>;
  } else if (typeof data !== "object") {
    return <div className={className}>{data}</div>;
  } else {
    return <div className={className}>{data.toString()}</div>;
  }
}
