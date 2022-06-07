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
      defaultValue: "esjp7d70hc5f",
    },
    accessToken: {
      type: "string",
      displayName: "Access Token ",
      description: "Access Token",
      defaultValue: "eNN04tTEhz0iTFvx5_03m43jRrqsplKUzLhLLesqZyc",
    },
    environment: {
      type: "string",
      displayName: "Environment",
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

  let renderedData;
  if (contentType && entryID) {
    renderedData = (
      <DataProvider name={"contentfulItem"} data={entryData}>
        {children}
      </DataProvider>
    );
  } else if (contentType) {
    renderedData = entriesData?.items?.map((item: any, index: number) => (
      <DataProvider key={item?.sys?.id} name={"contentfulItem"} data={item}>
        {repeatedElement(index === 0, children)}
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
  field?: string;
  setControlContextData?: (data: { fields: string[] }) => void;
}

export const ContentfulFieldMeta: ComponentMeta<ContentfulFieldProps> = {
  name: "ContentfulField",
  displayName: "Contentful Field",
  importName: "ContentfulField",
  importPath: modulePath,
  props: {
    field: {
      type: "choice",
      options: (props: any, ctx: any) => {
        return ctx?.fields ?? [];
      },
      displayName: "Field",
      description: "Field to be displayed.",
    },
  },
};

export function ContentfulField({
  className,
  field,
  setControlContextData,
}: ContentfulFieldProps) {
  const item = useSelector("contentfulItem");
  if (!item) {
    return <div>ContentfulField must be used within a ContentfulFetcher </div>;
  }
  // Getting only fields that aren’t objects
  const displayableFields = Object.keys(item?.fields).filter((field) => {
    const value = L.get(item?.fields, field);
    return typeof value !== "object";
  });
  setControlContextData?.({
    fields: displayableFields,
  });
  if (!field) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const data = L.get(item?.fields, field as string);
  if (!data) {
    return <div>Please specify a valid field.</div>;
  } else {
    return <div className={className}> {data} </div>;
  }
}
