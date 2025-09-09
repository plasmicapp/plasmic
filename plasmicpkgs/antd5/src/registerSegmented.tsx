import type { PlasmicElement } from "@plasmicapp/host";
import { ActionProps } from "@plasmicapp/host/registerComponent";
import { Segmented } from "antd";
import React, { ReactElement, useMemo } from "react";
import {
  Registerable,
  registerComponentHelper,
  traverseReactEltTree,
} from "./utils";

export type AntdSegmentedOptionProps = {
  value: string;
  children: React.ReactNode;
};

export type AntdSegmentedProps = Omit<
  React.ComponentProps<typeof Segmented>,
  "options"
> & {
  options?: { label: string; value: string }[];
  optionsSlot?: ReactElement; // options with more than just text
  useSlotOptions: boolean;
};

export function AntdSegmented(props: AntdSegmentedProps) {
  const {
    optionsSlot,
    options: optionLabelObjs,
    useSlotOptions,
    ...rest
  } = props;

  const options = useMemo(() => {
    // segment labels with text and more
    if (useSlotOptions) {
      const optionElts =
        (optionsSlot?.type as any)?.name == AntdSegmentedOption.name
          ? [optionsSlot]
          : optionsSlot?.props.children;
      return optionElts
        ?.filter(
          (el: any) =>
            React.isValidElement(el) &&
            (el.type as any)?.name === AntdSegmentedOption.name
        )
        .map((el: ReactElement<AntdSegmentedOptionProps>) => ({
          value: el.props.value,
          label: <>{el.props.children}</>,
        }));
    }

    // segment labels with text only
    return optionLabelObjs?.filter((l) => l.label && l.value) || [];
  }, [optionsSlot, useSlotOptions, optionLabelObjs]);

  return <Segmented options={options} {...rest} />;
}
export function AntdSegmentedOption(props: AntdSegmentedOptionProps) {
  return <>{props.children}</>;
}

function OutlineMessage() {
  return <div>* To re-arrange options, use the Outline panel</div>;
}

function getValueOptions(props: AntdSegmentedProps) {
  if (props.useSlotOptions) {
    const res = new Set<string>();
    traverseReactEltTree(props.optionsSlot, (elt) => {
      if (elt?.type === AntdSegmentedOption && elt.props?.value) {
        res.add(elt.props?.value);
      }
    });
    return Array.from(res.keys());
  } else {
    return (
      props.options?.filter((l) => l.label && l.value).map((l) => l.value) || []
    );
  }
}

function getDefaultSlotOption(key: number | string): PlasmicElement {
  return {
    type: "component",
    name: segmentedOptionComponentName,
    props: {
      value: `Option ${key}`,
      children: {
        type: "hbox",
        styles: {
          columnGap: "5px",
          justifyContent: "center",
        },
        children: [
          {
            type: "img",
            styles: {
              opacity: 0.5,
              objectFit: "contain",
            },
            src: "https://static1.plasmic.app/home-outlined.svg",
          },
          {
            type: "text",
            value: `Option ${key}`,
            styles: {
              width: "auto",
            },
          },
        ],
      },
    },
  };
}

export const segmentedComponentName = "plasmic-antd5-segmented";
export const segmentedOptionComponentName = "plasmic-antd5-segmented-option";

