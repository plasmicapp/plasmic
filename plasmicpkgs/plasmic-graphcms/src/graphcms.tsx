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
import { gql, GraphQLClient } from 'graphql-request';

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
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

export const GraphCMSCredentialsProviderMeta: GlobalContextMeta<GraphCMSCredentialsProviderProps> = {
  name: "GraphCMSCredentialsProvider",
  displayName: "GraphCMS Credentials Provider",
  description:
    "Permanent Auth Tokens are used for controlling access to querying, mutating content, and comes in the form of Bearer token authentication.[get your Auth Token](https://graphcms.com/docs/api-reference/basics/authorization#permanent-auth-tokens).",
  importName: "GraphCMSCredentialsProvider",
  importPath: modulePath,
  props: {
    apiUrl: {
      type: "string",
      displayName: "API url",
      description: "API url of your GraphCMS ",
      defaultValue: "https://api-ap-south-1.graphcms.com/v2/cl341l62h55v801z81lhc6yao/master"
    },
    authToken: {
      type: "string",
      displayName: "Auth Token ",
      description: "Auth Token",
      defaultValue: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdjbXMtbWFpbi1wcm9kdWN0aW9uIn0.eyJ2ZXJzaW9uIjozLCJpYXQiOjE2NTI0MjIzMzQsImF1ZCI6WyJodHRwczovL2FwaS1hcC1zb3V0aC0xLmdyYXBoY21zLmNvbS92Mi9jbDM0MWw2Mmg1NXY4MDF6ODFsaGM2eWFvL21hc3RlciIsImh0dHBzOi8vbWFuYWdlbWVudC1uZXh0LmdyYXBoY21zLmNvbSJdLCJpc3MiOiJodHRwczovL21hbmFnZW1lbnQuZ3JhcGhjbXMuY29tLyIsInN1YiI6ImUzMjE5MTA1LWYwMDUtNDY5NS05ODg3LWE5M2M2YjZhNjc2OSIsImp0aSI6ImNrZzgzNW9hcHI0ZmkwMXdlOThqbDc4MHQifQ.uMUfPDFCWip4cW-azHzhjW0SUzS1e9bYMFA4ONQhXreoTp6ly3ektNIruFRtuXq7qQmm8eyyyZkM9-pZyVOSOlHY6pRPVN4C-Zi9plxvC2QgKnI6778u7hJ7CeKrYstw8tNAPhF104f380bDi3L24f1TcLkJBEvgMn08UA4PJzzs0LFlY2h7RPrBMoFAqwFekHwUBTgOeOmYJDbNKCtZyEj7Tao4jZDKhRqCAKAhrogv4y9NlsvkZtBtE8-Qc8BllI2nkJQyopD8za8igekezfWpQqGCbKbSKQdTPI1OvagQE5Nywf5HaJgR7OucjlCFvTrTgQjTHBUWAFDTHUr2irF5T6AKBFuquD2G9ztAf_ltGnAOStuXlOjGbjQIvSqA7qZCqQuNsFHAIcsh7MKEZJQaGZ99okA1Fp2LkeXlw-tTp9RcgZ6P-T4KaRKD8GkMZYZqM26TbcKS6nRX4iaVopjsqfuxu7WQ40xyKQSeVgm9MGHKSG2xwmNq1bMvexal5F9F2b24qF1ikPVjZkNETjbO0t422z3gVucy_lUMeBAf4tZmbaSh3QdI9LHyoT2Rlk4ADBxrmdaCebsSXwnKYCYY3A9al_1SUdVt_DE874nhYPMOr3si2Ag0SJkSORk4qwywbQ1DchCMKYk7U-tMlfuDLN6scQrrpiEgf5UZ03Y'
    },
  },
};

export function GraphCMSCredentialsProvider({
  apiUrl,
  authToken,
  children,
}: React.PropsWithChildren<GraphCMSCredentialsProviderProps>) {
  return (
    <CredentialsContext.Provider value={{ apiUrl, authToken, }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface GraphCMSFetcherProps {
  children?: ReactNode;
  className?: string;
  noLayout?: boolean;
  query?: string,
  setControlContextData?: (data: {
    endpoint?: string,
    headers?: HeadersInit
  }) => void;
}

export const GraphCMSFetcherMeta: ComponentMeta<GraphCMSFetcherProps> = {
  name: "GraphCMSFetcher",
  displayName: "GraphCMS Fetcher",
  importName: "GraphCMSFetcher",
  importPath: modulePath,
  description:
    "Fetches GraphCMS data and repeats content of children once for every row fetched. ",
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
    noLayout: {
      type: "boolean",
      displayName: "No layout",
      description:
        "When set, GraphCMS Fetcher will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
      defaultValue: false,
    },
  },
};

export function GraphCMSFetcher({
  query,
  children,
  className,
  noLayout,
  setControlContextData,
}: GraphCMSFetcherProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    query
  });
  const headers = {
    "Authorization": `Bearer ${creds.authToken}`
  }
  const client = new GraphQLClient(creds.apiUrl, { headers })




  const { data } = usePlasmicQueryData<any | null>(
    cacheKey,
    async () => {
      if (!query) {
        return null;
      }
      const entryRequest = gql`${query}`;
      return await client.request(entryRequest);
    }
  );

  setControlContextData?.({
    endpoint: creds.apiUrl,
    headers,
  });

  if (!query) {
    return <div>Please make a query in order to fetch data </div>
  }

  if (!creds.apiUrl || !creds.authToken) {
    return (
      <div>
        Please specify a valid API Credentials: API Url, Auth Token
      </div>
    );
  }

  const renderedData = Object.values(data ?? {}).flatMap((model: any) =>
    model.map((item: any, index: number) => (
      <DataProvider key={JSON.stringify(item)} name={"GraphCMSItem"} data={item}>
        {repeatedElement(index === 0, children)}
      </DataProvider>
    ))
  );

  return noLayout ? (
    <> {renderedData} </>
  ) : (
    <div className={className}> {renderedData} </div>
  );
}

interface GraphCMSFieldProps {
  className?: string;
  field?: string;
  setControlContextData?: (data: { fields: string[] }) => void;
}
export const GraphCMSFieldMeta: ComponentMeta<GraphCMSFieldProps> = {
  name: "GraphCMSField",
  displayName: "GraphCMS Field",
  importName: "GraphCMSField",
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
export function GraphCMSField({
  className,
  field,

  setControlContextData,
}: GraphCMSFieldProps) {
  const item = useSelector("GraphCMSItem");
  if (!item) {
    return (
      <div>GraphCMSField must be used within a GraphCMSFetcher </div>
    );
  }
  // Getting only fields that aren’t objects
  const displayableFields = Object.keys(item).filter((field) => {
    const value = L.get(item, field);
    return typeof value !== "object"
  });
  setControlContextData?.({
    fields: displayableFields,
  });
  if (!field) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  const data = L.get(item, field as string);
  if (!data) {
    return <div>Please specify a valid field.</div>;
  } else {
    return <div className={className}> {data} </div>;
  }
}
