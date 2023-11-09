// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */

/** @jsxRuntime classic */
/** @jsx createPlasmicElementProxy */
/** @jsxFrag React.Fragment */

// This class is auto-generated by Plasmic; please do not edit!
// Plasmic Project: dyzP6dbCdycwJpqiR2zkwe
// Component: qFYdDOtl6B
import * as React from "react";

import * as p from "@plasmicapp/react-web";
import * as ph from "@plasmicapp/host";

import {
  hasVariant,
  classNames,
  wrapWithClassName,
  createPlasmicElementProxy,
  makeFragment,
  MultiChoiceArg,
  SingleBooleanChoiceArg,
  SingleChoiceArg,
  pick,
  omit,
  useTrigger,
  StrictProps,
  deriveRenderOpts,
  ensureGlobalVariants,
} from "@plasmicapp/react-web";

import "@plasmicapp/react-web/lib/plasmic.css";

import plasmic_plasmic_kit_design_system_css from "../PP__plasmickit_design_system.module.css"; // plasmic-import: tXkSR39sgCDWSitZxC5xFV/projectcss
import plasmic_plasmic_kit_color_tokens_css from "../plasmic_kit_q_4_color_tokens/plasmic_plasmic_kit_q_4_color_tokens.module.css"; // plasmic-import: 95xp9cYcv7HrNWpFWWhbcv/projectcss
import projectcss from "./plasmic_plasmic_kit_docs_portal.module.css"; // plasmic-import: dyzP6dbCdycwJpqiR2zkwe/projectcss
import sty from "./PlasmicTemplateRow.module.css"; // plasmic-import: qFYdDOtl6B/css

import ComponentInstanceIcon from "../plasmic_kit/PlasmicIcon__ComponentInstance"; // plasmic-import: htrQJQCkMImYW/icon

export type PlasmicTemplateRow__VariantMembers = {
  isActive: "isActive";
};

export type PlasmicTemplateRow__VariantsArgs = {
  isActive?: SingleBooleanChoiceArg<"isActive">;
};

type VariantPropType = keyof PlasmicTemplateRow__VariantsArgs;
export const PlasmicTemplateRow__VariantProps = new Array<VariantPropType>(
  "isActive"
);

export type PlasmicTemplateRow__ArgsType = {
  children?: React.ReactNode;
};

type ArgPropType = keyof PlasmicTemplateRow__ArgsType;
export const PlasmicTemplateRow__ArgProps = new Array<ArgPropType>("children");

export type PlasmicTemplateRow__OverridesType = {
  root?: p.Flex<"div">;
  freeBox?: p.Flex<"div">;
  svg?: p.Flex<"svg">;
};

export interface DefaultTemplateRowProps {
  children?: React.ReactNode;
  isActive?: SingleBooleanChoiceArg<"isActive">;
  className?: string;
}

export const defaultTemplateRow__Args: Partial<PlasmicTemplateRow__ArgsType> =
  {};

function PlasmicTemplateRow__RenderFunc(props: {
  variants: PlasmicTemplateRow__VariantsArgs;
  args: PlasmicTemplateRow__ArgsType;
  overrides: PlasmicTemplateRow__OverridesType;

  forNode?: string;
}) {
  const { variants, overrides, forNode } = props;
  const args = Object.assign({}, defaultTemplateRow__Args, props.args);
  const $props = args;

  return (
    true ? (
      <div
        data-plasmic-name={"root"}
        data-plasmic-override={overrides.root}
        data-plasmic-root={true}
        data-plasmic-for-node={forNode}
        className={classNames(
          projectcss.all,
          projectcss.root_reset,
          projectcss.plasmic_default_styles,
          projectcss.plasmic_mixins,
          projectcss.plasmic_tokens,
          plasmic_plasmic_kit_design_system_css.plasmic_tokens,
          plasmic_plasmic_kit_color_tokens_css.plasmic_tokens,
          sty.root,
          { [sty.rootisActive]: hasVariant(variants, "isActive", "isActive") }
        )}
      >
        <div
          data-plasmic-name={"freeBox"}
          data-plasmic-override={overrides.freeBox}
          className={classNames(projectcss.all, sty.freeBox, {
            [sty.freeBoxisActive]: hasVariant(variants, "isActive", "isActive"),
          })}
        >
          <ComponentInstanceIcon
            data-plasmic-name={"svg"}
            data-plasmic-override={overrides.svg}
            className={classNames(projectcss.all, sty.svg)}
            role={"img"}
          />

          {p.renderPlasmicSlot({
            defaultContents: "Enter some text",
            value: args.children,
          })}
        </div>
      </div>
    ) : null
  ) as React.ReactElement | null;
}

const PlasmicDescendants = {
  root: ["root", "freeBox", "svg"],
  freeBox: ["freeBox", "svg"],
  svg: ["svg"],
} as const;
type NodeNameType = keyof typeof PlasmicDescendants;
type DescendantsType<T extends NodeNameType> =
  typeof PlasmicDescendants[T][number];
type NodeDefaultElementType = {
  root: "div";
  freeBox: "div";
  svg: "svg";
};

type ReservedPropsType = "variants" | "args" | "overrides";
type NodeOverridesType<T extends NodeNameType> = Pick<
  PlasmicTemplateRow__OverridesType,
  DescendantsType<T>
>;

type NodeComponentProps<T extends NodeNameType> = {
  // Explicitly specify variants, args, and overrides as objects
  variants?: PlasmicTemplateRow__VariantsArgs;
  args?: PlasmicTemplateRow__ArgsType;
  overrides?: NodeOverridesType<T>;
} & Omit<PlasmicTemplateRow__VariantsArgs, ReservedPropsType> & // Specify variants directly as props
  // Specify args directly as props
  Omit<PlasmicTemplateRow__ArgsType, ReservedPropsType> &
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
    const { variants, args, overrides } = deriveRenderOpts(props, {
      name: nodeName,
      descendantNames: [...PlasmicDescendants[nodeName]],
      internalArgPropNames: PlasmicTemplateRow__ArgProps,
      internalVariantPropNames: PlasmicTemplateRow__VariantProps,
    });

    return PlasmicTemplateRow__RenderFunc({
      variants,
      args,
      overrides,
      forNode: nodeName,
    });
  };
  if (nodeName === "root") {
    func.displayName = "PlasmicTemplateRow";
  } else {
    func.displayName = `PlasmicTemplateRow.${nodeName}`;
  }
  return func;
}

export const PlasmicTemplateRow = Object.assign(
  // Top-level PlasmicTemplateRow renders the root element
  makeNodeComponent("root"),
  {
    // Helper components rendering sub-elements
    freeBox: makeNodeComponent("freeBox"),
    svg: makeNodeComponent("svg"),

    // Metadata about props expected for PlasmicTemplateRow
    internalVariantProps: PlasmicTemplateRow__VariantProps,
    internalArgProps: PlasmicTemplateRow__ArgProps,
  }
);

export default PlasmicTemplateRow;
/* prettier-ignore-end */