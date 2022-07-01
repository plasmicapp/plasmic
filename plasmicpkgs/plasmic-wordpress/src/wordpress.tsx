import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";

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

const modulePath = "@plasmicpkgs/plasmic-wordpress";

interface WordpressCredentialsProviderProps {
  graphqlEndpoint: string;
}

const CredentialsContext = React.createContext<
  WordpressCredentialsProviderProps | undefined
>(undefined);

export const WordpressCredentialsProviderMeta: GlobalContextMeta<WordpressCredentialsProviderProps> = {
  name: "WordpressCredentialsProvider",
  displayName: "Wordpress Credentials Provider",
  description: "The GraphQL API Endpoint of your Wordpress",
  importName: "WordpressCredentialsProvider",
  importPath: modulePath,
  props: {
    graphqlEndpoint: {
      type: "string",
      displayName: "GraphQL API Endpoint",
      description: "GraphQL API Endpoint of your Wordpress ",
    },
  },
};

export function WordpressCredentialsProvider({
  graphqlEndpoint,
  children,
}: React.PropsWithChildren<WordpressCredentialsProviderProps>) {
  return (
    <CredentialsContext.Provider value={{ graphqlEndpoint }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface WordpressFetcherProps {
  children?: ReactNode;
  className?: string;
  noLayout?: boolean;
  query?: string;
  setControlContextData?: (data: { endpoint?: string }) => void;
}

export const WordpressFetcherMeta: ComponentMeta<WordpressFetcherProps> = {
  name: "WordpressFetcher",
  displayName: "Wordpress Fetcher",
  importName: "WordpressFetcher",
  importPath: modulePath,
  providesData: true,
  description:
    "Fetches Wordpress data and repeats content of children once for every row fetched. ",
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
          name: "WordpressField",
        },
      },
    },
    query: {
      type: "code",
      lang: "graphql",
      endpoint: (props, ctx) => ctx?.endpoint ?? "",
    },
    noLayout: {
      type: "boolean",
      displayName: "No layout",
      description:
        "When set, Wordpress Fetcher will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
      defaultValue: false,
    },
  },
};

export function WordpressFetcher({
  query,
  children,
  className,
  noLayout,
  setControlContextData,
}: WordpressFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    query,
    creds,
  });
  const { data } = usePlasmicQueryData<any | null>(cacheKey, async () => {
    if (!query) {
      return null;
    }
    const data = await fetch(creds.graphqlEndpoint, {
      method: "POST",
      body: JSON.stringify(query),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await data.json();
  });

  setControlContextData?.({
    endpoint: creds.graphqlEndpoint,
  });

  if (!query) {
    return <div>Please make a query in order to fetch data</div>;
  }

  if (!creds.graphqlEndpoint) {
    return (
      <div>
        Please specify a valid API Credentials: GraphQL Endpoint of your
        Wordpress project
      </div>
    );
  }

  if (!data?.data || L.compact(Object.values(data?.data)).length === 0) {
    return <div>Data not found</div>;
  }

  const renderedData = Object.values(data?.data).flatMap(
    (model: any, i: number) =>
      (L.isArray(model) ? model : [model]).map((item: any, j: number) => (
        <DataProvider
          key={JSON.stringify(item)}
          name={"wordpressItem"}
          data={item}
        >
          {repeatedElement(i === 0 && j === 0, children)}
        </DataProvider>
      ))
  );
  return noLayout ? (
    <> {renderedData} </>
  ) : (
    <div className={className}> {renderedData} </div>
  );
}

interface WordpressFieldProps {
  className?: string;
  path?: string;
  setControlContextData?: (data: { data: any }) => void;
}
export const WordpressFieldMeta: ComponentMeta<WordpressFieldProps> = {
  name: "WordpressField",
  displayName: "Wordpress Field",
  importName: "WordpressField",
  importPath: modulePath,
  props: {
    path: {
      type: "dataSelector",
      data: (props: any, ctx: any) => ctx?.data ?? {},
      displayName: "Field",
      description: "Field to be displayed.",
    },
  },
};
export function WordpressField({
  className,
  path,
  setControlContextData,
}: WordpressFieldProps) {
  const item = useSelector("wordpressItem");

  if (!item) {
    return <div>WordpressField must be used within a WordpressFetcher </div>;
  }

  setControlContextData?.({
    data: item,
  });

  if (!path) {
    return <div>Please specify a valid path or select a field.</div>;
  }
  const data = L.get(item, path as string);
  console.log(data);

  if (typeof data === "object" && data.mediaType === "image") {
    return (
      <div>
        <img src={data.mediaItemUrl} srcSet={data.srcSet} />
        <h1>Image Tag</h1>{" "}
      </div>
    );
  }

  if (path === "content" || path === "excerpt") {
    return <div dangerouslySetInnerHTML={{ __html: data }} />;
  }

  if (!data || typeof data === "object") {
    return <div className={className}>Please specify a valid field.</div>;
  } else {
    return <div className={className}> {data} </div>;
  }
}
