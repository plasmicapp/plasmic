import {
  DefaultNewComponentSectionProps,
  PlasmicNewComponentSection,
} from "@/wab/client/plasmic/plasmic_kit_new_component/PlasmicNewComponentSection";
import * as React from "react";

interface NewComponentSectionProps
  extends Omit<DefaultNewComponentSectionProps, "hideTitle"> {}

function NewComponentSection(props: NewComponentSectionProps) {
  return <PlasmicNewComponentSection hideTitle={!props.title} {...props} />;
}

export default NewComponentSection;
