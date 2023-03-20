import * as React from "react";
import {
  PlasmicButton,
  DefaultButtonProps
} from "./plasmic/create_plasmic_app/PlasmicButton";
import {
  ButtonRef,
  HtmlAnchorOnlyProps,
  HtmlButtonOnlyProps
} from "@plasmicapp/react-web";

interface ButtonProps extends DefaultButtonProps {
  // Feel free to add any additional props that this component should receive
}
function Button_(props: ButtonProps, ref: ButtonRef) {
  const { plasmicProps } = PlasmicButton.useBehavior<ButtonProps>(props, ref);
  return <PlasmicButton {...plasmicProps} />;
}

type ButtonComponentType = {
  (
    props: Omit<ButtonProps, HtmlAnchorOnlyProps> & {
      ref?: React.Ref<HTMLButtonElement>;
    }
  ): React.ReactElement;
  (
    props: Omit<ButtonProps, HtmlButtonOnlyProps> & {
      ref?: React.Ref<HTMLAnchorElement>;
    }
  ): React.ReactElement;
};
const Button = React.forwardRef(Button_) as any as ButtonComponentType;

export default Object.assign(Button, {
  __plumeType: "button"
});
