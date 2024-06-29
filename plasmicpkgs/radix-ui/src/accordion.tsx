import constate from "constate";
import React, { ComponentRef, ReactNode, forwardRef, useState } from "react";

import { styled } from "@linaria/react";
import {
  DataProvider,
  usePlasmicCanvasContext,
} from "@plasmicapp/loader-nextjs";
import {
  Content as AccordionContent,
  Header as AccordionHeader,
  Item as AccordionItem,
  Root as AccordionRoot,
  AccordionSingleProps,
  Trigger as AccordionTrigger,
} from "@radix-ui/react-accordion";
import { Registerable, registerComponentHelper } from "./reg-util";

const IMPORT_PATH = "@radix-ui/react-accordion";

const getPlasmicComponentName = (componentName: string) =>
  `radix-ui-${componentName}`;

const getDisplayComponentName = (componentName: string) =>
  `Radix-UI ${componentName}`;

const getComponentNameAndImportMeta = (
  componentName: string,
  parentComponentName?: string,
  opts?: {
    displayName?: string;
    importPath?: string;
  }
) => ({
  name: getPlasmicComponentName(componentName),
  displayName: opts?.displayName ?? getDisplayComponentName(componentName),
  importPath: opts?.importPath ?? IMPORT_PATH,
  importName: componentName,
  ...(parentComponentName
    ? { parentComponentName: getPlasmicComponentName(parentComponentName) }
    : {}),
});

function useAccordionData({
  defaultValue,
  previewValue,
}: {
  defaultValue?: string;
  previewValue?: string;
}) {
  const [activeValue, setActiveValue] = useState<string | undefined>(
    defaultValue
  );

  const inEditor = usePlasmicCanvasContext();

  return {
    activeValue: inEditor ? previewValue || activeValue : activeValue,
    setActiveValue,
  };
}

const [AccordionProvider, useAccordionContextUnsafe] =
  constate(useAccordionData);

function RootDataProvider({ children }: { children?: ReactNode }) {
  const { activeValue } = useAccordionContextUnsafe();

  return (
    <DataProvider name="activeValue" data={activeValue}>
      {children}
    </DataProvider>
  );
}

interface RootProps extends InternalRootProps {
  defaultValue?: string;
  previewValue?: string;
}

const Root = forwardRef<ComponentRef<typeof AccordionRoot>, RootProps>(
  (props, ref) => {
    const { previewValue, defaultValue, ...rest } = props;

    return (
      <AccordionProvider
        defaultValue={defaultValue}
        previewValue={previewValue}
      >
        <RootDataProvider>
          <InternalRoot {...rest} ref={ref} />
        </RootDataProvider>
      </AccordionProvider>
    );
  }
);

type InternalRootProps = Omit<
  AccordionSingleProps,
  "type" | "value" | "onValueChange" | "defaultValue"
>;

const InternalRoot = forwardRef<
  ComponentRef<typeof AccordionRoot>,
  InternalRootProps
>((props, ref) => {
  const { activeValue, setActiveValue } = useAccordionContextUnsafe();

  return (
    <AccordionRoot
      {...props}
      type="single"
      value={activeValue}
      onValueChange={setActiveValue}
      ref={ref}
    />
  );
});

const ItemDataProvider = ({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) => {
  const { activeValue } = useAccordionContextUnsafe();

  return (
    <DataProvider name="open" data={value === activeValue}>
      <DataProvider name="tabValue" data={value}>
        {children}
      </DataProvider>
    </DataProvider>
  );
};

const Item: typeof AccordionItem = forwardRef((props, ref) => {
  return (
    <ItemDataProvider value={props.value}>
      <AccordionItem {...props} ref={ref} />
    </ItemDataProvider>
  );
});

const Content = styled(AccordionContent)`
  overflow: hidden;

  &[data-state="open"] {
    animation: slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1);
  }

  &[data-state="closed"] {
    animation: slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1);
  }

  @keyframes slideDown {
    from {
      height: 0;
    }
    to {
      height: var(--radix-accordion-content-height);
    }
  }

  @keyframes slideUp {
    from {
      height: var(--radix-accordion-content-height);
    }
    to {
      height: 0;
    }
  }
`;

export function registerAccordion(loader?: Registerable) {
  registerComponentHelper(loader, Root, {
    ...getComponentNameAndImportMeta("Accordion"),

    styleSections: true,

    defaultStyles: {
      layout: "vbox",
    },

    providesData: true,

    props: {
      defaultValue: {
        type: "string",
        defaultValue: "tab1",
      },

      previewValue: {
        type: "string",
        description: "Show this tab while editing in Plasmic Studio",
        defaultValue: "tab1",
      },

      collapsible: {
        type: "boolean",
        defaultValue: true,
      },

      disabled: {
        type: "boolean",
        defaultValue: false,
      },

      children: {
        type: "slot",

        defaultValue: [
          {
            type: "component",
            name: getPlasmicComponentName("AccordionItem"),

            props: {
              value: "tab1",
            },
          },

          {
            type: "component",
            name: getPlasmicComponentName("AccordionItem"),

            props: {
              value: "tab2",
            },
          },
        ],
      },
    },
  });

  registerComponentHelper(loader, Item, {
    ...getComponentNameAndImportMeta("AccordionItem"),

    styleSections: true,

    defaultStyles: {
      layout: "vbox",
    },

    props: {
      value: {
        type: "string",
        required: true,
      },

      children: {
        type: "slot",

        defaultValue: [
          {
            type: "component",
            name: getPlasmicComponentName("AccordionHeader"),
          },

          {
            type: "component",
            name: getPlasmicComponentName("AccordionContent"),
          },
        ],
      },
    },
  });

  registerComponentHelper(loader, AccordionHeader, {
    ...getComponentNameAndImportMeta("AccordionHeader"),

    styleSections: true,

    providesData: true,

    props: {
      children: {
        type: "slot",

        defaultValue: [
          {
            type: "component",
            name: getPlasmicComponentName("AccordionTrigger"),
          },
        ],
      },
    },
  });

  registerComponentHelper(loader, AccordionTrigger, {
    ...getComponentNameAndImportMeta("AccordionTrigger"),

    styleSections: true,

    defaultStyles: {
      layout: "hbox",
    },

    props: {
      children: {
        type: "slot",

        defaultValue: [
          {
            type: "text",
            value: "Expand text",
          },
        ],
      },
    },
  });

  registerComponentHelper(loader, Content, {
    ...getComponentNameAndImportMeta("AccordionContent"),

    styleSections: true,

    props: {
      children: {
        type: "slot",

        defaultValue: {
          type: "text",
          value:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam fringilla porttitor risus in ullamcorper. In molestie enim sapien, non blandit libero scelerisque ut. Donec imperdiet iaculis urna sit amet accumsan. Nam neque nunc, tincidunt vitae fringilla id, hendrerit et ex.",
        },
      },
    },
  });
}
