import { DataProvider, repeatedElement } from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";

const thisModule = "@plasmicpkgs/plasmic-basic-components";

const defaultItemName = "currentItem";
const defaultIndexName = "currentIndex";

interface RepeaterProps<T> {
  children: React.ReactNode;
  items: T[];
  itemName?: string;
  indexName?: string;
}

export function Repeater<T>(props: RepeaterProps<T>) {
  const { children, items, itemName, indexName } = props;

  if (!Array.isArray(items)) {
    throw new Error("Repeater received an invalid collection: not an array.");
  }

  return (
    <>
      {items.map((item, index) => (
        <DataProvider
          key={index.toString()}
          name={itemName || defaultItemName}
          data={item}
        >
          <DataProvider name={indexName || defaultIndexName} data={index}>
            {repeatedElement(index, children)}
          </DataProvider>
        </DataProvider>
      ))}
    </>
  );
}

export const repeaterMeta: CodeComponentMeta<RepeaterProps<any>> = {
  name: `plasmic-repeater`,
  displayName: "Repeater",
  importName: "Repeater",
  importPath: thisModule,
  providesData: true,
  props: {
    children: {
      type: "slot",
      isRepeated: true,
    },
    items: {
      type: "array",
      defaultValue: [1, 2, 3],
      displayName: "Collection",
      description: "Items array (JavaScript expression).",
    },
    itemName: {
      type: "string",
      defaultValue: defaultItemName,
      defaultValueHint: defaultItemName,
      displayName: "Item",
      description: "Data context key for the current item.",
    },
    indexName: {
      type: "string",
      defaultValue: defaultIndexName,
      defaultValueHint: defaultIndexName,
      displayName: "Index",
      description: "Data context key for the index of the current item.",
    },
  },
};

export function registerRepeater(
  loader?: { registerComponent: typeof registerComponent },
  customRepeaterMeta?: CodeComponentMeta<RepeaterProps<any>>
) {
  if (loader) {
    loader.registerComponent(Repeater, customRepeaterMeta ?? repeaterMeta);
  } else {
    registerComponent(Repeater, customRepeaterMeta ?? repeaterMeta);
  }
}
