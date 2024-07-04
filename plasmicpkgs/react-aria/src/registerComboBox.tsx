import { useFilter } from "@react-aria/i18n";
import React from "react";
import { ComboBox, ComboBoxStateContext, Key } from "react-aria-components";
import { PlasmicInputContext, PlasmicListBoxContext } from "./contexts";
import {
  flattenOptions,
  HasOptions,
  makeOptionsPropType,
  makeValuePropType,
  StrictItemType,
  StrictOptionType,
  useStrictOptions,
} from "./option-utils";
import {
  extractPlasmicDataProps,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  Styleable,
  withoutNils,
} from "./utils";

export interface BaseComboBoxProps<T extends object>
  extends HasOptions<T>,
    Styleable {
  placeholder?: string;
  isDisabled?: boolean;
  menuTrigger?: React.ComponentProps<typeof ComboBox>["menuTrigger"];

  valueType?: "value" | "text";
  allowsCustomValue?: boolean;

  value?: Key;
  onChange?: (value: Key) => void;

  filterValue?: string;
  onFilterValueChange?: (value: string) => void;

  previewOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  structure?: React.ReactNode;

  name?: string;
}

export function BaseComboBox<T extends object>(props: BaseComboBoxProps<T>) {
  const {
    value,
    onChange,
    menuTrigger,
    filterValue,
    onFilterValueChange,
    valueType,
    allowsCustomValue,
    placeholder,
    previewOpen,
    onOpenChange,
    isDisabled,
    className,
    style,
    structure,
    name,
  } = props;
  const { options, optionText } = useStrictOptions(props);
  const { contains } = useFilter({ sensitivity: "base" });
  const [showAllOptions, setShowAllOptions] = React.useState(false);

  const filteredOptions = React.useMemo(() => {
    if (!filterValue || filterValue.trim().length === 0) {
      return options;
    }
    if (!options) {
      return options;
    }
    const filterOptions = (
      opts: StrictOptionType[]
    ): StrictOptionType[] | undefined => {
      return withoutNils(
        opts.map((op) => {
          if (op.type === "option-group") {
            return {
              ...op,
              items: op.items
                ? (filterOptions(op.items) as StrictItemType[])
                : undefined,
            };
          } else {
            if (contains(optionText(op), filterValue)) {
              return op;
            } else {
              return undefined;
            }
          }
        })
      );
    };
    return filterOptions(options);
  }, [filterValue, options, contains, optionText]);

  const flattenedOptions = React.useMemo(
    () => flattenOptions(options),
    [options]
  );

  const disabledKeys = flattenedOptions
    .filter((op) => op.isDisabled)
    .map((op) => op.id);

  const onSelectionChange = React.useCallback(
    (key: Key | null) => {
      if (key === null) {
        return;
      }

      const selectedOption = flattenedOptions?.find((op) => op.id === key);
      if (valueType === "text") {
        if (selectedOption) {
          onChange?.(optionText(selectedOption));
        }
      } else {
        onChange?.(key);
      }
      if (selectedOption) {
        onFilterValueChange?.(optionText(selectedOption));
      }
    },
    [flattenedOptions, valueType, onChange, optionText, onFilterValueChange]
  );

  const onInputValueChange = React.useCallback(
    (newValue: string) => {
      onFilterValueChange?.(newValue);
      setShowAllOptions(false);
      if (valueType === "text") {
        if (allowsCustomValue) {
          onChange?.(newValue);
        } else {
          const matchingOption = flattenedOptions?.find(
            (op) => optionText(op) === newValue
          );
          if (matchingOption) {
            onChange?.(optionText(matchingOption));
          }
        }
      }
    },
    [
      onFilterValueChange,
      onChange,
      flattenedOptions,
      optionText,
      valueType,
      allowsCustomValue,
    ]
  );

  const onBlur = React.useCallback(() => {
    // If we don't allow custom value, then on blur, reset the filter value
    // to the selected option
    if (!allowsCustomValue) {
      const selectedOption = flattenedOptions?.find((op) =>
        valueType === "text" ? optionText(op) === value : op.id === value
      );
      if (selectedOption) {
        const selectedOptionText = optionText(selectedOption);
        if (selectedOptionText !== filterValue) {
          onFilterValueChange?.(selectedOptionText);
        }
      }
    }
  }, [
    allowsCustomValue,
    flattenedOptions,
    valueType,
    optionText,
    value,
    filterValue,
    onFilterValueChange,
  ]);

  return (
    <ComboBox
      selectedKey={value}
      onSelectionChange={onSelectionChange}
      isDisabled={isDisabled}
      className={className}
      style={style}
      items={showAllOptions ? options : filteredOptions}
      menuTrigger={menuTrigger}
      inputValue={filterValue}
      onInputChange={onInputValueChange}
      allowsCustomValue={allowsCustomValue}
      disabledKeys={disabledKeys}
      onOpenChange={(isOpen, trigger) => {
        if (isOpen && trigger === "manual") {
          setShowAllOptions(true);
        } else {
          setShowAllOptions(false);
        }
        onOpenChange?.(isOpen);
      }}
      onBlur={onBlur}
      formValue={valueType === "text" ? "text" : "key"}
      name={name}
      {...extractPlasmicDataProps(props)}
    >
      <PlasmicListBoxContext.Provider
        value={{
          getItemType: (option) =>
            option.type === "section" ? "section" : "item",
        }}
      >
        <PlasmicInputContext.Provider value={{ placeholder }}>
          {structure}
        </PlasmicInputContext.Provider>
      </PlasmicListBoxContext.Provider>
      <BaseComboBoxEffects previewOpen={previewOpen} />
    </ComboBox>
  );
}

