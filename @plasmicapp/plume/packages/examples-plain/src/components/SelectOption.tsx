import { PlumeSelectOptionProps, PlumeSelectOptionRef, useSelectOption } from '@plasmicapp/plume';
import * as React from 'react';
import { PlasmicSelectOption } from './plasmic/plain_kit/PlasmicSelectOption';

interface SelectOptionProps extends PlumeSelectOptionProps {}

const SelectOption = React.forwardRef(function SelectOption(props: SelectOptionProps, ref: PlumeSelectOptionRef) {
  const {plumeProps} = useSelectOption(
    PlasmicSelectOption,
    props,
    {
      isSelectedVariant: ["isSelected", "isSelected"],
      isDisabledVariant: ["isDisabled", "isDisabled"],
      root: "root",
      contentSlot: "children"
    },
    ref
  );
  return <PlasmicSelectOption {...plumeProps} />;
});

export default SelectOption;
