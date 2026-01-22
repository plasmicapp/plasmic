import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
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

export interface RevealProps extends React.ComponentProps<typeof Fade> {
  className?: string;
  effect?: Effect;
  children?: React.ReactNode;
}

export function Reveal({ effect = "fade", className, ...props }: RevealProps) {
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
  return <Comp className={className} {...props} children={children} />;
}

export const revealMeta: CodeComponentMeta<RevealProps> = {
  name: "hostless-reveal",
  importName: "Reveal",
  displayName: "Reveal",
  importPath: "@plasmicpkgs/react-awesome-reveal",
  isAttachment: true,
  props: {
    big: {
      type: "boolean",
      displayName: "Big",
      description: `Causes the animation to start farther`,
      hidden: (props) =>
        (props.effect || "fade") !== "fade" ||
        !["down", "left", "up", "right"].includes(props.direction as string),
    },
    cascade: {
      type: "boolean",
      displayName: "Cascade",
      description: "Stagger its children animations",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "img",
          src: "https://placekitten.com/300/200",
        },
      ],
    },
    damping: {
      type: "number",
      displayName: "Damping",
      description:
        "Factor that affects the delay that each animated element in a cascade animation will be assigned",
      defaultValueHint: 0.5,
    },
    delay: {
      type: "number",
      displayName: "Delay",
      description: "Initial delay, in milliseconds",
      defaultValueHint: 0,
    },
    direction: {
      type: "choice",
      options: (props) => {
        const effect = props.effect || "fade";
        const maybeAddOptions = (effects_: Effect[], options: string[]) =>
          effects_.includes(effect) ? options : [];
        return ([] as string[])
          .concat(maybeAddOptions(["flip"], ["horizontal", "vertical"]))
          .concat(
            maybeAddOptions(
              ["bounce", "fade", "slide", "zoom"],
              ["down", "left", "right", "up"]
            )
          )
          .concat(
            maybeAddOptions(
              ["fade", "rotate"],
              ["bottom-left", "bottom-right", "top-left", "top-right"]
            )
          );
      },
      hidden: (props) => {
        const effect = props.effect || "fade";
        return ["hinge", "jackinthebox", "roll"].includes(effect);
      },
      displayName: "Direction",
      description:
        "Origin of the animation (the valid values depend on the chosen Effect)",
    },
    duration: {
      type: "number",
      displayName: "Duration",
      description: "Animation duration, in milliseconds",
      defaultValueHint: 1000,
    },
    effect: {
      type: "choice",
      options: effects.map((v) => v),
      displayName: "Effect",
      description: "The Reveal animation effect to be applied",
      defaultValueHint: "fade",
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
      description: `Whether the animation should make element(s) disappear`,
      hidden: (props) =>
        ["hinge", "jackinthebox"].includes(props.effect || "fade"),
    },
    triggerOnce: {
      type: "boolean",
      displayName: "Trigger Once",
      description:
        "Whether the animation should run only once, instead of everytime the element enters, exits and re-enters the viewport",
      // Some effects don't work correctly when `false`
      defaultValue: true,
    },
  },
};

export function registerReveal(
  loader?: { registerComponent: typeof registerComponent },
  customRevealMeta?: CodeComponentMeta<RevealProps>
) {
  if (loader) {
    loader.registerComponent(Reveal, customRevealMeta ?? revealMeta);
  } else {
    registerComponent(Reveal, customRevealMeta ?? revealMeta);
  }
}
