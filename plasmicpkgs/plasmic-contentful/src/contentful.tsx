import { documentToHtmlString } from "@contentful/rich-text-html-renderer";
import { DataProvider, repeatedElement, useSelector } from "@plasmicapp/host";
import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { GlobalContextMeta } from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import {
  _denormalizeData as denormalizeData,
  _ensure as ensure,
  _uniq as uniq,
} from "@plasmicpkgs/contentful";
import { pascalCase } from "change-case";
import get from "dlv";
import React, { ReactNode, useContext } from "react";
import { searchParameters } from "./utils";

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

export const ContentfulCredentialsProviderMeta: GlobalContextMeta<ContentfulCredentialsProviderProps> =
  {
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

interface ContentfulControlContextData {
  types?: { name: string; id: string }[];
  fields?: string[];
  queryOptions?: [];
}

interface ContentfulFetcherProps {
  contentType: string;
  children?: ReactNode;
  className?: string;
  limit?: number;
  include?: number;
  order?: string;
  reverseOrder?: boolean;
  filterField?: string;
  searchParameter?: string;
  filterValue?: string | number;
  noAutoRepeat?: boolean;
  noLayout?: boolean;
  setControlContextData?: (data: ContentfulControlContextData) => void;
}

export const ContentfulFetcherMeta: CodeComponentMeta<ContentfulFetcherProps> =
  {
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
        options: (_props, ctx) =>
          ctx?.types?.map((type: any) => ({
            label: type?.name,
            value: type?.sys?.id,
          })) ?? [],
        displayName: "Content type",
        description: "Content type to be queried.",
      },

      filterField: {
        type: "choice",
        displayName: "Filter field",
        description: "Field (from Collection) to filter by.",
        options: (_props, ctx) => ctx?.fields ?? [],
        hidden: (props) => !props.contentType,
      },
      searchParameter: {
        type: "choice",
        displayName: "Search Parameter",
        description:
          "Search Parameter to filter by (see Contentful Content Delivery API documentation for details).",
        options: (_props, ctx) => ctx?.queryOptions ?? [],
        hidden: (props) => !props.filterField,
      },
      filterValue: {
        type: "string",
        displayName: "Filter value",
        description: "Value to filter by, should be of filter field type.",
        hidden: (props) => !props.searchParameter,
      },
      order: {
        type: "choice",
        displayName: "Order",
        description: "Field that the entries should be ordered by.",
        options: (_props, ctx) => [
          ...(ctx?.fields ?? []),
          "sys.createdAt",
          "sys.updatedAt",
        ],
        hidden: (props) => !props.contentType,
      },
      reverseOrder: {
        type: "boolean",
        displayName: "Reverse order",
        description: "Reverse the order of the entries.",
        defaultValue: false,
        hidden: (props) => !props.order,
      },
      limit: {
        type: "number",
        displayName: "Limit",
        description: "Limit the number of entries that are returned.",
      },
      include: {
        type: "number",
        displayName: "Linked items depth",
        defaultValueHint: 1,
        description:
          "When you have related content (e.g. entries with links to image assets) it's possible to include both search results and related data in a single request. Using the include parameter, you can specify the number of levels to resolve.",
        max: 10,
        min: 0,
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
          "When set, Contentful Fetcher will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
        defaultValue: false,
      },
    },
  };

