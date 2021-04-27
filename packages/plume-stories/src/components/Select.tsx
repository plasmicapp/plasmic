import * as React from "react";
import {
  PlasmicSelect,
  DefaultSelectProps
} from "./plasmic/plume_main/PlasmicSelect";
import { SelectRef, SelectItemType } from "@plasmicapp/react-web";
import Option from "./Select__Option";

interface SelectProps<T extends SelectItemType> extends DefaultSelectProps<T> {}

function Select_<T extends SelectItemType>(
  props: SelectProps<T>,
  ref: SelectRef
) {
  const { plasmicProps, state } = PlasmicSelect.useBehavior<T, SelectProps<T>>(
    props,
    ref
  );
  return <PlasmicSelect {...plasmicProps} />;
}

const Select = React.forwardRef(Select_) as <T extends SelectItemType>(
  props: SelectProps<T> & { ref?: SelectRef }
) => React.ReactElement | null;

export default Object.assign(Select, {
  Option
});
