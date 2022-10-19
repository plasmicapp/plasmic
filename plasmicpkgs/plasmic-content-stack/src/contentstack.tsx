import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import camelCase from "camelcase";
import * as ContentStack from "contentstack";
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

const modulePath = "@plasmicpkgs/plasmic-content-stack";

const makeDataProviderName = (contentType: string) =>
  `currentContentstack${camelCase(contentType, { pascalCase: true })}Item`;

interface ContentStackCredentialsProviderProps {
  apiKey: string;
  accessToken: string;
  environment: string;
}

const CredentialsContext = React.createContext<
  ContentStackCredentialsProviderProps | undefined
>(undefined);

export const ContentStackCredentialsProviderMeta: GlobalContextMeta<ContentStackCredentialsProviderProps> = {
  name: "ContentStackCredentialsProvider",
  displayName: "ContentStack Credentials Provider",
  description:
    "The API key is a unique key assigned to each stack. Learn how to [get your API key](https://www.contentstack.com/docs/developers/apis/content-management-api/#how-to-get-stack-api-key).",
  importName: "ContentStackCredentialsProvider",
  importPath: modulePath,
  props: {
    apiKey: {
      type: "string",
      displayName: "API Key",
      description: "API Key of your Stack ",
      defaultValue: "blt02f7b45378b008ee",
    },
    accessToken: {
      type: "string",
      displayName: "Access Token ",
      description: "Access Token",
      defaultValue: "cs5b69faf35efdebd91d08bcf4",
    },
    environment: {
      type: "string",
      displayName: "Environment",
      defaultValue: "production",
    },
  },
};

export function ContentStackCredentialsProvider({
  apiKey,
  accessToken,
  environment,
  children,
}: React.PropsWithChildren<ContentStackCredentialsProviderProps>) {
  return (
    <CredentialsContext.Provider value={{ apiKey, accessToken, environment }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface ContentStackFetcherProps {
  contentType?: string;
  fetchType?: string;
  entryUID?: string;
  filter?: boolean;
  filterField?: string;
  filterType?: 'where' | 'greaterThanOrEqualTo' | 'lessThanOrEqualTo';
  filterValue?: string;
  order: boolean;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  children?: ReactNode;
  className?: string;
  noLayout?: boolean;
  setControlContextData?: (data: {
    types?: { title: string; uid: string }[];
    entries?: { title: string; uid: string }[];
    fields?: { display_name: string; uid: string }[];
  }) => void;
}

export const ContentStackFetcherMeta: ComponentMeta<ContentStackFetcherProps> = {
  name: "ContentStackFetcher",
  displayName: "ContentStack Fetcher",
  importName: "ContentStackFetcher",
  importPath: modulePath,
  providesData: true,
  description:
    "Fetches ContentStack data and repeats content of children once for every row fetched. ",
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
          name: "ContentStackField",
        },
      },
    },
    contentType: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.types?.map((type) => ({
          label: type.title,
          value: type.uid,
        })) ?? [],
      displayName: "Content type",
      description: "Content type to be queried.",
    },
    fetchType: {
      type: "choice",
      options: [
        { label: 'Single Entry', value: 'single' },
        { label: 'All Entries', value: 'all' },
      ],
      displayName: "Fetch type",
      description: "What type of query to use.",
    },
    entryUID: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.entries?.map((entry) => ({
          label: entry.title,
          value: entry.uid,
        })) ?? [],
      displayName: "Entry UID",
      description: "Select a single entry.",
      hidden: props => props.fetchType !== 'single',
    },
    filter: {
      type: "boolean",
      displayName: "Filter Entries",
      hidden: props => props.fetchType !== 'all',
    },
    filterField: {
      type: "choice",
      options: (props, ctx) => 
        ctx?.fields?.map((field) => ({
          label: field.display_name,
          value: field.uid,
        })) ?? [],
      displayName: "Filter On",
      description: "For Created/Updated At, YYYY-MM-DD is supported",
      hidden: props => !props.filter || props.fetchType !== 'all',
    },
    filterType: {
      type: "choice",
      options: [
        { label: 'Equals', value: 'where' },
        { label: 'Greater Than', value: 'greaterThanOrEqualTo' },
        { label: 'Less Than', value: 'lessThanOrEqualTo' }
      ],
      displayName: "Filter Type",
      hidden: props => !props.filter || props.fetchType !== 'all',
    },
    filterValue: {
      type: "string",
      displayName: "Filter Value",
      description: "May not work on non-string fields.",
      hidden: props => !props.filter || props.fetchType !== 'all',
    },
    order: {
      type: "boolean",
      displayName: "Order Entries",
      hidden: props => props.fetchType !== 'all',
    },
    orderBy: {
      type: "choice",
      options: (props, ctx) => 
        ctx?.fields?.map((field) => ({
          label: field.display_name,
          value: field.uid,
        })) ?? [],
      displayName: "Order By",
      hidden: props => !props.order || props.fetchType !== 'all',
    },
    ascending: {
      type: "choice",
      options: [{ label: 'Ascending', value: true}, {label: 'Descending', value: false }],
      displayName: "Order Direction",
      hidden: props => !props.order || props.fetchType !== 'all',
    },
    limit: {
      type: "number",
      displayName: "Limit Results",
      hidden: props => props.fetchType === 'single',
    },
    noLayout: {
      type: "boolean",
      displayName: "No layout",
      description:
        "When set, ContentStack Fetcher will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
      defaultValue: false,
    },
  },
};

