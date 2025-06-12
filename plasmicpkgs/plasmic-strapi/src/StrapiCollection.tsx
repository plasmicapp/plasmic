import { ComponentMeta, DataProvider, repeatedElement } from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import { pascalCase } from "change-case";
import get from "dlv";
import React, { ReactNode } from "react";
import { queryStrapi } from "./custom-functions";
import { useStrapiCredentials } from "./StrapiCredentialsProvider";
import { filterFields, modulePath, queryParameters, uniq } from "./utils";

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
      options: (_, ctx) => ctx?.strapiFields ?? [],
      hidden: (props) => !props.name,
    },
    filterParameter: {
      type: "choice",
      displayName: "Filter Parameter",
      description: "Field Parameter filter by",
      options: () => {
        return queryParameters.map((item: any) => ({
          label: item?.label,
          value: item?.value,
        }));
      },
      hidden: (props) => !props.filterField,
    },
    filterValue: {
      type: "string",
      displayName: "Filter value",
      description: "Value to filter by, should be of filter field type",
      hidden: (props) => !props.filterParameter,
    },
    limit: {
      type: "number",
      displayName: "Limit",
      description: "Maximum number of collections to fetch (0 for unlimited).",
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
  const { host, token } = useStrapiCredentials();

  if (!host) {
    return <div>Please specify a host.</div>;
  }

  const cacheKey = JSON.stringify({
    host,
    token,
    name,
    filterField,
    filterValue,
    filterParameter,
  });

  const data = usePlasmicQueryData<any[] | null>(cacheKey, async () =>
    queryStrapi(host, token, name, filterField, filterValue, filterParameter)
  );

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

  const filteredFields = filterFields(collectionData);

  setControlContextData?.({
    strapiFields: uniq(filteredFields ?? []),
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
