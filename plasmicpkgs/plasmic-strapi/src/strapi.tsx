import {
  ComponentMeta,
  DataProvider,
  GlobalContextMeta,
  repeatedElement,
  useSelector,
} from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import * as qs from "qs";
import get from "dlv";
import { pascalCase } from "change-case";
import React, { ReactNode, useContext } from "react";
import { queryParameters, uniq } from "./utils";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-strapi";

const makeDataProviderName = (collection: string) =>
  `currentStrapi${pascalCase(collection)}Item`;

interface StrapiCredentialsProviderProps {
  host?: string;
  token?: string;
}

const CredentialsContext = React.createContext<
  StrapiCredentialsProviderProps | undefined
>(undefined);

export const strapiCredentialsProviderMeta: GlobalContextMeta<StrapiCredentialsProviderProps> =
  {
    name: "StrapiCredentialsProvider",
    displayName: "Strapi Credentials Provider",
    description: `[Watch how to add Strapi data](https://www.youtube.com/watch?v=1SLoVY3hkQ4).

API token is needed only if data is not publicly readable.

Learn how to [get your API token](https://docs.strapi.io/user-docs/latest/settings/managing-global-settings.html#managing-api-tokens).`,
    importName: "StrapiCredentialsProvider",
    importPath: modulePath,
    props: {
      host: {
        type: "string",
        displayName: "Host",
        defaultValueHint: "https://strapi-app.plasmic.app",
        defaultValue: "https://strapi-app.plasmic.app",
        description: "Server where you application is hosted.",
      },
      token: {
        type: "string",
        displayName: "API Token",
        description:
          "API Token (generated in http://yourhost/admin/settings/api-tokens) (or leave blank for unauthenticated usage).",
      },
    },
  };

export function StrapiCredentialsProvider({
  host,
  token,
  children,
}: React.PropsWithChildren<StrapiCredentialsProviderProps>) {
  host = host?.slice(-1) === "/" ? host.slice(0, -1) : host;
  return (
    <CredentialsContext.Provider value={{ host, token }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface StrapiCollectionProps {
  name?: string;
  children?: ReactNode;
  className?: string;
  noLayout?: boolean;
  noAutoRepeat?: boolean;
  filterField?: string;
  filterValue?: string;
  limit?: number;
  filterParameter?: string;
  setControlContextData?: (data: { strapiFields: string[] }) => void;
}

export const strapiCollectionMeta: ComponentMeta<StrapiCollectionProps> = {
  name: "StrapiCollection",
  displayName: "Strapi Collection",
  importName: "StrapiCollection",
  importPath: modulePath,
  providesData: true,
  description:
    "Fetches Strapi data of a given collection and repeats content of children once for every row fetched.",
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
        children: {
          type: "component",
          name: "StrapiField",
        },
      },
    },
    name: {
      type: "string",
      displayName: "Name",
      description: "Name of the collection to be fetched.",
      defaultValueHint: "restaurants",
    },
    filterField: {
      type: "choice",
      displayName: "Filter field",
      description: "Field (from Collection) to filter by",
      options: (props, ctx) => ctx?.strapiFields ?? [],
      hidden: (props, ctx) => !props.name,
    },
    filterParameter: {
      type: "choice",
      displayName: "Filter Parameter",
      description: "Field Parameter filter by",
      options: (props, ctx) => {
        return queryParameters.map((item: any) => ({
          label: item?.label,
          value: item?.value,
        }));
      },
      hidden: (props, ctx) => !props.filterField,
    },
    filterValue: {
      type: "string",
      displayName: "Filter value",
      description: "Value to filter by, should be of filter field type",
      hidden: (props, ctx) => !props.filterParameter,
    },
    limit: {
      type: "number",
      displayName: "Limit",
      description: "Maximum n umber of collections to fetch (0 for unlimited).",
    },
    noLayout: {
      type: "boolean",
      displayName: "No layout",
      description:
        "When set, Strapi Collection will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
      defaultValue: false,
    },
    noAutoRepeat: {
      type: "boolean",
      displayName: "No auto-repeat",
      description: "Do not automatically repeat children for every category.",
      defaultValue: false,
    },
  },
};

