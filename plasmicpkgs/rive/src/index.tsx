import { usePlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import {
  Layout,
  RiveProps,
  StateMachineInputType,
  useRive,
} from "@rive-app/react-canvas";
import React from "react";

type RiveComponentProps = RiveProps & {
  className: string;
  autoplay: boolean;
  studioAutoplay: boolean;
  onStateChange?: (event: any) => void;
};

interface RiveInputs {
  setBoolean(name: string, value: boolean): void;
  setNumber(name: string, value: number): void;
  fire(name: string): void;
}

const RivePlayer = React.forwardRef<RiveInputs, RiveComponentProps>(
  ({ layout, className, onStateChange, stateMachines, ...props }, ref) => {
    const inEditor = usePlasmicCanvasContext();

    const riveParams = React.useMemo(() => {
      const riveLayout = layout
        ? new Layout({
            fit: layout.fit,
            alignment: layout.alignment,
            minX: layout.minX,
            minY: layout.minY,
            maxX: layout.maxX,
            maxY: layout.maxY,
          })
        : undefined;

      return {
        src: props.src,
        artboard: props.artboard,
        animations: props.animations,
        stateMachines,
        layout: riveLayout,
        autoplay: inEditor ? props.studioAutoplay : props.autoplay,
        onStateChange: (event: any) => {
          if (onStateChange) {
            onStateChange(event);
          }
        },
      };
    }, [
      props.src,
      props.artboard,
      props.animations,
      props.autoplay,
      props.studioAutoplay,
      layout,
      stateMachines,
      inEditor,
      onStateChange,
    ]);

    const { rive, RiveComponent } = useRive(riveParams);

    React.useImperativeHandle(
      ref,
      () => {
        function setInput(
          inputType: StateMachineInputType,
          inputName: string,
          value: any = null,
          stateMachine: string | null = null
        ) {
          const inputs = rive?.stateMachineInputs(
            stateMachine || (stateMachines as string)
          );
          (inputs || []).forEach((i: any) => {
            if (i.type !== inputType) {
              console.warn(
                `PlasmicRive: Input type mismatch: expected ${inputType}, got ${i.type}`
              );
            }
            if (i.name === inputName) {
              switch (inputType) {
                case StateMachineInputType.Trigger:
                  i.fire();
                  break;
                case StateMachineInputType.Number:
                case StateMachineInputType.Boolean:
                  i.value = value;
                  break;
              }
            }
          });
        }

        return {
          setBoolean(name: string, value: boolean, stateMachine?: string) {
            setInput(StateMachineInputType.Boolean, name, value, stateMachine);
          },
          setNumber(name: string, value: number, stateMachine?: string) {
            setInput(StateMachineInputType.Number, name, value, stateMachine);
          },
          fire(name: string, stateMachine?: string) {
            setInput(StateMachineInputType.Trigger, name, null, stateMachine);
          },
          play(animationName: string) {
            rive?.play(animationName);
          },
          pause(animationName: string) {
            rive?.pause(animationName);
          },
        };
      },
      [rive]
    );

    // In Plasmic Studio, force a remount by changing the key when any relevant prop changes
    const studioKey = React.useMemo(
      () =>
        inEditor
          ? [
              props.src,
              props.artboard,
              props.animations,
              props.autoplay,
              props.studioAutoplay,
              JSON.stringify(layout),
              stateMachines,
              Date.now(), // ensures a new key on every render in studio
            ].join("|")
          : undefined,
      [
        inEditor,
        props.src,
        props.artboard,
        props.animations,
        props.autoplay,
        props.studioAutoplay,
        layout,
        stateMachines,
      ]
    );

    return <RiveComponent className={className} key={studioKey} />;
  }
);

export const riveMetaDescriptor: CodeComponentMeta<RiveComponentProps> = {
  name: "rive",
  displayName: "Rive",
  importName: "RivePlayer",
  importPath: "@plasmicpkgs/rive",
  description: "Rive animation component",

  props: {
    src: {
      type: "string",
      defaultValue: "https://cdn.rive.app/animations/vehicles.riv",
      displayName: "Source URL",
      description: "URL to the .riv file (exported from Rive)",
    },
    stateMachines: {
      type: "string",
      displayName: "State Machines",
      description: "(optional) Name of state machine to load.",
      advanced: true,
    },
    autoplay: {
      type: "boolean",
      displayName: "Autoplay",
      description: "Should animation play automatically.",
      defaultValue: true,
      advanced: true,
    },
    studioAutoplay: {
      type: "boolean",
      displayName: "Studio Autoplay",
      description: "Should animation play automatically in Plasmic Studio.",
      defaultValue: false,
      advanced: true,
    },
    artboard: {
      type: "string",
      displayName: "Artboard",
      description: "(optional) Name of the artboard to use.",
      advanced: true,
    },
    layout: {
      type: "object",
      displayName: "Layout",
      description:
        "(optional) Layout object to define how animations are displayed on the canvas.",
      nameFunc: (item: any) =>
        item ? `${item.fit} / ${item.alignment}` : undefined,
      advanced: true,
      fields: {
        fit: {
          type: "choice",
          displayName: "Fit",
          options: [
            "cover",
            "contain",
            "fill",
            "fitWidth",
            "fitHeight",
            "none",
            "scaleDown",
          ],
          description: "How the animation should fit in the canvas.",
        },
        alignment: {
          type: "choice",
          displayName: "Alignment",
          options: [
            "center",
            "topLeft",
            "topCenter",
            "topRight",
            "centerLeft",
            "centerRight",
            "bottomLeft",
            "bottomCenter",
            "bottomRight",
          ],
          description: "How the animation should be aligned in the canvas.",
        },
        minX: { type: "number", displayName: "Min X", advanced: true },
        minY: { type: "number", displayName: "Min Y", advanced: true },
        maxX: { type: "number", displayName: "Max X", advanced: true },
        maxY: { type: "number", displayName: "Max Y", advanced: true },
      },
    },
    animations: {
      type: "string",
      displayName: "Animations",
      description: "(optional) Name or list of names of animations to play.",
      advanced: true,
    },
    onStateChange: {
      type: "eventHandler",
      displayName: "On State Change",
      description: "(optional) Callback when the state changes.",
      advanced: true,
      argTypes: [
        {
          name: "event",
          type: "object",
        },
      ],
    },
  },
  defaultStyles: {
    minHeight: "60vh",
    width: "stretch",
  },
  refActions: {
    setBoolean: {
      description: "Set the Rive Input",
      argTypes: [
        {
          name: "name",
          type: "string",
          displayName: "Input Name",
        },
        {
          name: "value",
          type: "boolean",
          displayName: "Input Value",
        },
        {
          name: "stateMachine",
          type: "string",
          displayName: "State Machine Name",
        },
      ],
    },
    setNumber: {
      description: "Set the Rive Input",
      argTypes: [
        {
          name: "name",
          type: "string",
          displayName: "Input Name",
        },
        {
          name: "value",
          type: "number",
          displayName: "Input Value",
        },
        {
          name: "stateMachine",
          type: "string",
          displayName: "State Machine Name",
        },
      ],
    },
    fire: {
      description: "Fire the Rive Input",
      argTypes: [
        {
          name: "name",
          type: "string",
          displayName: "Input Name",
        },
        {
          name: "stateMachine",
          type: "string",
          displayName: "State Machine Name",
        },
      ],
    },
    play: {
      description: "Play the animation",
      argTypes: [
        {
          name: "animationName",
          type: "string",
          displayName: "Animation Name",
        },
      ],
    },
    pause: {
      description: "Pause the animation",
      argTypes: [
        {
          name: "animationName",
          type: "string",
          displayName: "Animation Name",
        },
      ],
    },
  },
};

export function registerPlasmicRive(loader?: {
  registerComponent: typeof registerComponent;
}) {
  if (loader) {
    loader.registerComponent(RivePlayer, riveMetaDescriptor);
  } else {
    registerComponent(RivePlayer, riveMetaDescriptor);
  }
}

export default RivePlayer;
