import {
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { usePlasmicQueryData } from "@plasmicapp/query";
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

const modulePath = "@plasmicpkgs/plasmic-wordpress-graphql";

interface WordpressProviderProps {
  graphqlEndpoint: string;
}

const CredentialsContext = React.createContext<
  WordpressProviderProps | undefined
>(undefined);

export const WordpressProviderMeta: GlobalContextMeta<WordpressProviderProps> =
  {
    name: "WordpressGraphQLProvider",
    displayName: "Wordpress GraphQL Provider",
    description: "The GraphQL API Endpoint of your Wordpress",
    importName: "WordpressProvider",
    importPath: modulePath,
    props: {
      graphqlEndpoint: {
        type: "string",
        displayName: "GraphQL API Endpoint",
        description: "GraphQL API Endpoint of your Wordpress",
        defaultValue: "https://demo.wpgraphql.com/graphql",
      },
    },
  };

export function WordpressProvider({
  graphqlEndpoint,
  children,
}: React.PropsWithChildren<WordpressProviderProps>) {
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
  noAutoRepeat?: boolean;
  query?: string;
  setControlContextData?: (data: { endpoint?: string }) => void;
}

export const WordpressFetcherMeta: CodeComponentMeta<WordpressFetcherProps> = {
  name: "WordpressGraphQLFetcher",
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
          name: "WordpressGraphQLField",
        },
      },
    },
    query: {
      type: "code",
      lang: "graphql",
      endpoint: (props, ctx) => ctx?.endpoint ?? "",
    },
    noAutoRepeat: {
      type: "boolean",
      displayName: "No auto-repeat",
      description: "Do not automatically repeat children for every entry.",
      defaultValue: false,
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

function compact(arr: any[]) {
  return arr.filter((x) => !!x);
}

export function WordpressFetcher({
  query,
  children,
  className,
  noLayout,
  noAutoRepeat,
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
    const res = await fetch(creds.graphqlEndpoint, {
      method: "POST",
      body: JSON.stringify(query),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await res.json();
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

  if (!data?.data || compact(Object.values(data?.data)).length === 0) {
    return <div>Data not found</div>;
  }

  const renderedData = noAutoRepeat
    ? children
    : Object.values(data?.data).flatMap((model: any, i: number) =>
        (Array.isArray(model) ? model : [model]).map((item: any, j: number) => (
          <DataProvider
            key={JSON.stringify(item)}
            name={"currentWordpressItem"}
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
export const WordpressFieldMeta: CodeComponentMeta<WordpressFieldProps> = {
  name: "WordpressGraphQLField",
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
  const item = useSelector("currentWordpressItem");

  if (!item) {
    return <div>WordpressField must be used within a WordpressFetcher </div>;
  }

  setControlContextData?.({
    data: item,
  });

  if (!path) {
    return <div>Please specify a valid path or select a field.</div>;
  }
  const data = get(item, path as string);
  if (typeof data === "object" && data.mediaType === "image") {
    return (
      <img className={className} src={data.mediaItemUrl} srcSet={data.srcSet} />
    );
  } else if (
    path.slice(-1)[0] === "content" ||
    path.slice(-1)[0] === "excerpt"
  ) {
    return (
      <div className={className} dangerouslySetInnerHTML={{ __html: data }} />
    );
  } else if (!data || typeof data === "object") {
    return <div className={className}>Please specify a valid field.</div>;
  } else {
    return <div className={className}> {data} </div>;
  }
}