export function ContentfulFetcher({
  filterField,
  filterValue,
  searchParameter,
  noAutoRepeat,
  contentType,
  children,
  className,
  order,
  reverseOrder,
  limit,
  include,
  noLayout,
  setControlContextData,
}: ContentfulFetcherProps) {
  const creds = ensure(
    useContext(CredentialsContext),
    "Could not find context with current credentials"
  );
  const cacheKey = JSON.stringify({
    include,
    order,
    reverseOrder,
    limit,
    filterField,
    filterValue,
    searchParameter,
    creds,
  });

  const baseUrl =
    (typeof process !== "undefined" &&
      process.env?.NEXT_PUBLIC_CONTENTFUL_BASE_URL) ||
    "https://cdn.contentful.com";

  const { data: contentTypes } = usePlasmicQueryData<any | null>(
    `${cacheKey}/contentTypes`,
    async () => {
      const resp = await fetch(
        `${baseUrl}/spaces/${creds.space}/environments/${creds.environment}/content_types?access_token=${creds.accessToken}`
      );
      return resp.json();
    }
  );
  setControlContextData?.({
    types: contentTypes?.items ?? [],
  });

  function setOrderField(searchParams: URLSearchParams) {
    if (order) {
      searchParams.set(
        "order",
        `${reverseOrder ? "-" : ""}${
          order.startsWith("sys.") ? order : `fields.${order}`
        }`
      );
    }
  }

  const { data: entriesData } = usePlasmicQueryData<any | null>(
    contentType ? `${cacheKey}/${contentType}/entriesData` : null,
    async () => {
      const path = `/spaces/${creds.space}/environments/${creds.environment}/entries`;

      const searchParams = new URLSearchParams();
      searchParams.set("access_token", creds.accessToken);
      searchParams.set("content_type", contentType);
      if (limit) {
        searchParams.set("limit", limit.toString());
      }
      setOrderField(searchParams);
      if (include) {
        searchParams.set("include", include.toString());
      }

      const resp = await fetch(`${baseUrl}${path}?${searchParams.toString()}`);
      return resp.json();
    }
  );

  const { data: filteredData } = usePlasmicQueryData<any | null>(
    contentType && filterField && filterValue
      ? `${cacheKey}/${contentType}/filteredData`
      : null,
    async () => {
      const path = `/spaces/${creds.space}/environments/${creds.environment}/entries`;

      const searchParams = new URLSearchParams();
      searchParams.set("access_token", creds.accessToken);
      searchParams.set("content_type", contentType);
      if (limit) {
        searchParams.set("limit", limit.toString());
      }
      setOrderField(searchParams);

      if (include) {
        searchParams.set("include", include.toString());
      }

      if (filterField && searchParameter && filterValue) {
        searchParams.set(
          `fields.${filterField}${searchParameter}`,
          filterValue.toString()
        );
      }

      const resp = await fetch(`${baseUrl}${path}?${searchParams.toString()}`);
      return resp.json();
    }
  );

  if (!creds.space || !creds.accessToken) {
    return (
      <div>
        Please specify a valid API Credentials: Space, Access Token and
        Environment
      </div>
    );
  }

  if (!contentTypes) {
    return <div>Please configure the Contentful credentials</div>;
  }

  if (!entriesData) {
    return <div>Please select a content type</div>;
  }

  const filterFields: string[] = entriesData?.items.flatMap((item: any) => {
    const fields = Object.keys(item.fields).filter((field) => {
      const value = get(item, field);
      return typeof value !== "object" && field !== "photos";
    });
    return fields;
  });

  let operators;
  const matchedFields = Object.values(entriesData.items).map((item: any) => {
    const fields = Object.entries(item.fields).find(
      (el) => el[0] === filterField
    );
    return fields;
  });

  Object.values(matchedFields)
    .map((model: any) => (Array.isArray(model) ? model : [model]))
    .map((item: any) => {
      if (typeof item[1] === "number" && typeof item[1] !== "object") {
        operators = searchParameters;
      } else if (
        typeof item[1] !== "number" &&
        typeof item[1] !== "object" &&
        typeof item[1] === "string"
      ) {
        operators = [
          {
            value: "[match]",
            label: "Full text search",
          },
        ];
      }
    });

  setControlContextData?.({
    queryOptions: operators ?? [],
    types: contentTypes?.items ?? [],
    fields: uniq(filterFields ?? []),
  });

  if (filterField) {
    if (!searchParameter) {
      return <div>Please specify a Search Parameter</div>;
    }
    if (!filterValue) {
      return <div>Please specify a Filter value</div>;
    }
  }

  let renderedData;

  const fixedData = entriesData ? denormalizeData(entriesData) : undefined;

  if (filteredData) {
    if (filteredData?.items?.length === 0) {
      return <div className={className}>No published entry found</div>;
    }

    renderedData = noAutoRepeat
      ? children
      : denormalizeData(filteredData)?.items?.map(
          (item: any, index: number) => (
            <DataProvider
              key={item?.sys?.id}
              name={"contentfulItem"}
              data={item}
              hidden={true}
            >
              <DataProvider
                name={makeDataProviderName(contentType)}
                data={item}
              >
                {repeatedElement(index, children)}
              </DataProvider>
            </DataProvider>
          )
        );
  } else {
    if (fixedData?.items?.length === 0) {
      return <div className={className}>{contentType} is empty</div>;
    }

    renderedData = noAutoRepeat
      ? children
      : fixedData?.items?.map((item: any, index: number) => (
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
  }
  return (
    <DataProvider name="contentfulItems" data={fixedData?.items}>
      {noLayout ? (
        <> {renderedData} </>
      ) : (
        <div className={className}> {renderedData} </div>
      )}
    </DataProvider>
  );
}
interface ContentfulFieldProps {
  className?: string;
  objectPath?: (string | number)[];
  setControlContextData?: (data: { data: object }) => void;
}

export const ContentfulFieldMeta: CodeComponentMeta<ContentfulFieldProps> = {
  name: "ContentfulField",
  displayName: "Contentful Field",
  importName: "ContentfulField",
  importPath: modulePath,
  props: {
    objectPath: {
      type: "dataSelector",
      data: (_props, ctx) => ctx?.data ?? {},
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
    data.sys?.linkType === "Asset" &&
    data.url
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