export function StrapiCollection({
  name,
  filterParameter,
  filterValue,
  filterField,
  limit,
  children,
  className,
  noLayout,
  noAutoRepeat,
  setControlContextData,
}: StrapiCollectionProps) {
  const creds = ensure(useContext(CredentialsContext));

  if (!creds.host) {
    return <div>Please specify a host.</div>;
  }

  const query = creds.host + "/api/" + name;

  const cacheKey = JSON.stringify({
    creds,
    name,
    filterField,
    filterValue,
    filterParameter,
  });

  const data = usePlasmicQueryData<any[] | null>(cacheKey, async () => {
    if (!query) {
      return null;
    }

    const requestInit: any = { method: "GET" };
    if (creds.token) {
      requestInit.headers = { Authorization: "Bearer " + creds.token };
    }

    const queryParams = qs.stringify({
      ...(filterField && filterParameter && filterValue
        ? {
            filters: {
              [filterField]: {
                [filterParameter]: filterValue,
              },
            },
          }
        : {}),
      populate: "*",
    });

    const resp = await fetch(`${query}?${queryParams}`, requestInit);
    return resp.json();
  });

  if (!data?.data) {
    return (
      <div>
        Please configure the Strapi provider with a valid host and token.
      </div>
    );
  }

  if (!get(data.data, ["data"])) {
    return <div>Please specify a valid collection.</div>;
  }

  const collectionData = get(data.data, ["data"]) as any[];

  const filterFieds = collectionData.flatMap((item: any) => {
    const attributes = get(item, ["attributes"]);
    const displayableFields = Object.keys(attributes).filter((field) => {
      const value = attributes[field];
      const maybeMime = value?.data?.attributes?.mime;
      return (
        typeof value !== "object" ||
        (typeof maybeMime === "string" && maybeMime.startsWith("image"))
      );
    });
    return displayableFields;
  });

  setControlContextData?.({
    strapiFields: uniq(filterFieds ?? []),
  });
  if (filterParameter && !filterValue && !filterField) {
    return <div>Please specify a Filter Field and a Filter Value</div>;
  }
  if (!filterParameter && filterValue && !filterField) {
    return <div>Please specify a Filter Parameter and a Filter Field</div>;
  }
  if (!filterParameter && !filterValue && filterField) {
    return <div>Please specify a Filter Parameter and a Filter Value</div>;
  }

  if (filterParameter && filterValue && !filterField) {
    return <div>Please specify a Filter Field</div>;
  }
  if (!filterParameter && filterValue && filterField) {
    return <div>Please specify a Filter Parameter</div>;
  }
  if (filterParameter && !filterValue && filterField) {
    return <div>Please specify a Filter Value</div>;
  }

  const collection =
    limit! > 0 ? collectionData.slice(0, limit) : collectionData;

  if (collection.length === 0) {
    return <div>No collection found </div>;
  }

  const repElements = noAutoRepeat
    ? children
    : collection.map((item, index) => (
        <DataProvider
          key={item.id}
          name={"strapiItem"}
          data={item}
          hidden={true}
        >
          <DataProvider name={makeDataProviderName(name!)} data={item}>
            {repeatedElement(index, children)}
          </DataProvider>
        </DataProvider>
      ));

  return (
    <DataProvider name="strapiItems" data={collection}>
      {noLayout ? (
        <> {repElements} </>
      ) : (
        <div className={className}> {repElements} </div>
      )}
    </DataProvider>
  );
}

interface StrapiFieldProps {
  className?: string;
  path?: string;
  setControlContextData?: (data: {
    fields: string[];
    isImage: boolean;
  }) => void;
}

export const strapiFieldMeta: ComponentMeta<StrapiFieldProps> = {
  name: "StrapiField",
  displayName: "Strapi Field",
  importName: "StrapiField",
  importPath: modulePath,
  props: {
    path: {
      type: "choice",
      options: (props, ctx) => {
        return ctx?.fields ?? [];
      },
      displayName: "Field",
      description: "Field name",
    },
  },
};

export function StrapiField({
  className,
  path,
  setControlContextData,
}: StrapiFieldProps) {
  const item = useSelector("strapiItem");
  if (!item) {
    return <div>StrapiField must be used within a StrapiCollection</div>;
  }

  // Getting only fields that aren't objects
  const attributes = get(item, ["attributes"]);
  const displayableFields = Object.keys(attributes).filter((field) => {
    const value = attributes[field];
    const maybeMime = value.data?.attributes?.mime;
    return (
      typeof value !== "object" ||
      (typeof maybeMime === "string" && maybeMime.startsWith("image"))
    );
  });

  setControlContextData?.({
    fields: displayableFields,
    isImage: false,
  });

  if (!path) {
    return <div>StrapiField must specify a field name.</div>;
  }

  const data = get(item, ["attributes", path]);
  const maybeMime = data?.data?.attributes?.mime;

  setControlContextData?.({
    fields: displayableFields,
    isImage: typeof maybeMime === "string" && maybeMime.startsWith("image"),
  });

  if (!data) {
    return <div>Please specify a valid field name.</div>;
  } else if (typeof maybeMime === "string" && maybeMime.startsWith("image")) {
    const creds = ensure(useContext(CredentialsContext));
    const attrs = data.data.attributes;
    const img_url = attrs.url.startsWith("http")
      ? attrs.url
      : creds.host + attrs.url;
    const img_width = attrs.width;
    const img_height = attrs.height;
    return (
      <img
        className={className}
        src={img_url}
        width={300}
        height={(300 * img_height) / img_width}
      />
    );
  } else {
    return <div className={className}>{data}</div>;
  }
}
