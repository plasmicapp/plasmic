/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

/** @jsxRuntime classic */
/** @jsx createPlasmicElementProxy */
/** @jsxFrag React.Fragment */

// This class is auto-generated by Plasmic; please do not edit!
// Plasmic Project: aukbrhkegRkQ6KizvhdUPT
// Component: 1q_JapBg7U

import * as React from "react";

import {
  Flex as Flex__,
  PlasmicIcon as PlasmicIcon__,
  SingleBooleanChoiceArg,
  SingleChoiceArg,
  Stack as Stack__,
  StrictProps,
  classNames,
  createPlasmicElementProxy,
  deriveRenderOpts,
  hasVariant,
  renderPlasmicSlot,
  useDollarState,
} from "@plasmicapp/react-web";
import { useDataEnv } from "@plasmicapp/react-web/lib/host";

import "@plasmicapp/react-web/lib/plasmic.css";

import plasmic_plasmic_kit_color_tokens_css from "../plasmic_kit_q_4_color_tokens/plasmic_plasmic_kit_q_4_color_tokens.module.css"; // plasmic-import: 95xp9cYcv7HrNWpFWWhbcv/projectcss
import plasmic_plasmic_kit_new_design_system_former_style_controls_css from "../plasmic_kit_style_controls/plasmic_plasmic_kit_styles_pane.module.css"; // plasmic-import: gYEVvAzCcLMHDVPvuYxkFh/projectcss
import plasmic_plasmic_kit_design_system_deprecated_css from "../PP__plasmickit_design_system.module.css"; // plasmic-import: tXkSR39sgCDWSitZxC5xFV/projectcss
import projectcss from "../PP__plasmickit_left_pane.module.css"; // plasmic-import: aukbrhkegRkQ6KizvhdUPT/projectcss
import sty from "./PlasmicLeftTabButton.module.css"; // plasmic-import: 1q_JapBg7U/css

import TreeIcon from "../plasmic_kit/PlasmicIcon__Tree"; // plasmic-import: 4KZjuPY_m0VTb/icon
import CircleSvgIcon from "../plasmic_kit_icons/icons/PlasmicIcon__CircleSvg"; // plasmic-import: VBf-n64uS/icon
import WarningTriangleSvgIcon from "../plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg"; // plasmic-import: S0L-xosWD/icon

createPlasmicElementProxy;

export type PlasmicLeftTabButton__VariantMembers = {
  isSelected: "isSelected";
  hasLabel: "hasLabel";
  showAlert: "showAlert" | "showYellowCircle";
};
export type PlasmicLeftTabButton__VariantsArgs = {
  isSelected?: SingleBooleanChoiceArg<"isSelected">;
  hasLabel?: SingleBooleanChoiceArg<"hasLabel">;
  showAlert?: SingleChoiceArg<"showAlert" | "showYellowCircle">;
};
type VariantPropType = keyof PlasmicLeftTabButton__VariantsArgs;
export const PlasmicLeftTabButton__VariantProps = new Array<VariantPropType>(
  "isSelected",
  "hasLabel",
  "showAlert"
);

export type PlasmicLeftTabButton__ArgsType = {
  icon?: React.ReactNode;
  label?: React.ReactNode;
};
type ArgPropType = keyof PlasmicLeftTabButton__ArgsType;
export const PlasmicLeftTabButton__ArgProps = new Array<ArgPropType>(
  "icon",
  "label"
);

export type PlasmicLeftTabButton__OverridesType = {
  root?: Flex__<"button">;
  svg?: Flex__<"svg">;
};

export interface DefaultLeftTabButtonProps {
  icon?: React.ReactNode;
  label?: React.ReactNode;
  isSelected?: SingleBooleanChoiceArg<"isSelected">;
  hasLabel?: SingleBooleanChoiceArg<"hasLabel">;
  showAlert?: SingleChoiceArg<"showAlert" | "showYellowCircle">;
  className?: string;
}

const $$ = {};

