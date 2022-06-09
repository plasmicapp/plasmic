import { documentToHtmlString } from "@contentful/rich-text-html-renderer";
import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import * as Contentful from "contentful";
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

const modulePath = "@plasmicpkgs/plasmic-contentful";

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
  noLayout,
  setControlContextData,
}: ContentfulFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    creds,
    contentType,
    entryID,
  });
  const client = Contentful.createClient({
    space: creds.space,
    accessToken: creds.accessToken,
  });

  const { data: contentTypes } = usePlasmicQueryData<any | null>(
    `${cacheKey}/contentTypes`,
    async () => {
      const response = await client.getContentTypes();
      return response;
    }
  );

  const { data: entriesData } = usePlasmicQueryData<any | null>(
    `${cacheKey}/entriesData`,
    async () => {
      if (!contentType) {
        return undefined;
      }
      const response = await client.getEntries({
        content_type: `${contentType?.toString()}`,
      });
      return response;
    }
  );

  const { data: entryData } = usePlasmicQueryData<any | null>(
    `${cacheKey}/entry`,
    async () => {
      if (!entryID) {
        return undefined;
      }
      const response = await client.getEntry(`${entryID}`);
      return response;
    }
  );

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

  const parseContentfulData = (data: Record<string, any>) => {
    if (!data?.fields) {
      return undefined;
    }

    const parsedData: any = {};
    const schema: any = {};
    for (const [key, field] of Object.entries<any>(data.fields)) {
      if (typeof field !== "object") {
        parsedData[key] = field;
        schema[key] = typeof field;
      } else if (Array.isArray(field)) {
        parsedData[key] = [];
        schema[key] = [];
        for (const item of field) {
          parsedData[key].push({
            title: item.fields.title,
            description: item.fields.description,
            url: item.fields.file.url,
            contentType: item.fields.file.contentType,
            fileName: item.fields.file.fileName,
            size: item.fields.file.size,
            height: item.fields.file.details.image.height,
            width: item.fields.file.details.image.width,
          });
          schema[key].push("image");
        }
      } else if (field.nodeType === "document") {
        parsedData[key] = documentToHtmlString(field);
        schema[key] = "rich-text";
      } else {
        parsedData[key] = field;
        schema[key] = typeof field;
      }
    }

    return { data: parsedData, schema };
  };

  let renderedData;
  if (contentType && entryID) {
    renderedData = (
      <DataProvider
        name={"contentfulItem"}
        data={parseContentfulData(entryData)}
      >
        {children}
      </DataProvider>
    );
  } else if (contentType) {
    renderedData = entriesData?.items?.map((item: any, index: number) => (
      <DataProvider
        key={item?.sys?.id}
        name={"contentfulItem"}
        data={parseContentfulData(item)}
      >
        {repeatedElement(index, children)}
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
  const item = useSelector("contentfulItem");
  if (!item) {
    return <div>ContentfulField must be used within a ContentfulFetcher </div>;
  }
  console.log("dale", "contentfulItem", item);
  setControlContextData?.({
    data: item.data,
  });
  if (!objectPath) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const data = L.get(item.data, objectPath);
  const type = L.get(item.schema, objectPath);
  if (!data) {
    return <div>Please specify a valid field.</div>;
  } else if (type === "rich-text") {
    return (
      <div className={className} dangerouslySetInnerHTML={{ __html: data }} />
    );
  } else if (type === "image") {
    return <img className={className} src={data.url} />;
  } else if (typeof data !== "object") {
    return <div className={className}>{data}</div>;
  } else {
    return <div className={className}>{data.toString()}</div>;
  }
}
