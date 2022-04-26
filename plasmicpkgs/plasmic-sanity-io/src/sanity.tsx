import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import sanityClient from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
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

const modulePath = "@plasmicpkgs/plasmic-sanity-io";

interface SanityCredentialsProviderProps {
  projectId?: string;
  dataset?: string;
  apiVersion?: string;
  token?: string;
  useCdn?: boolean;
}

function useSanityClient(creds: SanityCredentialsProviderProps) {
  const sanity = sanityClient({
    projectId: creds.projectId,
    dataset: creds.dataset,
    apiVersion: creds.apiVersion ? creds.apiVersion : "v1",
    token: creds.token,
    useCdn: creds.useCdn,
  });
  return sanity;
}

const CredentialsContext = React.createContext<
  SanityCredentialsProviderProps | undefined
>(undefined);

export const sanityCredentialsProviderMeta: GlobalContextMeta<SanityCredentialsProviderProps> = {
  name: "SanityCredentialsProvider",
  displayName: "Sanity Credentials Provider",
  description:
    "Get your project ID, dataset, and token [here](https://www.sanity.io/manage). Please also add 'https://host.plasmicdev.com' (or your app host origin) as an authorized host on the CORS origins section of your project.",
  importName: "SanityCredentialsProvider",
  importPath: modulePath,
  props: {
    projectId: {
      type: "string",
      displayName: "Project ID",
      defaultValueHint: "b2gfz67v",
      description: "The ID of the project to use.",
    },
    dataset: {
      type: "string",
      displayName: "Dataset",
      description: "The dataset to use.",
    },
    apiVersion: {
      type: "string",
      displayName: "API Version",
      defaultValueHint: "v1",
      description:
        "The API version to use (if not set, 'v1' will be used) - see https://www.sanity.io/docs/js-client#specifying-api-version.",
    },
    token: {
      type: "string",
      displayName: "Token",
      description:
        "The token to use (or leave blank for unauthenticated usage) - you can create tokens in the API section of your project (i.e. https://www.sanity.io/manage/personal/project/PROJECT_ID/api#tokens).",
    },
    useCdn: {
      type: "boolean",
      displayName: "Use CDN?",
      defaultValueHint: false,
      description:
        "Whether you want to use CDN ('false' if you want to ensure fresh data).",
    },
  },
};

export function SanityCredentialsProvider({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn,
  children,
}: React.PropsWithChildren<SanityCredentialsProviderProps>) {
  return (
    <CredentialsContext.Provider
      value={{ projectId, dataset, apiVersion, token, useCdn }}
    >
      {children}
    </CredentialsContext.Provider>
  );
}

interface SanityFetcherProps {
  groq?: string;
  docType?: string;
  children?: ReactNode;
  className?: string;
  noLayout?: boolean;
  setControlContextData?: (data: { docTypes: string[] }) => void;
}

export const sanityFetcherMeta: ComponentMeta<SanityFetcherProps> = {
  name: "SanityFetcher",
  displayName: "Sanity Fetcher",
  importName: "SanityFetcher",
  importPath: modulePath,
  description:
    "Fetches Sanity data and repeats content of children once for every row fetched. Query Cheat Sheet - GROQ <https://www.sanity.io/docs/query-cheat-sheet>",
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
          name: "SanityField",
        },
      },
    },
    groq: {
      type: "string",
      displayName: "GROQ",
      description: "Query in GROQ.",
      defaultValueHint: "*[_type == 'movie']",
    },
    docType: {
      type: "choice",
      options: (props, ctx) => {
        return ctx?.docTypes ?? [];
      },
      displayName: "Document type",
      description:
        "Document type to be queried (*[_type == DOC_TYPE] shortcut).",
    },
    noLayout: {
      type: "boolean",
      displayName: "No layout",
      description:
        "When set, Sanity Fetcher will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
      defaultValue: false,
    },
  },
};