function BaseComboBoxEffects(
  props: Pick<BaseComboBoxProps<any>, "previewOpen">
) {
  const { previewOpen } = props;
  const comboBoxState = React.useContext(ComboBoxStateContext);

  const prevPreviewOpenRef = React.useRef(previewOpen);
  React.useEffect(() => {
    // comboBoxState can be undefined if we are in `<Hidden/>`
    if (comboBoxState) {
      // There's no "isOpen" controlled state for ComboBox, so we use
      // sync comboBoxState with previewOpen prop instead
      if (previewOpen) {
        comboBoxState.open(undefined, "manual");
      } else if (prevPreviewOpenRef.current) {
        // Was previously previewOpen, now preview close
        comboBoxState.close();
      }
    }
    prevPreviewOpenRef.current = previewOpen;
  }, [previewOpen, comboBoxState, prevPreviewOpenRef]);

  return null;
}

export function registerComboBox(loader?: Registerable) {
  const rootName = makeComponentName("combobox");

  registerComponentHelper(loader, BaseComboBox, {
    name: rootName,
    displayName: "Aria ComboBox",
    importPath: "@plasmicpkgs/react-aria/skinny/registerComboBox",
    importName: "BaseComboBox",
    props: {
      options: makeOptionsPropType(),
      value: makeValuePropType(),
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "string" }],
      },
      filterValue: {
        type: "string",
      },
      onFilterValueChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "string" }],
      },
      isDisabled: {
        type: "boolean",
      },
      valueType: {
        displayName: "`value` Type",
        type: "choice",
        options: [
          { value: "value", label: "By option value" },
          { value: "text", label: "By option text" },
        ],
        defaultValueHint: "value",
        description:
          "This controls whether `value` and `onChange` are option values or option text.  Choosing `text` allows you to optionally allow a custom value that's not in the provided list of options.",
        advanced: true,
      },
      allowsCustomValue: {
        type: "boolean",
        displayName: "Allows custom value?",
        description: "Allows entering a value that is not one of the options",
        hidden: (ps) => ps.valueType !== "text",
        advanced: true,
      },
      onOpenChange: {
        type: "eventHandler",
        argTypes: [{ name: "isOpen", type: "boolean" }],
      },
      structure: {
        type: "slot",
      },
      previewOpen: {
        type: "boolean",
        displayName: "Preview opened?",
        description: "Preview opened state while designing in Plasmic editor",
        editOnly: true,
      },
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
      },
      filterValue: {
        type: "writable",
        valueProp: "filterValue",
        onChangeProp: "onFilterValueChange",
        variableType: "text",
      },
      isOpen: {
        type: "readonly",
        onChangeProp: "onOpenChange",
        variableType: "boolean",
      },
    },
  });
}
