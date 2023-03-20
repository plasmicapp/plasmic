import * as React from "react";
import { PlasmicButton } from "./plasmic/create_plasmic_app/PlasmicButton";

function Button_(props, ref) {
  const { plasmicProps } = PlasmicButton.useBehavior(props, ref);
  return <PlasmicButton {...plasmicProps} />;
}

const Button = React.forwardRef(Button_);

export default Object.assign(Button, {
  __plumeType: "button"
});