export function SanityFetcher({
  groq,
  docType,
  children,
  className,
  noLayout,
  setControlContextData,
}: SanityFetcherProps) {
  const projectIdRegex = new RegExp(/^[-a-z0-9]+$/i);
  const datasetRegex = new RegExp(
    /^(~[a-z0-9]{1}[-\w]{0,63}|[a-z0-9]{1}[-\w]{0,63})$/
  );
  const dateRegex = new RegExp(/^\d{4}-\d{2}-\d{2}$/);

  const creds = ensure(useContext(CredentialsContext));

  if (!creds.projectId || !projectIdRegex.test(creds.projectId)) {
    return (
      <div>
        Please specify a valid projectId, it can only contain only a-z, 0-9 and
        dashes.
      </div>
    );
  } else if (!creds.dataset || !datasetRegex.test(creds.dataset)) {
    return (
      <div>
        Please specify a valid dataset, they can only contain lowercase
        characters, numbers, underscores and dashes, and start with tilde, and
        be maximum 64 characters.
      </div>
    );
  } else if (creds.apiVersion) {
    if (
      creds.apiVersion !== "v1" &&
      creds.apiVersion !== "1" &&
      creds.apiVersion !== "X"
    ) {
      const date = new Date(creds.apiVersion);
      if (
        !(
          dateRegex.test(creds.apiVersion) &&
          date instanceof Date &&
          date.getTime() > 0
        )
      ) {
        return (
          <div>
            Please specify a valid API version, expected `v1`, `1` or date in
            format `YYYY-MM-DD`.
          </div>
        );
      }
    }
  } else if (!groq && !docType) {
    return <div>Please specify a GROQ query or select a Document type.</div>;
  }

  const allData = usePlasmicQueryData<any[] | null>(
    JSON.stringify(creds),
    async () => {
      const sanity = useSanityClient(creds);
      const resp = await sanity.fetch("*");
      return resp;
    }
  );

  if (!groq) {
    groq = "*[_type=='" + docType + "']";
  }

  const cacheKey = JSON.stringify({
    groq,
    creds,
  });

  const data = usePlasmicQueryData<any[] | null>(cacheKey, async () => {
    if (!groq) {
      return null;
    }
    const sanity = useSanityClient(creds);
    const resp = await sanity.fetch(groq);
    return resp;
  });

  if (!allData?.data) {
    return (
      <div>
        Please configure the Sanity provider with a valid projectId, dataset,
        and token (if necessary). Don't forget to add
        'https://host.plasmicdev.com' as an authorized host on the CORS origins
        section of your project.
      </div>
    );
  }

  const existingTypes = new Set(allData.data?.map((doc) => doc._type));

  setControlContextData?.({
    docTypes: Array.from(existingTypes),
  });

  if (!data?.data) {
    return <div>Please specify a valid GROQ query.</div>;
  }

  const repElements = data?.data.map((item, index) => (
    <DataProvider key={item._id} name={"sanityItem"} data={item}>
      {repeatedElement(index === 0, children)}
    </DataProvider>
  ));

  return noLayout ? (
    <> {repElements} </>
  ) : (
    <div className={className}> {repElements} </div>
  );
}

interface SanityFieldProps {
  className?: string;
  path?: string;
  field?: string;
  setControlContextData?: (data: { fields: string[] }) => void;
}

export const sanityFieldMeta: ComponentMeta<SanityFieldProps> = {
  name: "SanityField",
  displayName: "Sanity Field",
  importName: "SanityField",
  importPath: modulePath,
  props: {
    path: {
      type: "string",
      displayName: "Path",
      description: "Field path - see https://www.sanity.io/docs/ids.",
      defaultValueHint: "castMembers.0._key",
    },
    field: {
      type: "choice",
      options: (props, ctx) => {
        return ctx?.fields ?? [];
      },
      displayName: "Field",
      description: "Field to be displayed.",
    },
  },
};

export function SanityField({
  className,
  path,
  field,
  setControlContextData,
}: SanityFieldProps) {
  const creds = ensure(useContext(CredentialsContext));
  const sanity = useSanityClient(creds);
  const imageBuilder = imageUrlBuilder(sanity);

  const item = useSelector("sanityItem");
  if (!item) {
    return <div>SanityField must be used within a SanityFetcher</div>;
  }

  // Getting only fields that aren't objects
  const displayableFields = Object.keys(item).filter((field) => {
    const value = L.get(item, field);
    return typeof value !== "object" || value._type === "image";
  });
  setControlContextData?.({
    fields: displayableFields,
  });

  if (!path && !field) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  if (!path) {
    path = field;
  }

  const data = L.get(item, path as string);
  if (!data) {
    return <div>Please specify a valid path.</div>;
  } else if (data?._type === "image") {
    return (
      <img
        src={imageBuilder.image(data).ignoreImageParams().width(300).toString()}
      />
    );
  } else {
    return <div className={className}>{data}</div>;
  }
}