export function registerSegmented(loader?: Registerable) {
  registerComponentHelper(loader, AntdSegmentedOption, {
    name: segmentedOptionComponentName,
    displayName: "Segmented Option",
    props: {
      value: {
        type: "string",
        displayName: "Name",
        description: "Name of the segment",
      },
      children: {
        type: "slot",
        hidePlaceholder: true,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerSegmented",
    importName: "AntdSegmentedOption",
    parentComponentName: segmentedComponentName,
  });

  registerComponentHelper(loader, AntdSegmented, {
    name: segmentedComponentName,
    displayName: "Segmented",
    props: {
      size: {
        type: "choice",
        defaultValueHint: "middle",
        description: `Set the size of segments`,
        options: ["large", "middle", "small"],
      },
      value: {
        editOnly: true,
        uncontrolledProp: "defaultValue",
        type: "choice",
        options: getValueOptions,
        displayName: "Selected option",
        description: `Default selected option`,
        hidden: (ps: AntdSegmentedProps) => !ps.options,
      },
      disabled: {
        type: "boolean",
        defaultValueHint: false,
        description: `Disable all segments`,
      },
      block: {
        type: "boolean",
        displayName: "Fill spacing",
        defaultValueHint: false,
        description: `Fill the container element, with all segments equally spaced`,
      },
      useSlotOptions: {
        type: "boolean",
        defaultValue: false,
        advanced: true,
        description: "Add icons, avatars, images, and more in option labels",
      },
      options: {
        type: "array",
        hidden: (ps: AntdSegmentedProps) => ps.useSlotOptions,
        validator: (value: any[], ps: any) => {
          if (ps.useSlotOptions) {
            return true;
          }
          const badOptions = value
            .map((v, i) => (!v.value || !v.label ? i + 1 : undefined))
            .filter((i) => i);
          if (badOptions.length > 0) {
            return `Options at position ${badOptions.join(
              ", "
            )} are missing label or value`;
          }
          return true;
        },
        itemType: {
          type: "object",
          nameFunc: (item: any) => item.label,
          fields: {
            label: {
              type: "string",
              required: true,
            },
            value: {
              type: "string",
              required: true,
            },
          },
        },
        defaultValue: [
          {
            label: "Option 1",
            value: "Option 1",
          },
          {
            label: "Option 2",
            value: "Option 2",
          },
          {
            label: "Option 3",
            value: "Option 3",
          },
        ],
      },
      optionsSlot: {
        type: "slot",
        displayName: "Options",
        allowedComponents: [segmentedOptionComponentName],
        hidden: (ps: AntdSegmentedProps) => !ps.useSlotOptions,
        defaultValue: [getDefaultSlotOption(1), getDefaultSlotOption(2)],
      },
      onChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "value", type: "string" }],
      },
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
      },
    },
    actions: [
      {
        type: "button-action",
        label: "Add new option",
        hidden: (ps) => !ps.useSlotOptions,
        onClick: ({ componentProps, studioOps }: ActionProps<any>) => {
          // Get the first positive integer that isn't already a key
          const generateNewKey = () => {
            const existingValues = new Set<string>();
            traverseReactEltTree(componentProps.optionsSlot, (elt) => {
              if (elt?.type === AntdSegmentedOption && elt?.props?.value) {
                existingValues.add(elt.props.value);
              }
            });

            for (
              let keyCandidate = 1;
              keyCandidate <= existingValues.size + 1;
              keyCandidate++
            ) {
              const strKey = keyCandidate.toString();
              if (
                !existingValues.has(strKey) &&
                !existingValues.has(`Option ${strKey}`)
              ) {
                return strKey;
              }
            }

            return undefined;
          };

          const newKey = generateNewKey();
          if (!newKey) {
            return;
          }
          studioOps.appendToSlot(getDefaultSlotOption(newKey), "optionsSlot");
        },
      },
      {
        type: "button-action",
        hidden: (ps) => !ps.value || !ps.useSlotOptions,
        label: "Delete current option",
        onClick: ({ componentProps, studioOps }: ActionProps<any>) => {
          const options: string[] = [];
          traverseReactEltTree(componentProps.optionsSlot, (elt) => {
            if (elt?.type === AntdSegmentedOption && elt?.props?.value) {
              options.push(elt.props.value);
            }
          });

          const value = componentProps.value;
          const currPos = options.findIndex((opt) => {
            return opt === value;
          });

          if (currPos !== -1) {
            studioOps.removeFromSlotAt(currPos, "optionsSlot");
            if (options.length - 1 > 0) {
              const prevPos = (currPos - 1 + options.length) % options.length;
              studioOps.updateProps({ value: options[prevPos] });
            }
          }
        },
      },

      {
        type: "custom-action",
        hidden: (ps) => !ps.useSlotOptions,
        control: OutlineMessage,
      },
    ],
    importPath: "@plasmicpkgs/antd5/skinny/registerSegmented",
    importName: "AntdSegmented",
  });
}
