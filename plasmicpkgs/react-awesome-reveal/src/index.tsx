import registerComponent from "@plasmicapp/host/registerComponent";
import React from "react";
import {
  Bounce,
  Fade,
  Flip,
  Hinge,
  JackInTheBox,
  Roll,
  Rotate,
  Slide,
  Zoom,
} from "react-awesome-reveal";

const effectNameToComponent = {
  bounce: Bounce,
  fade: Fade,
  flip: Flip,
  hinge: Hinge,
  jackinthebox: JackInTheBox,
  roll: Roll,
  rotate: Rotate,
  slide: Slide,
  zoom: Zoom,
} as const;

type Effect = keyof typeof effectNameToComponent;

const effects = Object.keys(effectNameToComponent);

export function Reveal({
  effect = "fade",
  className,
  ...props
}: React.ComponentProps<typeof Fade> & {
  className?: string;
  effect?: Effect;
}) {
  const Comp = effectNameToComponent[effect] as any;
  if (!Comp) {
    throw new Error(`Please specify a valid effect: ${effects.join(", ")}`);
  }
  // Rendering plain strings seems to result in an infinite loop from
  // "react-awesome-reveal" (except for when `cascading` is set).
  // So we create a wrapper `div`.
  const children =
    props.cascade ||
    !["string", "number", "boolean"].includes(typeof props.children) ? (
      props.children
    ) : (
      <div> {props.children} </div>
    );
  return <Comp {...props} children={children} />;
}

registerComponent(Reveal, {
  name: "Reveal",
  importPath: "@plasmicpkgs/react-awesome-reveal",
  props: {
    // `big` seems not to be working properly as of `react-awesome-reveal@3.8.1`
    /* big: {
      type: "boolean",
      displayName: "Big",
      description: `Causes the animation to start farther. Only applied to "fade" Effect and "down", "left", "right" and "up" directions`,
    }, */
    cascade: {
      type: "boolean",
      displayName: "Cascade",
      description: "Stagger its children animations",
    },
    children: {
      type: "slot",
      defaultValue: "Reveal text",
    },
    // Keeping only basic props for now
    /* damping: {
      type: "number",
      displayName: "Damping",
      description:
        "Factor that affects the delay that each animated element in a cascade animation will be assigned (defaults to 0.5)",
    }, */
    delay: {
      type: "number",
      displayName: "Delay",
      description: "Initial delay, in milliseconds",
    },
    direction: {
      type: "choice",
      options: [
        "horizontal",
        "vertical",
        "bottom-left",
        "bottom-right",
        "down",
        "left",
        "right",
        "top-left",
        "top-right",
        "up",
      ],
      displayName: "Direction",
      description:
        "Origin of the animation (the valid values depend on the chosen Effect)",
    },
    duration: {
      type: "number",
      displayName: "Duration",
      description: "Animation duration, in milliseconds (defaults to 1000)",
    },
    effect: {
      type: "choice",
      options: effects.map((v) => v),
      displayName: "Effect",
      description: "The Reveal animation effect to be applied",
    },
    // `fraction` seems not to be working properly as of `react-awesome-reveal@3.8.1`
    /* fraction: {
      type: "number",
      displayName: "Fraction",
      description:
        "Float number between 0 and 1 indicating how much the element should be in viewport before the animation is triggered",
    }, */
    reverse: {
      type: "boolean",
      displayName: "Reverse",
      description: `Whether the animation should make element(s) disappear. Not applied to "hinge" and "jackinthebox" effects`,
    },
    triggerOnce: {
      type: "boolean",
      displayName: "Trigger Once",
      description:
        "Whether the animation should run only once, instead of everytime the element enters, exits and re-enters the viewport",
    },
  },
});