export function ContentStackFetcher({
  contentType,
  fetchType,
  entryUID,
  filter,
  filterField,
  filterType,
  filterValue,
  order,
  orderBy,
  ascending,
  limit,
  children,
  className,
  noLayout,
  setControlContextData,
}: ContentStackFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    creds,
  });
  const Stack = ContentStack.Stack({
    api_key: creds.apiKey,
    delivery_token: creds.accessToken,
    environment: creds.environment,
  });

  const { data: entryData } = usePlasmicQueryData<any | null>(
    contentType && entryUID && fetchType === 'single'
      ? `${cacheKey}/${contentType}/entry/${entryUID}`
      : null,
    async () => {
      const Query = Stack.ContentType(`${contentType!}`).Entry(`${entryUID!}`);
      const result = await Query.fetch();
      const response = await result.toJSON();
      return response;
    }
  );

  const { data: contentTypes } = usePlasmicQueryData<any | null>(
    `${cacheKey}/contentTypes`,
    async () => {
      return (
        await Stack.getContentTypes({ include_global_field_schema: true })
      ).content_types;
    }
  );

  const { data: entriesData } = usePlasmicQueryData<any | null>(
    contentType ? `${cacheKey}/${contentType}/entries` + (fetchType === 'all' ? `${
      limit ? "/limit/" + limit : ''
    }${
      order && orderBy ? "/order/" + orderBy + (ascending ? '/ascending' : '') : ''
    }${
      filter && filterField && filterType && filterValue ? `/filter/${filterField}/${filterType}/${filterValue}` : ''
    }` : '') : null,
    async () => {
      let Query = Stack.ContentType(`${contentType!}`).Query();
      if(fetchType === 'all'){
        if (filter && filterField && filterType && filterValue) {
          Query = Query[filterType](filterField, filterValue);
        }
        if (order && orderBy){
          Query = Query[ascending ? 'ascending' : 'descending'](orderBy);
        }
        if (limit){
          Query = Query.limit(limit);
        }
      }
      return await Query.toJSON().find();
    }
  );

  const schema = [{display_name: 'Created At', uid: 'created_at'}, {display_name: 'Updated At', uid: 'updated_at'}, ...(contentTypes?.filter((x: any) => x.uid === contentType)?.[0]?.schema ?? [])];
  setControlContextData?.({
    types: contentTypes,
    entries: entriesData?.[0],
    fields: schema,
  });

  if (!creds.apiKey || !creds.accessToken || !creds.environment) {
    return (
      <div>
        Please specify a valid API Credentials: API Key, Access Token and
        Environment
      </div>
    );
  }

  let renderedData;
  if (contentType && fetchType === 'single') {
    if (!entryUID) return <div>Please select an entry</div>;
    renderedData = (
      <DataProvider name={"contentstackItem"} data={entryData} hidden={true}>
        <DataProvider name={makeDataProviderName(contentType)} data={entryData}>
          {children}
        </DataProvider>
      </DataProvider>
    );
  } else if (contentType && fetchType === 'all') {
    const entries = entriesData?.flat();
    renderedData = entries?.map((item: any, index: number) => (
      <DataProvider
        key={item._id}
        name={"contentstackItem"}
        data={item}
        hidden={true}
      >
        <DataProvider name={makeDataProviderName(contentType)} data={item}>
          {repeatedElement(index, children)}
        </DataProvider>
      </DataProvider>
    ));
  } else {
    return <div>Please select a content type.</div>;
  }

  return (
    <DataProvider
      name={"contentstackSchema"}
      data={contentTypes?.find((type: any) => type.uid === contentType)?.schema}
      hidden={true}
    >
      {noLayout ? (
        <> {renderedData} </>
      ) : (
        <div className={className}> {renderedData} </div>
      )}
    </DataProvider>
  );
}

interface ContentStackFieldProps {
  className?: string;
  objectPath?: (string | number)[];
  setControlContextData?: (data: { data: Record<string, any> }) => void;
}
export const ContentStackFieldMeta: ComponentMeta<ContentStackFieldProps> = {
  name: "ContentStackField",
  displayName: "ContentStack Field",
  importName: "ContentStackField",
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
export function ContentStackField({
  objectPath,
  setControlContextData,
  ...rest
}: ContentStackFieldProps) {
  const item = useSelector("contentstackItem");
  if (!item) {
    return (
      <div>ContentStackField must be used within a ContentStackFetcher </div>
    );
  }
  const schema = useSelector("contentstackSchema");

  setControlContextData?.({
    data: item,
  });

  if (!objectPath) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const isRichText = () =>
    schema?.find((field: any) => field.uid === get(objectPath, [0]))
      ?.field_metadata?.allow_rich_text;

  const data = get(item, objectPath);
  if (typeof data === "object" && data?.content_type?.startsWith("image")) {
    return <img {...rest} src={data.url} />;
  } else if (!data || typeof data === "object") {
    return <div {...rest}>Please specify a valid field.</div>;
  } else if (isRichText()) {
    return <div {...rest} dangerouslySetInnerHTML={{ __html: data }} />;
  } else {
    return <div {...rest}> {data} </div>;
  }
}
