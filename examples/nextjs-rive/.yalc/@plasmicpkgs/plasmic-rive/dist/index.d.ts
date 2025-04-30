import registerComponent, { CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import React from "react";
import { RiveProps } from "@rive-app/react-canvas";
declare type RiveComponentProps = RiveProps & {
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
declare const RivePlayer: React.ForwardRefExoticComponent<RiveProps & {
    className: string;
    autoplay: boolean;
    studioAutoplay: boolean;
    onStateChange?: ((event: any) => void) | undefined;
} & React.RefAttributes<RiveInputs>>;
export declare const riveMetaDescriptor: CodeComponentMeta<RiveComponentProps>;
export declare function registerPlasmicRive(loader?: {
    registerComponent: typeof registerComponent;
}): void;
export default RivePlayer;
