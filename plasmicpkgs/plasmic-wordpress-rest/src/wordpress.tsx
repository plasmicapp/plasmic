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
import axios from "axios";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-wordpress-rest";

interface WordpressCredentialsProviderProps {
  wordpressUrl?: string
}

const CredentialsContext = React.createContext<
  WordpressCredentialsProviderProps | undefined
>(undefined);

export const WordpressCredentialsProviderMeta: GlobalContextMeta<WordpressCredentialsProviderProps> = {
  name: "WordpressCredentialsProvider",
  displayName: "Wordpress Credentials Provider",
  description:
    "The GraphQL API Endpoint of your Wordpress",
  importName: "WordpressCredentialsProvider",
  importPath: modulePath,
  props: {
    wordpressUrl: {
      type: "string",
      displayName: "Wordpress URL",
      description: "URL of your Wordpress ",
      defaultValue: "https://techcrunch.com/"
    },
  },
};

export function WordpressCredentialsProvider({
  wordpressUrl,
  children,
}: React.PropsWithChildren<WordpressCredentialsProviderProps>) {
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
  postId?: string
  pageId?: string
  queryType?: string
  setControlContextData?: (data: {
    postIds?: { id: string }[];
    pageIds?: { id: string }[];
  }) => void;
}

export const WordpressFetcherMeta: ComponentMeta<WordpressFetcherProps> = {
  name: "WordpressFetcher",
  displayName: "Wordpress Fetcher",
  importName: "WordpressFetcher",
  importPath: modulePath,
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
    queryType: {
      type: 'choice',
      options: ['posts', 'pages']
    },
    postId: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.postIds?.map((id: any) => ({
          label: id,
          value: id
        })) ?? [],
      displayName: "Post Id",
      description: "Post Id to be queried.",
      defaultValueHint: "all",
      hidden: (props, ctx) => props?.queryType !== 'posts'
    },
    pageId: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.pageIds?.map((id: any) => ({
          label: id,
          value: id
        })) ?? [],
      displayName: "Page Id",
      description: "Id of the Page to be queried",
      defaultValueHint: "all",
      hidden: (props, ctx) => props?.queryType !== 'pages'
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
    postId,
    pageId,
    creds,

  });

  const { data: posts } = usePlasmicQueryData<any | null>(`${cacheKey} + posts`, async () => {
    const res = await axios.get(`${creds.wordpressUrl}/wp-json/wp/v2/posts`)
    return res
  })

  const { data: pages } = usePlasmicQueryData<any | null>(`${cacheKey} + pages`, async () => {
    const res = await axios.get(`${creds.wordpressUrl}/wp-json/wp/v2/pages`)
    return res
  })

  const { data: post } = usePlasmicQueryData<any | null>(`${cacheKey} + post`, async () => {
    if (!postId) {
      return undefined
    }
    const res = await axios.get(`${creds.wordpressUrl}/wp-json/wp/v2/posts/${postId}`)
    return res
  })

  const { data: page } = usePlasmicQueryData<any | null>(`${cacheKey} + page`, async () => {
    if (!pageId) {
      return undefined
    }
    const res = await axios.get(`${creds.wordpressUrl}/wp-json/wp/v2/pages/${pageId}`)
    return res
  })

  const slugs = Object.values(pages?.data ?? []).flatMap(
    (model: any, i: number) =>
      (L.isArray(model) ? model : [model]).map((item: any, j: number) => {
        return (L.isArray(item) ? item : [item]).map((fields: any) => fields.id)
      })
  );

  const postIds = Object.values(posts?.data ?? []).flatMap(
    (model: any, i: number) =>
      (L.isArray(model) ? model : [model]).map((item: any, j: number) => {
        return (L.isArray(item) ? item : [item]).map((fields: any) => fields.id)
      })
  );

  setControlContextData?.({
    postIds: postIds.map((id: any) => id),
    pageIds: slugs.map((id: any) => id),
  });

  let renderedData
  if (queryType === 'posts' && post) {
    renderedData = (L.isArray(post?.data) ? post?.data : [post?.data]).map((item: any, i: number) => (
      <DataProvider
        key={JSON.stringify(item)}
        name={"wordpressItem"}
        data={item}
      >
        {repeatedElement(i, children)}
      </DataProvider>
    ))
  }
  else if (queryType === 'pages' && page) {
    renderedData = (L.isArray(page?.data) ? page?.data : [page?.data]).map((item: any, i: number) => (
      <DataProvider
        key={JSON.stringify(item)}
        name={"wordpressItem"}
        data={item}
      >
        {repeatedElement(i, children)}
      </DataProvider>
    ))
  }
  else if (queryType === 'posts' && posts) {
    renderedData = posts?.data?.map((item: any, j: number) => (
      <DataProvider
        key={JSON.stringify(item)}
        name={"wordpressItem"}
        data={item}
      >
        {repeatedElement(j, children)}
      </DataProvider>
    ))
  } else if (queryType === 'pages' && pages) {
    renderedData = pages?.data?.map((item: any, j: number) => (
      <DataProvider
        key={JSON.stringify(item)}
        name={"wordpressItem"}
        data={item}
      >
        {repeatedElement(j, children)}
      </DataProvider>
    ))
  } else {
    return <div>Please choose the Query Type in order to render the data</div>
  }
  return noLayout ? (
    <> {renderedData}  </>
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
    return (
      <div>WordpressField must be used within a WordpressFetcher </div>
    );
  }

  setControlContextData?.({
    data: item,
  });

  if (!path) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const data = L.get(item, path as string);

  if ((typeof data === "object" && "rendered" in data) || path.slice(-1)[0] === "rendered") {
    return <div className={className} style={{ whiteSpace: "normal" }} dangerouslySetInnerHTML={{ __html: typeof data === "object" ? data.rendered : data }} />
  }
  if (!data || typeof data === 'object') {
    return <div className={className}>Please specify a valid field.</div>;
  }
  else {
    return <div className={className}> {data} </div>;
  }
}