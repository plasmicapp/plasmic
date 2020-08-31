import { PlumeSelectProps, PlumeSelectRef, useSelect } from '@plasmicapp/plume';
import * as React from 'react';
import { PlasmicSelect } from './plasmic/plain_kit/PlasmicSelect';
import SelectOption from './SelectOption';
interface SelectProps<T> extends PlumeSelectProps<T> {
}

function Select_<T extends object>(props: SelectProps<T>, ref: PlumeSelectRef) {
  const {plumeProps} = useSelect<T, SelectProps<T>, ReturnType<typeof PlasmicSelect.createRenderer>>(
    PlasmicSelect,
    props,
    {
      isOpenVariant: ["isOpen", "isOpen"],
      placeholderVariant: ["placeholder", "placeholder"],
      isDisabledVariant: ["isDisabled", "isDisabled"],
      hasLabelVariant: ["hasLabel", "hasLabel"],

      triggerContentSlot: "triggerContent",
      optionsSlot: "options",

      root: "root",
      trigger: "trigger",
      overlayContainer: "overlay",
      optionsContainer: "optionsContainer",
      label: "labelContainer",

      renderOption: (key, content) => <SelectOption itemKey={key}>{content}</SelectOption>
    },
    ref
  );
  return <PlasmicSelect {...plumeProps} />;
};

export const SelectUnknown = React.forwardRef(Select_);
const Select = React.forwardRef(Select_) as <T>(props: SelectProps<T> & {ref?: PlumeSelectRef}) => React.ReactElement|null;

export default Select;
