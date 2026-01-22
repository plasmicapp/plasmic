import { DataProvider, repeatedElement, useSelector } from "@plasmicapp/host";
import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { GlobalContextMeta } from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import { queryWordpress } from "@plasmicpkgs/wordpress";
import get from "dlv";
import React, { ReactNode, useContext } from "react";
import { ensure, queryOperators, type QueryOperator } from "./utils";

const modulePath = "@plasmicpkgs/plasmic-wordpress";

interface WordpressProviderProps {
  wordpressUrl?: string;
}

const CredentialsContext = React.createContext<
  WordpressProviderProps | undefined
>(undefined);

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
  queryType?: "posts" | "pages";
  noAutoRepeat?: boolean;
  limit?: number;
  queryOperator?: QueryOperator;
  filterValue?: string;
  setControlContextData?: (data: {
    posts?: { value: string; label: string }[];
    pages?: { value: string; label: string }[];
  }) => void;
}

export const WordpressFetcherMeta: CodeComponentMeta<WordpressFetcherProps> = {
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
      options: () => {
        return queryOperators.map((item: any) => ({
          label: item?.label,
          value: item?.value,
        }));
      },
      hidden: (props) => !props.queryType,
    },

    filterValue: {
      type: "string",
      displayName: "Filter value",
      description: "Value to filter",
      hidden: (props) => !props.queryOperator,
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
}: WordpressFetcherProps) {
  const { wordpressUrl } = ensure(
    useContext(CredentialsContext),
    "WordpressFetcher must be used within a WordpressProvider"
  );
  const cacheKey = JSON.stringify({
    queryOperator,
    filterValue,
    limit,
    queryType,
    wordpressUrl,
  });

  const { data } = usePlasmicQueryData<any | null>(
    queryType && wordpressUrl ? cacheKey : null,
    async () => {
      return queryWordpress({
        wordpressUrl,
        queryType,
        queryOperator,
        filterValue,
        limit,
      });
    }
  );

  const hasFilter = queryOperator && filterValue;

  if (!queryType) {
    return <div>Please specify query type</div>;
  }

  if (queryOperator && !filterValue) {
    return <div>Please specify Filter Value</div>;
  }
  if (!queryOperator && filterValue) {
    return <div>Please specify Query Operator</div>;
  }
  if (hasFilter && data?.length === 0) {
    return <div>No published {queryType} found</div>;
  }

  const currentName = `currentWordpress${
    queryType === "posts" ? "Post" : "Page"
  }`;
  const renderedData = noAutoRepeat
    ? children
    : data?.map((item: any, i: number) => (
        <DataProvider key={item.id} name={currentName} data={item}>
          {repeatedElement(i, children)}
        </DataProvider>
      ));

  const response = data;
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
export const WordpressFieldMeta: CodeComponentMeta<WordpressFieldProps> = {
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
export function WordpressField({ className, field }: WordpressFieldProps) {
  const currentPost = useSelector("currentWordpressPost");
  const currentPage = useSelector("currentWordpressPage");

  const item = currentPost || currentPage;

  if (!item) {
    return <div>WordpressField must be used within a WordpressFetcher </div>;
  }

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
