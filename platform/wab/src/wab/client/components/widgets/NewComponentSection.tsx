import * as React from "react";
import {
  DefaultNewComponentSectionProps,
  PlasmicNewComponentSection,
} from "../../plasmic/plasmic_kit_new_component/PlasmicNewComponentSection";

interface NewComponentSectionProps
  extends Omit<DefaultNewComponentSectionProps, "hideTitle"> {}

function NewComponentSection(props: NewComponentSectionProps) {
  return <PlasmicNewComponentSection hideTitle={!props.title} {...props} />;
}

export default NewComponentSection;
