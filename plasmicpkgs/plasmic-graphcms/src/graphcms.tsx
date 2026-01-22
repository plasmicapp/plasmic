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
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-graphcms";

interface GraphCMSCredentialsProviderProps {
  apiUrl: string;
  authToken: string;
}

const CredentialsContext = React.createContext<
  GraphCMSCredentialsProviderProps | undefined
>(undefined);

export const GraphCMSCredentialsProviderMeta: GlobalContextMeta<GraphCMSCredentialsProviderProps> =
  {
    name: "GraphCMSCredentialsProvider",
    displayName: "Hygraph Credentials Provider",
    description:
      "Permanent Auth Tokens are used for controlling access to querying, mutating content, and comes in the form of Bearer token authentication.[get your Auth Token](https://graphcms.com/docs/api-reference/basics/authorization#permanent-auth-tokens).",
    importName: "GraphCMSCredentialsProvider",
    importPath: modulePath,
    props: {
      apiUrl: {
        type: "string",
        displayName: "API url",
        description: "API url of your Hygraph CMS ",
        defaultValue:
          "https://api-us-west-2.graphcms.com/v2/cl3ua8gpwdni001z10ucc482i/master",
      },
      authToken: {
        type: "string",
        displayName: "Auth Token ",
        description: "Auth Token",
        defaultValue:
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdjbXMtbWFpbi1wcm9kdWN0aW9uIn0.eyJ2ZXJzaW9uIjozLCJpYXQiOjE2NTQwMDg5NzUsImF1ZCI6WyJodHRwczovL2FwaS11cy13ZXN0LTIuZ3JhcGhjbXMuY29tL3YyL2NsM3VhOGdwd2RuaTAwMXoxMHVjYzQ4MmkvbWFzdGVyIiwiaHR0cHM6Ly9tYW5hZ2VtZW50LW5leHQuZ3JhcGhjbXMuY29tIl0sImlzcyI6Imh0dHBzOi8vbWFuYWdlbWVudC5ncmFwaGNtcy5jb20vIiwic3ViIjoiMWU2NGY0ZDMtODE3Yy00OTdkLWE4YTQtNzA4OTY4Zjg3OTc3IiwianRpIjoiY2thNWoyZW9iMDN0YzAxd2gwZGZkNjdyeSJ9.bWr3rpqT7UmJ5NwoEVatkW_QsqxC8tB-zxdcTecIVR19oS5tcoxbbmwe946B-57Zmqrnc5rNntj9UjN065RqEDFM0iPhy4BCgDHCFfNUuHg5Mmq1qu8-j_ZSN90aJfwVmMNYH9GuOYFiOCd6uytLe8fPcQRWOKpXEcO8q4BusrreCvwkwXIaZV2dq-FOJ4LdBdKcRWwfQWeMdthVzBxrlrxogP_xEYQuMNdfbe5tGWgVsRVDN7eQjB1w9Srqc9T_NgY6x-aL8rPmobcZ1IMdUj9klPPm_dINMzrhZS4OR-HXHPwdnSFObgPeJDPI6YEo2SFAg78PMCNZNRT2DtfDVC4F7cLboxaNUNY4r6Z2d9uBu2N1o05zIXra6Q4JIA--0xBfELTUcmU06Ococioyui8PCI5r_QlRSSlnxrdb85Ht00yMDBRGHPtySGUNiEy9Lq5RcoW1a41bJRmZ-z1Q8zluOUHrgwcIb2DN8xKB9YThPce7ytnFcVajH0K3Hnd57m7SukCgZACmULt_EK0NYTUe1BBmTC8eg9ZBM3lplPWSUzBKWgajGTUNK50KRWokAke_UCEf0gssR3MYLIo5PVN131-bD57nccEPBkegYmmZUACRoYHyI_gQYC-0---MXCS6BV7cK1D-_yDbiBrCCixyKNBYCmhxuZOxVcWu4dk",
      },
    },
  };

