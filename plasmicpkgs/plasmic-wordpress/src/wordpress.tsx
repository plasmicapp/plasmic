import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
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

const modulePath = "@plasmicpkgs/plasmic-wordpress";

interface WordpressProviderProps {
  wordpressUrl?: string;
}

const CredentialsContext =
  React.createContext<WordpressProviderProps | undefined>(undefined);

export const WordpressProviderMeta: GlobalContextMeta<WordpressProviderProps> =
  {
    name: "WordpressProvider",
    displayName: "Wordpress Provider",
    description: "The endpoint of your Wordpress",
    importName: "WordpressProvider",
    importPath: modulePath,
    props: {
      wordpressUrl: {
        type: "string",
        displayName: "Wordpress URL",
        description: "URL of your Wordpress ",
        defaultValue: "https://techcrunch.com/",
      },
    },
  };

export function WordpressProvider({
  wordpressUrl,
  children,
}: React.PropsWithChildren<WordpressProviderProps>) {
  return (
    <CredentialsContext.Provider value={{ wordpressUrl }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface WordpressFetcherProps {
  children?: ReactNode;
  className?: string;
  noLayout?: boolean;
  queryType?: string;
  noAutoRepeat?: boolean;
  limit?: number;
  queryOperator?: string;
  filterValue?: string;
  setControlContextData?: (data: {
    posts?: { value: string; label: string }[];
    pages?: { value: string; label: string }[];
  }) => void;
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
    gridTemplateColumns: "1fr",
    gridRowGap: "8px",
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
    queryType: {
      type: "choice",
      options: ["posts", "pages"],
    },
    queryOperator: {
      type: "choice",
      displayName: "Query Operator",
      description: "Filter Parameter filter by",
      options: (props, ctx) => {
        return queryOperators.map((item: any) => ({
          label: item?.label,
          value: item?.value,
        }));
      },
      hidden: (props, ctx) => !props.queryType,
    },

    filterValue: {
      type: "string",
      displayName: "Filter value",
      description: "Value to filter",
      hidden: (props, ctx) => !props.queryOperator,
    },
    limit: {
      type: "number",
      displayName: "Limit",
      description: "Limit",
    },
    noAutoRepeat: {
      type: "boolean",
      displayName: "No auto-repeat",
      description:
        "Do not automatically repeat children for every posts or pages.",
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

export function WordpressFetcher({
  queryOperator,
  filterValue,
  noAutoRepeat,
  limit,
  queryType,
  children,
  className,
  noLayout,
  setControlContextData,
}: WordpressFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    queryOperator,
    filterValue,
    limit,
    queryType,
    creds,
  });

  const { data: posts } = usePlasmicQueryData<any | null>(
    queryType === "posts" ? `${cacheKey}/posts` : null,
    async () => {
      const url = `${creds.wordpressUrl}/wp-json/wp/v2/posts`;
      let query;
      if (limit) {
        query = `${url}?per_page=${limit}`;
      } else {
        query = url;
      }

      const resp = await fetch(query);
      return await resp.json();
    }
  );

  const { data: pages } = usePlasmicQueryData<any | null>(
    queryType === "pages" ? `${cacheKey}/pages` : null,
    async () => {
      const url = `${creds.wordpressUrl}/wp-json/wp/v2/pages`;
      let query;
      if (limit) {
        query = `${url}?per_page=${limit}`;
      } else {
        query = url;
      }

      const resp = await fetch(query);
      return await resp.json();
    }
  );
  
  setControlContextData?.({
    posts: posts?.map((post: any) => ({ value: post.id, label: post.slug })),
    pages: pages?.map((page: any) => ({ value: page.id, label: page.slug })),
  });

  const { data: filteredPages } = usePlasmicQueryData<any | null>(
    queryType === "pages" && queryOperator && filterValue
      ? `${cacheKey}/pages/filtered`
      : null,
    async () => {
      const url = `${creds.wordpressUrl}/wp-json/wp/v2/pages?${queryOperator}=${filterValue}`;
      let query;
      if (limit) {
        query = `${url}&per_page=${limit}`;
      } else {
        query = url;
      }

      const resp = await fetch(query);
      return await resp.json();
    }
  );
  const { data: filteredPosts } = usePlasmicQueryData<any | null>(
    queryType === "posts" && queryOperator && filterValue
      ? `${cacheKey}/posts/filtered`
      : null,
    async () => {
      const url = `${creds.wordpressUrl}/wp-json/wp/v2/posts?${queryOperator}=${filterValue}`;
      let query;
      if (limit) {
        query = `${url}&per_page=${limit}`;
      } else {
        query = url;
      }

      const resp = await fetch(query);
      return await resp.json();
    }
  );

  if (!queryType) {
    return <div>Please specify query type</div>;
  }

  if (queryOperator && !filterValue) {
    return <div>Please specify Filter Value</div>;
  }
  if (!queryOperator && filterValue) {
    return <div>Please specify Query Operator</div>;
  }

  let renderedData;

  if (queryType === "posts" && posts && !filteredPosts) {
    renderedData = noAutoRepeat
      ? children
      : posts?.map((post: any, i: number) => (
          <DataProvider
            key={post.id}
            name={"wordpressItem"}
            data={post}
            hidden={true}
          >
            <DataProvider name={"currentWordpressPost"} data={post}>
              {repeatedElement(i, children)}
            </DataProvider>
          </DataProvider>
        ));
  } else if (queryType === "pages" && pages && !filteredPages) {
    renderedData = noAutoRepeat
      ? children
      : pages?.map((page: any, i: number) => (
          <DataProvider
            key={page.id}
            name={"wordpressItem"}
            data={page}
            hidden={true}
          >
            <DataProvider name={"currentWordpressPage"} data={page}>
              {repeatedElement(i, children)}
            </DataProvider>
          </DataProvider>
        ));
  } else if (queryType === "pages" && filteredPages) {
    if (!filteredPages && queryOperator === "pages") {
      return <div>Please make sure queryType is pages</div>;
    }
    if (filteredPages.length === 0) {
      return <div>No published pages found</div>;
    }
    renderedData = noAutoRepeat
      ? children
      : filteredPages?.map((page: any, i: number) => (
          <DataProvider
            key={page.id}
            name={"wordpressItem"}
            data={page}
            hidden={true}
          >
            <DataProvider name={"currentWordpressPage"} data={page}>
              {repeatedElement(i, children)}
            </DataProvider>
          </DataProvider>
        ));
  } else if (queryType === "posts" && filteredPosts) {
    if (!filteredPosts && queryOperator === "posts") {
      return <div>Please make sure queryType is posts</div>;
    }

    if (filteredPosts.length === 0) {
      return <div>No published posts found</div>;
    }

    renderedData = filteredPosts?.map((page: any, i: number) => (
      <DataProvider
        key={page.id}
        name={"wordpressItem"}
        data={page}
        hidden={true}
      >
        <DataProvider name={"currentWordpressPost"} data={page}>
          {repeatedElement(i, children)}
        </DataProvider>
      </DataProvider>
    ));
  } else {
    return <div>Please choose the Query Type in order to render the data</div>;
  }

  const response = [pages, posts];
  return (
    <DataProvider data={response} name="wordpressItems">
      {noLayout ? (
        <> {renderedData} </>
      ) : (
        <div className={className}> {renderedData} </div>
      )}
    </DataProvider>
  );
}

interface WordpressFieldProps {
  className?: string;
  field?: string;
  setControlContextData?: (data: { data: any }) => void;
}
export const WordpressFieldMeta: ComponentMeta<WordpressFieldProps> = {
  name: "WordpressField",
  displayName: "Wordpress Field",
  importName: "WordpressField",
  importPath: modulePath,
  props: {
    field: {
      type: "choice",
      options: [
        "title",
        "slug",
        "content",
        "excerpt",
        "date",
        "modified",
        "link",
        "status",
      ],
      displayName: "Field",
      description: "Field to be displayed.",
    },
  },
};
export function WordpressField({
  className,
  field,
  setControlContextData,
}: WordpressFieldProps) {
  const item = useSelector("wordpressItem");

  if (!item) {
    return <div>WordpressField must be used within a WordpressFetcher </div>;
  }

  setControlContextData?.({
    data: item,
  });

  if (!field) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const data = get(item, field as string);

  if (typeof data === "object" && "rendered" in data) {
    return (
      <div
        className={className}
        style={{ whiteSpace: "normal" }}
        dangerouslySetInnerHTML={{ __html: data.rendered }}
      />
    );
  } else if (!data || typeof data === "object") {
    return <div className={className}>Please specify a valid field.</div>;
  } else {
    return <div className={className}> {data} </div>;
  }
}
