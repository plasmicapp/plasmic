import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  usePlasmicCanvasContext,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import get from "lodash/get";
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

interface WordpressProviderProps {
  wordpressUrl?: string;
}

const CredentialsContext = React.createContext<
  WordpressProviderProps | undefined
>(undefined);

export const WordpressProviderMeta: GlobalContextMeta<WordpressProviderProps> = {
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
  postId?: string;
  pageId?: string;
  queryType?: string;
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
    postId: {
      type: "choice",
      options: (props, ctx) => ctx?.posts ?? [],
      displayName: "Post Id",
      description: "Post Id to be queried.",
      defaultValueHint: "all",
      hidden: (props, ctx) => props?.queryType !== "posts",
    },
    pageId: {
      type: "choice",
      options: (props, ctx) => ctx?.posts ?? [],
      displayName: "Page Id",
      description: "Id of the Page to be queried",
      defaultValueHint: "all",
      hidden: (props, ctx) => props?.queryType !== "pages",
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
  postId,
  pageId,
  queryType,
  children,
  className,
  noLayout,
  setControlContextData,
}: WordpressFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    queryType,
    creds,
  });

  const inEditor = !!usePlasmicCanvasContext();

  const { data: posts } = usePlasmicQueryData<any | null>(
    queryType === "posts" && (inEditor || !postId) ? `${cacheKey}/posts` : null,
    async () =>
      await (await fetch(`${creds.wordpressUrl}/wp-json/wp/v2/posts`)).json()
  );

  const { data: pages } = usePlasmicQueryData<any | null>(
    queryType === "pages" && (inEditor || !pageId) ? `${cacheKey}/pages` : null,
    async () =>
      await (await fetch(`${creds.wordpressUrl}/wp-json/wp/v2/pages`)).json()
  );

  const { data: post } = usePlasmicQueryData<any | null>(
    queryType === "posts" && postId ? `${cacheKey}/posts/${postId}` : null,
    async () =>
      await (
        await fetch(`${creds.wordpressUrl}/wp-json/wp/v2/posts/${postId}`)
      ).json()
  );

  const { data: page } = usePlasmicQueryData<any | null>(
    queryType === "pages" && pageId ? `${cacheKey}/pages/${pageId}` : null,
    async () =>
      await (
        await fetch(`${creds.wordpressUrl}/wp-json/wp/v2/pages/${pageId}`)
      ).json()
  );

  setControlContextData?.({
    posts: posts?.map((post: any) => ({ value: post.id, label: post.slug })),
    pages: pages?.map((page: any) => ({ value: page.id, label: page.slug })),
  });

  let renderedData;
  if (queryType === "posts" && post) {
    renderedData = (
      <DataProvider name={"wordpressItem"} data={post} hidden={true}>
        <DataProvider name={"currentWordpressPost"} data={post}>
          {children}
        </DataProvider>
      </DataProvider>
    );
  } else if (queryType === "pages" && page) {
    renderedData = (
      <DataProvider name={"wordpressItem"} data={page} hidden={true}>
        <DataProvider name={"currentWordpressPage"} data={page}>
          {children}
        </DataProvider>
      </DataProvider>
    );
  } else if (queryType === "posts" && posts) {
    renderedData = posts?.map((post: any, i: number) => (
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
  } else if (queryType === "pages" && pages) {
    renderedData = pages?.map((page: any, i: number) => (
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
  } else {
    return <div>Please choose the Query Type in order to render the data</div>;
  }

  return noLayout ? (
    <> {renderedData} </>
  ) : (
    <div className={className}> {renderedData} </div>
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
