/** @format */

import { repeatedElement } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import React, {
  ComponentProps,
  createContext,
  createElement,
  CSSProperties,
  ReactNode,
  useContext,
} from "react";

export const tuple = <T extends any[]>(...args: T): T => args;

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

export type DataDict = Record<string, any>;

export const DataContext = createContext<DataDict | undefined>(undefined);

export function applySelector(
  rawData: DataDict | undefined,
  selector: string | undefined
): any {
  if (!selector) {
    return undefined;
  }
  let curData = rawData;
  for (const key of selector.split(".")) {
    curData = curData?.[key];
  }
  return curData;
}

export type SelectorDict = Record<string, string | undefined>;

export function useSelector(selector: string | undefined): any {
  const rawData = useDataEnv();
  return applySelector(rawData, selector);
}

export function useSelectors(selectors: SelectorDict = {}): any {
  const rawData = useDataEnv();
  return Object.fromEntries(
    Object.entries(selectors)
      .filter(([key, selector]) => !!key && !!selector)
      .map(([key, selector]) => tuple(key, applySelector(rawData, selector)))
  );
}

export function useDataEnv() {
  return useContext(DataContext);
}

export interface DataProviderProps {
  name?: string;
  data?: any;
  children?: ReactNode;
}

export function DataProvider({ name, data, children }: DataProviderProps) {
  const existingEnv = useDataEnv() ?? {};
  if (!name) {
    return <>{children}</>;
  } else {
    return (
      <DataContext.Provider value={{ ...existingEnv, [name]: data }}>
        {children}
      </DataContext.Provider>
    );
  }
}

export interface CommonDynamicProps {
  className?: string;
  tag?: string;
  propSelectors?: SelectorDict;
}

export function DynamicElement<
  Tag extends keyof JSX.IntrinsicElements = "div"
>({
  tag = "div",
  className,
  children,
  propSelectors,
  ...props
}: CommonDynamicProps & ComponentProps<Tag>) {
  const computed = useSelectors(propSelectors);
  return createElement(tag, {
    children,
    ...props,
    ...computed,
    className: className + " " + computed.className,
  });
}

export function DynamicText({
  selector,
  propSelectors,
  ...props
}: CommonDynamicProps & {
  selector?: string;
}) {
  return (
    <DynamicElement
      {...props}
      propSelectors={{ ...propSelectors, children: selector }}
    >
      {/*This is the default text*/}
      (DynamicText requires a selector)
    </DynamicElement>
  );
}

export function DynamicImage({
  selector,
  propSelectors,
  ...props
}: CommonDynamicProps &
  ComponentProps<"img"> & {
    selector?: string;
  }) {
  return (
    <DynamicElement<"img">
      tag={"img"}
      loading={"lazy"}
      style={{
        objectFit: "cover",
      }}
      {...props}
      propSelectors={{ ...propSelectors, src: selector }}
      // Default image placeholder
      src="https://studio.plasmic.app/static/img/placeholder.png"
    />
  );
}

export interface DynamicCollectionProps extends CommonDynamicProps {
  children?: ReactNode;
  style?: CSSProperties;
  loopItemName?: string;
  keySelector?: string;
  selector?: string;
  data?: any;
}

export function DynamicCollection({
  selector,
  loopItemName,
  children,
  data,
  keySelector,
  ...props
}: DynamicCollectionProps) {
  // Defaults to an array of three items.
  const finalData = data ?? useSelector(selector) ?? [1, 2, 3];
  return (
    <DynamicElement {...props}>
      {finalData?.map?.((item: any, index: number) => (
        <DataProvider
          key={applySelector(item, keySelector) ?? index}
          name={loopItemName}
          data={item}
        >
          {repeatedElement(index === 0, children)}
        </DataProvider>
      ))}
    </DynamicElement>
  );
}

export interface DynamicCollectionGridProps extends DynamicCollectionProps {
  columns?: number;
  columnGap?: number;
  rowGap?: number;
}

export function DynamicCollectionGrid({
  columns,
  columnGap = 0,
  rowGap = 0,
  ...props
}: DynamicCollectionGridProps) {
  return (
    <DynamicCollection
      {...props}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        columnGap: `${columnGap}px`,
        rowGap: `${rowGap}px`,
      }}
    />
  );
}

const thisModule = "@plasmicpkgs/plasmic-basic-components/dist/Data";

registerComponent(DataProvider, {
  name: "DataProvider",
  importPath: thisModule,
  // description: "Makes some specified data available to the subtree in a context",
  props: {
    name: {
      type: "string",
      defaultValue: "celebrities",
      description: "The name of the variable to store the data in",
    },
    data: {
      type: "object",
      defaultValue: [
        {
          name: "Fill Murray",
          birthYear: 1950,
          profilePicture: ["https://www.fillmurray.com/200/300"],
        },
        {
          name: "Place Cage",
          birthYear: 1950,
          profilePicture: ["https://www.placecage.com/200/300"],
        },
      ],
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: "DynamicText",
          props: {
            selector: "celebrities.0.name",
          },
        },
        {
          type: "component",
          name: "DynamicImage",
          props: {
            selector: "celebrities.0.profilePicture",
          },
        },
      ],
    },
  },
});

const dynamicPropsWithoutTag = {
  propSelectors: {
    type: "object",
    // defaultValueHint: {},
    description:
      "An object whose keys are prop names and values are selector expressions. Use this to set any prop to a dynamic value.",
  },
} as const;

const dynamicProps = {
  ...dynamicPropsWithoutTag,
  tag: {
    type: "string",
    // defaultValueHint: "div",
    description: "The HTML tag to use",
  },
} as const;

// TODO Eventually we'll want to expose all the base HTML properties, but in the nicer way that we do within the studio.

registerComponent(DynamicElement, {
  name: "DynamicElement",
  importPath: thisModule,
  props: { ...dynamicProps, children: "slot" },
});

registerComponent(DynamicText, {
  name: "DynamicText",
  importPath: thisModule,
  props: {
    ...dynamicProps,
    selector: {
      type: "string",
      description:
        "The selector expression to use to get the text, such as: someVariable.0.someField",
    },
  },
});

registerComponent(DynamicImage, {
  name: "DynamicImage",
  importPath: thisModule,
  props: {
    ...dynamicPropsWithoutTag,
    selector: {
      type: "string",
      description:
        "The selector expression to use to get the image source URL, such as: someVariable.0.someField",
    },
  },
});

export const dynamicCollectionProps = {
  ...dynamicProps,
  selector: {
    type: "string",
    description:
      "The selector expression to use to get the array of data to loop over, such as: someVariable.0.someField",
  },
  loopItemName: {
    type: "string",
    defaultValue: "item",
    description:
      "The name of the variable to use to store the current item in the loop",
  },
  children: "slot",
} as const;

registerComponent(DynamicCollection, {
  name: "DynamicCollection",
  importPath: thisModule,
  props: dynamicCollectionProps,
});

export const dynamicCollectionGridProps = {
  ...dynamicCollectionProps,
  columns: {
    type: "number",
    defaultValue: 2,
    description: "The number of columns to use in the grid",
  },
  columnGap: {
    type: "number",
    defaultValue: 8,
    description: "The gap between columns",
  },
  rowGap: {
    type: "number",
    defaultValue: 8,
    description: "The gap between rows",
  },
} as const;

registerComponent(DynamicCollectionGrid, {
  name: "DynamicCollectionGrid",
  importPath: thisModule,
  props: dynamicCollectionGridProps,
});