export function GraphCMSCredentialsProvider({
  apiUrl,
  authToken,
  children,
}: React.PropsWithChildren<GraphCMSCredentialsProviderProps>) {
  return (
    <CredentialsContext.Provider value={{ apiUrl, authToken }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface GraphCMSFetcherProps {
  children?: ReactNode;
  className?: string;
  noAutoRepeat?: boolean;
  noLayout?: boolean;
  query?: { query?: string; variables?: object };
  varOverrides?: Record<string, any>;
  setControlContextData?: (data: {
    endpoint?: string;
    headers?: HeadersInit;
  }) => void;
}

export const GraphCMSFetcherMeta: CodeComponentMeta<GraphCMSFetcherProps> = {
  name: "GraphCMSFetcher",
  displayName: "Hygraph Fetcher",
  importName: "GraphCMSFetcher",
  importPath: modulePath,
  providesData: true,
  description:
    "Fetches Hygraph data and repeats content of children once for every row fetched. ",
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
          name: "GraphCMSField",
        },
      },
    },
    query: {
      type: "code",
      lang: "graphql",
      endpoint: (props, ctx) => ctx?.endpoint ?? "",
      headers: (props, ctx) => ctx?.headers ?? "",
    },
    varOverrides: {
      type: "object",
      description:
        "Pass in dynamic values for your query variables, as an object of key-values",
      defaultValue: {},
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
        "When set, GraphCMS Fetcher will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
      defaultValue: false,
    },
  },
};

function compact(arr: any[]) {
  return arr.filter((x) => !!x);
}

export function GraphCMSFetcher({
  query,
  children,
  className,
  noLayout,
  noAutoRepeat,
  varOverrides,
  setControlContextData,
}: GraphCMSFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    query,
    creds,
    varOverrides,
  });

  const headers = {
    Authorization: `Bearer ${creds.authToken}`,
  };

  const { data, error, isLoading } = usePlasmicQueryData<any | null>(
    cacheKey,
    async () => {
      if (!query) {
        return null;
      }

      if (
        varOverrides &&
        typeof varOverrides === "object" &&
        Object.keys(varOverrides).length > 0
      ) {
        query = {
          ...query,
          variables: {
            ...query.variables,
            ...varOverrides,
          },
        };
      }

      const res = await fetch(creds.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(query),
      });

      return await res.json();
    }
  );

  setControlContextData?.({
    endpoint: creds.apiUrl,
    headers,
  });

  if (!query) {
    return <div>Please make a query in order to fetch data </div>;
  }

  if (!creds.apiUrl || !creds.authToken) {
    return (
      <div>Please specify a valid API Credentials: API Url, Auth Token</div>
    );
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (isLoading) {
    return null;
  }

  if (!data?.data || compact(Object.values(data?.data)).length === 0) {
    return <div>Data not found</div>;
  }

  const renderedData = noAutoRepeat
    ? children
    : Object.values(data?.data)
        .flatMap((model: any) => (Array.isArray(model) ? model : [model]))
        .map((item: any, i: number) => (
          <DataProvider
            key={JSON.stringify(item)}
            name={"graphCmsItem"}
            data={item}
          >
            {repeatedElement(i, children)}
          </DataProvider>
        ));
  return noLayout ? (
    <> {renderedData} </>
  ) : (
    <div className={className}> {renderedData} </div>
  );
}

interface GraphCMSFieldProps {
  className?: string;
  path?: string;
  setControlContextData?: (data: { data: any }) => void;
  themeClassName?: string;
}
export const GraphCMSFieldMeta: CodeComponentMeta<GraphCMSFieldProps> = {
  name: "GraphCMSField",
  displayName: "Hygraph Field",
  importName: "GraphCMSField",
  importPath: modulePath,
  props: {
    path: {
      type: "dataSelector",
      data: (props: any, ctx: any) => ctx?.data ?? {},
      displayName: "Field",
      description: "Field to be displayed.",
    },
    themeClassName: {
      type: "themeResetClass",
      targetAllTags: true,
    },
  },
};
export function GraphCMSField({
  className,
  path,
  themeClassName,
  setControlContextData,
}: GraphCMSFieldProps) {
  const item = useSelector("graphCmsItem");
  if (!item) {
    return <div>GraphCMSField must be used within a GraphCMSFetcher </div>;
  }

  setControlContextData?.({ data: item });

  if (!path) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  // We need to improve this check by making an introspection query
  const isRichText = (data: any) => "html" in data;

  const data = get(item, path);
  if (typeof data === "object" && data.mimeType?.startsWith("image")) {
    return <img src={data.url} className={className} />;
  } else if (typeof data === "object" && isRichText(data)) {
    return (
      <div
        className={`${themeClassName} ${className}`}
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    );
  } else if (!data || typeof data === "object") {
    return <div className={className}>Please specify a valid field.</div>;
  } else {
    return <div className={className}>{data}</div>;
  }
}
