import {
  DataProviderProps,
  SelectorDict,
  DataProvider as _DataProvider,
  applySelector as _applySelector,
  useDataEnv as _useDataEnv,
  useSelector as _useSelector,
  useSelectors as _useSelectors,
  repeatedElement,
} from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { ComponentProps, ReactNode, createElement } from "react";

const thisModule = "@plasmicpkgs/plasmic-basic-components";

/**
 * @deprecated This should be imported from @plasmicapp/host instead.
 */
export const applySelector: typeof _applySelector = function (...args) {
  console.warn(
    "DEPRECATED: Import applySelector from @plasmicapp/host instead."
  );
  return _applySelector(...args);
};

/**
 * @deprecated This should be imported from @plasmicapp/host instead.
 */
export const useSelector: typeof _useSelector = function (...args) {
  console.warn("DEPRECATED: Import useSelector from @plasmicapp/host instead.");
  return _useSelector(...args);
};

/**
 * @deprecated This should be imported from @plasmicapp/host instead.
 */
export const useSelectors: typeof _useSelectors = function (...args) {
  console.warn(
    "DEPRECATED: Import useSelectors from @plasmicapp/host instead."
  );
  return _useSelectors(...args);
};

/**
 * @deprecated This should be imported from @plasmicapp/host instead.
 */
export const useDataEnv: typeof _useDataEnv = function (...args) {
  console.warn("DEPRECATED: Import useDataEnv from @plasmicapp/host instead.");
  return _useDataEnv(...args);
};

export const DataProvider: typeof _DataProvider = function (...args) {
  return _DataProvider(...args);
};

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
  const computed = _useSelectors(propSelectors);
  return createElement(tag, {
    children,
    ...props,
    ...computed,
    className: className + " " + computed.className,
  });
}

export interface DynamicTextProps extends CommonDynamicProps {
  selector?: string;
}

export function DynamicText({
  selector,
  propSelectors,
  ...props
}: DynamicTextProps) {
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

export interface DynamicImageProps
  extends CommonDynamicProps,
    ComponentProps<"img"> {
  selector?: string;
}

export function DynamicImage({
  selector,
  propSelectors,
  ...props
}: DynamicImageProps) {
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

export interface DynamicRepeaterProps {
  children?: ReactNode;
  loopItemName?: string;
  keySelector?: string;
  selector?: string;
  data?: any;
}

export function DynamicRepeater({
  children,
  loopItemName,
  keySelector,
  selector,
  data,
}: DynamicRepeaterProps) {
  // Defaults to an array of three items.
  const finalData = data ?? _useSelector(selector) ?? [1, 2, 3];
  return (
    <>
      {finalData?.map?.((item: any, index: number) => (
        <_DataProvider
          key={_applySelector(item, keySelector) ?? index}
          name={loopItemName}
          data={item}
        >
          {repeatedElement(index, children)}
        </_DataProvider>
      ))}
    </>
  );
}

export const dynamicRepeaterProps = {
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
  children: {
    type: "slot",
    isRepeated: true,
  },
} as const;

export const dynamicRepeaterMeta: CodeComponentMeta<DynamicRepeaterProps> = {
  name: "hostless-dynamic-repeater",
  displayName: "Dynamic Repeater",
  importName: "DynamicRepeater",
  importPath: thisModule,
  props: dynamicRepeaterProps,
};

export function registerDynamicRepeater(
  loader?: { registerComponent: typeof registerComponent },
  customDynamicRepeaterMeta?: CodeComponentMeta<DynamicRepeaterProps>
) {
  if (loader) {
    loader.registerComponent(
      DynamicRepeater,
      customDynamicRepeaterMeta ?? dynamicRepeaterMeta
    );
  } else {
    registerComponent(
      DynamicRepeater,
      customDynamicRepeaterMeta ?? dynamicRepeaterMeta
    );
  }
}

export const dataProviderMeta: CodeComponentMeta<DataProviderProps> = {
  name: "hostless-data-provider",
  displayName: "Data Provider",
  importName: "DataProvider",
  importPath: thisModule,
  providesData: true,
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
    },
  },
};

export function registerDataProvider(
  loader?: { registerComponent: typeof registerComponent },
  customDataProviderMeta?: CodeComponentMeta<DataProviderProps>
) {
  if (loader) {
    loader.registerComponent(
      _DataProvider,
      customDataProviderMeta ?? dataProviderMeta
    );
  } else {
    registerComponent(
      _DataProvider,
      customDataProviderMeta ?? dataProviderMeta
    );
  }
}

const dynamicPropsWithoutTag = {
  propSelectors: {
    type: "object",
    defaultValueHint: {},
    description:
      "An object whose keys are prop names and values are selector expressions. Use this to set any prop to a dynamic value.",
  },
} as const;

const dynamicProps = {
  ...dynamicPropsWithoutTag,
  tag: {
    type: "string",
    defaultValueHint: "div",
    description: "The HTML tag to use",
  },
} as const;

// TODO Eventually we'll want to expose all the base HTML properties, but in the nicer way that we do within the studio.

export const dynamicElementMeta: CodeComponentMeta<CommonDynamicProps> = {
  name: "hostless-dynamic-element",
  displayName: "Dynamic Element",
  importName: "DynamicElement",
  importPath: thisModule,
  props: { ...dynamicProps, children: "slot" },
};

export function registerDynamicElement(
  loader?: { registerComponent: typeof registerComponent },
  customDynamicElementMeta?: CodeComponentMeta<CommonDynamicProps>
) {
  if (loader) {
    loader.registerComponent(
      DynamicElement,
      customDynamicElementMeta ?? dynamicElementMeta
    );
  } else {
    registerComponent(
      DynamicElement,
      customDynamicElementMeta ?? dynamicElementMeta
    );
  }
}

export const dynamicTextMeta: CodeComponentMeta<DynamicTextProps> = {
  name: "hostless-dynamic-text",
  importName: "DynamicText",
  displayName: "Dynamic Text",
  importPath: thisModule,
  props: {
    ...dynamicProps,
    selector: {
      type: "string",
      description:
        "The selector expression to use to get the text, such as: someVariable.0.someField",
    },
  },
};

export function registerDynamicText(
  loader?: { registerComponent: typeof registerComponent },
  customDynamicTextMeta?: CodeComponentMeta<DynamicTextProps>
) {
  if (loader) {
    loader.registerComponent(
      DynamicText,
      customDynamicTextMeta ?? dynamicTextMeta
    );
  } else {
    registerComponent(DynamicText, customDynamicTextMeta ?? dynamicTextMeta);
  }
}

export const dynamicImageMeta: CodeComponentMeta<DynamicImageProps> = {
  name: "hostless-dynamic-image",
  displayName: "Dynamic Image",
  importName: "DynamicImage",
  importPath: thisModule,
  props: {
    ...dynamicPropsWithoutTag,
    selector: {
      type: "string",
      description:
        "The selector expression to use to get the image source URL, such as: someVariable.0.someField",
    },
  },
};

export function registerDynamicImage(
  loader?: { registerComponent: typeof registerComponent },
  customDynamicImageMeta?: CodeComponentMeta<DynamicImageProps>
) {
  if (loader) {
    loader.registerComponent(
      DynamicImage,
      customDynamicImageMeta ?? dynamicImageMeta
    );
  } else {
    registerComponent(DynamicImage, customDynamicImageMeta ?? dynamicImageMeta);
  }
}
