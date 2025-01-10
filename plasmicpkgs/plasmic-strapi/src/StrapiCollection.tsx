import { ComponentMeta, DataProvider, repeatedElement } from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import { pascalCase } from "change-case";
import get from "dlv";
import * as qs from "qs";
import React, { ReactNode } from "react";
import { useStrapiCredentials } from "./StrapiCredentialsProvider";
import { getAttributes, modulePath, queryParameters, uniq } from "./utils";

const makeDataProviderName = (collection: string) =>
  `currentStrapi${pascalCase(collection)}Item`;

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
    "Fetches Strapi data of a given collection, and repeats `children` slot content for each row fetched. [See tutorial video](https://www.youtube.com/watch?v=1SLoVY3hkQ4).",
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
  const creds = useStrapiCredentials();

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

  const filterFields = collectionData.flatMap((item: any) => {
    const attributes = getAttributes(item);
    const displayableFields = Object.keys(attributes).filter((field) => {
      const value = attributes[field];
      const maybeMime = getAttributes(value?.data)?.mime;
      return (
        typeof value !== "object" ||
        (typeof maybeMime === "string" && maybeMime.startsWith("image"))
      );
    });
    return displayableFields;
  });

  setControlContextData?.({
    strapiFields: uniq(filterFields ?? []),
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
          key={item.documentId ?? item.id}
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