function PlasmicLeftTabButton__RenderFunc(props: {
  variants: PlasmicLeftTabButton__VariantsArgs;
  args: PlasmicLeftTabButton__ArgsType;
  overrides: PlasmicLeftTabButton__OverridesType;
  forNode?: string;
}) {
  const { variants, overrides, forNode } = props;

  const args = React.useMemo(
    () =>
      Object.assign(
        {},
        Object.fromEntries(
          Object.entries(props.args).filter(([_, v]) => v !== undefined)
        )
      ),
    [props.args]
  );

  const $props = {
    ...args,
    ...variants,
  };

  const $ctx = useDataEnv?.() || {};
  const refsRef = React.useRef({});
  const $refs = refsRef.current;

  const stateSpecs: Parameters<typeof useDollarState>[0] = React.useMemo(
    () => [
      {
        path: "isSelected",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) => $props.isSelected,
      },
      {
        path: "showAlert",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) => $props.showAlert,
      },
      {
        path: "hasLabel",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) => $props.hasLabel,
      },
    ],
    [$props, $ctx, $refs]
  );
  const $state = useDollarState(stateSpecs, {
    $props,
    $ctx,
    $queries: {},
    $refs,
  });

  return (
    <Stack__
      as={"button"}
      data-plasmic-name={"root"}
      data-plasmic-override={overrides.root}
      data-plasmic-root={true}
      data-plasmic-for-node={forNode}
      hasGap={true}
      className={classNames(
        projectcss.all,
        projectcss.button,
        projectcss.root_reset,
        projectcss.plasmic_default_styles,
        projectcss.plasmic_mixins,
        projectcss.plasmic_tokens,
        plasmic_plasmic_kit_design_system_deprecated_css.plasmic_tokens,
        plasmic_plasmic_kit_color_tokens_css.plasmic_tokens,
        plasmic_plasmic_kit_new_design_system_former_style_controls_css.plasmic_tokens,
        sty.root,
        {
          [sty.roothasLabel]: hasVariant($state, "hasLabel", "hasLabel"),
          [sty.rootisSelected]: hasVariant($state, "isSelected", "isSelected"),
          [sty.rootshowAlert_showAlert]: hasVariant(
            $state,
            "showAlert",
            "showAlert"
          ),
          [sty.rootshowAlert_showYellowCircle]: hasVariant(
            $state,
            "showAlert",
            "showYellowCircle"
          ),
        }
      )}
    >
      <div className={classNames(projectcss.all, sty.freeBox__b5WN)}>
        {renderPlasmicSlot({
          defaultContents: (
            <TreeIcon
              className={classNames(projectcss.all, sty.svg__zvJof)}
              role={"img"}
            />
          ),

          value: args.icon,
          className: classNames(sty.slotTargetIcon, {
            [sty.slotTargetIconisSelected]: hasVariant(
              $state,
              "isSelected",
              "isSelected"
            ),
            [sty.slotTargetIconshowAlert_showAlert]: hasVariant(
              $state,
              "showAlert",
              "showAlert"
            ),
          }),
        })}
      </div>
      {(
        hasVariant($state, "showAlert", "showYellowCircle")
          ? true
          : hasVariant($state, "showAlert", "showAlert")
          ? true
          : false
      ) ? (
        <PlasmicIcon__
          data-plasmic-name={"svg"}
          data-plasmic-override={overrides.svg}
          PlasmicIconType={
            hasVariant($state, "showAlert", "showAlert")
              ? WarningTriangleSvgIcon
              : CircleSvgIcon
          }
          className={classNames(projectcss.all, sty.svg, {
            [sty.svghasLabel]: hasVariant($state, "hasLabel", "hasLabel"),
            [sty.svgshowAlert_showAlert]: hasVariant(
              $state,
              "showAlert",
              "showAlert"
            ),
            [sty.svgshowAlert_showYellowCircle]: hasVariant(
              $state,
              "showAlert",
              "showYellowCircle"
            ),
          })}
          role={"img"}
        />
      ) : null}
      <div
        className={classNames(projectcss.all, sty.freeBox__t4REh, {
          [sty.freeBoxhasLabel__t4REhrO5Dz]: hasVariant(
            $state,
            "hasLabel",
            "hasLabel"
          ),
        })}
      >
        {renderPlasmicSlot({
          defaultContents: "Label",
          value: args.label,
          className: classNames(sty.slotTargetLabel, {
            [sty.slotTargetLabelhasLabel]: hasVariant(
              $state,
              "hasLabel",
              "hasLabel"
            ),
          }),
        })}
      </div>
    </Stack__>
  ) as React.ReactElement | null;
}

const PlasmicDescendants = {
  root: ["root", "svg"],
  svg: ["svg"],
} as const;
type NodeNameType = keyof typeof PlasmicDescendants;
type DescendantsType<T extends NodeNameType> =
  (typeof PlasmicDescendants)[T][number];
type NodeDefaultElementType = {
  root: "button";
  svg: "svg";
};

type ReservedPropsType = "variants" | "args" | "overrides";
type NodeOverridesType<T extends NodeNameType> = Pick<
  PlasmicLeftTabButton__OverridesType,
  DescendantsType<T>
>;
type NodeComponentProps<T extends NodeNameType> =
  // Explicitly specify variants, args, and overrides as objects
  {
    variants?: PlasmicLeftTabButton__VariantsArgs;
    args?: PlasmicLeftTabButton__ArgsType;
    overrides?: NodeOverridesType<T>;
  } & Omit<PlasmicLeftTabButton__VariantsArgs, ReservedPropsType> & // Specify variants directly as props
    // Specify args directly as props
    Omit<PlasmicLeftTabButton__ArgsType, ReservedPropsType> &
    // Specify overrides for each element directly as props
    Omit<
      NodeOverridesType<T>,
      ReservedPropsType | VariantPropType | ArgPropType
    > &
    // Specify props for the root element
    Omit<
      Partial<React.ComponentProps<NodeDefaultElementType[T]>>,
      ReservedPropsType | VariantPropType | ArgPropType | DescendantsType<T>
    >;

function makeNodeComponent<NodeName extends NodeNameType>(nodeName: NodeName) {
  type PropsType = NodeComponentProps<NodeName> & { key?: React.Key };
  const func = function <T extends PropsType>(
    props: T & StrictProps<T, PropsType>
  ) {
    const { variants, args, overrides } = React.useMemo(
      () =>
        deriveRenderOpts(props, {
          name: nodeName,
          descendantNames: PlasmicDescendants[nodeName],
          internalArgPropNames: PlasmicLeftTabButton__ArgProps,
          internalVariantPropNames: PlasmicLeftTabButton__VariantProps,
        }),
      [props, nodeName]
    );
    return PlasmicLeftTabButton__RenderFunc({
      variants,
      args,
      overrides,
      forNode: nodeName,
    });
  };
  if (nodeName === "root") {
    func.displayName = "PlasmicLeftTabButton";
  } else {
    func.displayName = `PlasmicLeftTabButton.${nodeName}`;
  }
  return func;
}

export const PlasmicLeftTabButton = Object.assign(
  // Top-level PlasmicLeftTabButton renders the root element
  makeNodeComponent("root"),
  {
    // Helper components rendering sub-elements
    svg: makeNodeComponent("svg"),

    // Metadata about props expected for PlasmicLeftTabButton
    internalVariantProps: PlasmicLeftTabButton__VariantProps,
    internalArgProps: PlasmicLeftTabButton__ArgProps,
  }
);

export default PlasmicLeftTabButton;
/* prettier-ignore-end */
