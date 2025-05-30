// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */

/** @jsxRuntime classic */
/** @jsx createPlasmicElementProxy */
/** @jsxFrag React.Fragment */

// This class is auto-generated by Plasmic; please do not edit!
// Plasmic Project: dyzP6dbCdycwJpqiR2zkwe
// Component: 6yrnCqYwJf
import * as React from "react";

import * as p from "@plasmicapp/react-web";

import {
  SingleChoiceArg,
  StrictProps,
  classNames,
  createPlasmicElementProxy,
  deriveRenderOpts,
  ensureGlobalVariants,
  hasVariant,
} from "@plasmicapp/react-web";
import MarkComponent from "../../components/docs/MarkComponent"; // plasmic-import: lckuNAFyZg/component
import Button from "../../components/widgets/Button"; // plasmic-import: SEF-sRmSoqV5c/component
import Select from "../../components/widgets/Select"; // plasmic-import: j_4IQyOWK2b/component
import Select__Option from "../../components/widgets/Select__Option"; // plasmic-import: rr-LWdMni2G/component

import { useCodegenType } from "./PlasmicGlobalVariant__CodegenType"; // plasmic-import: IFgLgWglLv/globalVariant

import "@plasmicapp/react-web/lib/plasmic.css";

import plasmic_plasmic_kit_color_tokens_css from "../plasmic_kit_q_4_color_tokens/plasmic_plasmic_kit_q_4_color_tokens.module.css"; // plasmic-import: 95xp9cYcv7HrNWpFWWhbcv/projectcss
import plasmic_plasmic_kit_design_system_css from "../PP__plasmickit_design_system.module.css"; // plasmic-import: tXkSR39sgCDWSitZxC5xFV/projectcss
import projectcss from "./plasmic_plasmic_kit_docs_portal.module.css"; // plasmic-import: dyzP6dbCdycwJpqiR2zkwe/projectcss
import sty from "./PlasmicDocsPortalHeader.module.css"; // plasmic-import: 6yrnCqYwJf/css

import ArrowLeftIcon from "../plasmic_kit/PlasmicIcon__ArrowLeft"; // plasmic-import: fS_r8u6Un0zKx/icon
import ArrowRightsvgIcon from "../plasmic_kit_icons/icons/PlasmicIcon__ArrowRightSvg"; // plasmic-import: 9Jv8jb253/icon
import ChevronDownsvgIcon from "../plasmic_kit_icons/icons/PlasmicIcon__ChevronDownSvg"; // plasmic-import: xZrB9_0ir/icon

export type PlasmicDocsPortalHeader__VariantMembers = {
  showCta: "showYellowCta" | "showRedCta";
};

export type PlasmicDocsPortalHeader__VariantsArgs = {
  showCta?: SingleChoiceArg<"showYellowCta" | "showRedCta">;
};

type VariantPropType = keyof PlasmicDocsPortalHeader__VariantsArgs;
export const PlasmicDocsPortalHeader__VariantProps = new Array<VariantPropType>(
  "showCta"
);

export type PlasmicDocsPortalHeader__ArgsType = {
  projectName?: React.ReactNode;
};

type ArgPropType = keyof PlasmicDocsPortalHeader__ArgsType;
export const PlasmicDocsPortalHeader__ArgProps = new Array<ArgPropType>(
  "projectName"
);

export type PlasmicDocsPortalHeader__OverridesType = {
  root?: p.Flex<"div">;
  markComponent?: p.Flex<typeof MarkComponent>;
  freeBox?: p.Flex<"div">;
  rightButtons?: p.Flex<"div">;
  projectTokenButton?: p.Flex<typeof Button>;
  studioButton?: p.Flex<"a">;
  button?: p.Flex<typeof Button>;
  codegenType?: p.Flex<typeof Select>;
};

export interface DefaultDocsPortalHeaderProps {
  projectName?: React.ReactNode;
  showCta?: SingleChoiceArg<"showYellowCta" | "showRedCta">;
  className?: string;
}

export const defaultDocsPortalHeader__Args: Partial<PlasmicDocsPortalHeader__ArgsType> =
  {};

function PlasmicDocsPortalHeader__RenderFunc(props: {
  variants: PlasmicDocsPortalHeader__VariantsArgs;
  args: PlasmicDocsPortalHeader__ArgsType;
  overrides: PlasmicDocsPortalHeader__OverridesType;

  forNode?: string;
}) {
  const { variants, overrides, forNode } = props;
  const args = Object.assign({}, defaultDocsPortalHeader__Args, props.args);
  const $props = args;

  const globalVariants = ensureGlobalVariants({
    codegenType: useCodegenType(),
  });

  return (
    <p.Stack
      as={"div"}
      data-plasmic-name={"root"}
      data-plasmic-override={overrides.root}
      data-plasmic-root={true}
      data-plasmic-for-node={forNode}
      hasGap={true}
      className={classNames(
        projectcss.all,
        projectcss.root_reset,
        projectcss.plasmic_default_styles,
        projectcss.plasmic_mixins,
        projectcss.plasmic_tokens,
        plasmic_plasmic_kit_design_system_css.plasmic_tokens,
        plasmic_plasmic_kit_color_tokens_css.plasmic_tokens,
        sty.root,
        {
          [sty.rootglobal_codegenType_loader]: hasVariant(
            globalVariants,
            "codegenType",
            "loader"
          ),

          [sty.rootshowCta_showYellowCta]: hasVariant(
            variants,
            "showCta",
            "showYellowCta"
          ),
        }
      )}
    >
      <MarkComponent
        data-plasmic-name={"markComponent"}
        data-plasmic-override={overrides.markComponent}
        className={classNames("__wab_instance", sty.markComponent)}
      />

      <div
        data-plasmic-name={"freeBox"}
        data-plasmic-override={overrides.freeBox}
        className={classNames(projectcss.all, sty.freeBox)}
      >
        <div
          className={classNames(
            projectcss.all,
            projectcss.__wab_text,
            sty.text__nZGhC
          )}
        >
          {"API Explorer: "}
        </div>

        {p.renderPlasmicSlot({
          defaultContents: "Project Name",
          value: args.projectName,
          className: classNames(sty.slotTargetProjectName),
        })}
      </div>

      <p.Stack
        as={"div"}
        data-plasmic-name={"rightButtons"}
        data-plasmic-override={overrides.rightButtons}
        hasGap={true}
        className={classNames(projectcss.all, sty.rightButtons)}
      >
        <Button
          data-plasmic-name={"projectTokenButton"}
          data-plasmic-override={overrides.projectTokenButton}
          className={classNames("__wab_instance", sty.projectTokenButton, {
            [sty.projectTokenButtonshowCta_showRedCta]: hasVariant(
              variants,
              "showCta",
              "showRedCta"
            ),
          })}
          endIcon={
            <ChevronDownsvgIcon
              className={classNames(projectcss.all, sty.svg__lr616)}
              role={"img"}
            />
          }
          startIcon={
            <ArrowRightsvgIcon
              className={classNames(projectcss.all, sty.svg__b6WSc)}
              role={"img"}
            />
          }
          type={"secondary" as const}
        >
          <div
            className={classNames(
              projectcss.all,
              projectcss.__wab_text,
              sty.text__yCc95
            )}
          >
            {"Project token"}
          </div>
        </Button>

        <a
          data-plasmic-name={"studioButton"}
          data-plasmic-override={overrides.studioButton}
          className={classNames(
            projectcss.all,
            projectcss.a,
            sty.studioButton,
            {
              [sty.studioButtonshowCta_showRedCta]: hasVariant(
                variants,
                "showCta",
                "showRedCta"
              ),
            }
          )}
        >
          <Button
            data-plasmic-name={"button"}
            data-plasmic-override={overrides.button}
            className={classNames("__wab_instance", sty.button, {
              [sty.buttonshowCta_showRedCta]: hasVariant(
                variants,
                "showCta",
                "showRedCta"
              ),
            })}
            endIcon={
              <ChevronDownsvgIcon
                className={classNames(projectcss.all, sty.svg__tx2Lp)}
                role={"img"}
              />
            }
            startIcon={
              <ArrowLeftIcon
                className={classNames(projectcss.all, sty.svg__fli8B)}
                role={"img"}
              />
            }
            type={"secondary" as const}
            withIcons={"startIcon" as const}
          >
            <div
              className={classNames(
                projectcss.all,
                projectcss.__wab_text,
                sty.text__ciDOi
              )}
            >
              {"Back to Studio"}
            </div>
          </Button>
        </a>
      </p.Stack>

      <Select
        data-plasmic-name={"codegenType"}
        data-plasmic-override={overrides.codegenType}
        className={classNames("__wab_instance", sty.codegenType)}
        defaultValue={"codegen" as const}
        type={"hugging" as const}
      >
        <Select__Option
          className={classNames("__wab_instance", sty.option__t0TMp)}
          value={"header" as const}
        >
          {"Loader"}
        </Select__Option>

        <Select__Option
          className={classNames("__wab_instance", sty.option__dPrvs)}
          value={"codegen" as const}
        >
          {"Codegen"}
        </Select__Option>
      </Select>
    </p.Stack>
  ) as React.ReactElement | null;
}

const PlasmicDescendants = {
  root: [
    "root",
    "markComponent",
    "freeBox",
    "rightButtons",
    "projectTokenButton",
    "studioButton",
    "button",
    "codegenType",
  ],

  markComponent: ["markComponent"],
  freeBox: ["freeBox"],
  rightButtons: [
    "rightButtons",
    "projectTokenButton",
    "studioButton",
    "button",
  ],

  projectTokenButton: ["projectTokenButton"],
  studioButton: ["studioButton", "button"],
  button: ["button"],
  codegenType: ["codegenType"],
} as const;
type NodeNameType = keyof typeof PlasmicDescendants;
type DescendantsType<T extends NodeNameType> =
  (typeof PlasmicDescendants)[T][number];
type NodeDefaultElementType = {
  root: "div";
  markComponent: typeof MarkComponent;
  freeBox: "div";
  rightButtons: "div";
  projectTokenButton: typeof Button;
  studioButton: "a";
  button: typeof Button;
  codegenType: typeof Select;
};

type ReservedPropsType = "variants" | "args" | "overrides";
type NodeOverridesType<T extends NodeNameType> = Pick<
  PlasmicDocsPortalHeader__OverridesType,
  DescendantsType<T>
>;

type NodeComponentProps<T extends NodeNameType> = {
  // Explicitly specify variants, args, and overrides as objects
  variants?: PlasmicDocsPortalHeader__VariantsArgs;
  args?: PlasmicDocsPortalHeader__ArgsType;
  overrides?: NodeOverridesType<T>;
} & Omit<PlasmicDocsPortalHeader__VariantsArgs, ReservedPropsType> & // Specify variants directly as props
  // Specify args directly as props
  Omit<PlasmicDocsPortalHeader__ArgsType, ReservedPropsType> &
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
      internalArgPropNames: PlasmicDocsPortalHeader__ArgProps,
      internalVariantPropNames: PlasmicDocsPortalHeader__VariantProps,
    });

    return PlasmicDocsPortalHeader__RenderFunc({
      variants,
      args,
      overrides,
      forNode: nodeName,
    });
  };
  if (nodeName === "root") {
    func.displayName = "PlasmicDocsPortalHeader";
  } else {
    func.displayName = `PlasmicDocsPortalHeader.${nodeName}`;
  }
  return func;
}

export const PlasmicDocsPortalHeader = Object.assign(
  // Top-level PlasmicDocsPortalHeader renders the root element
  makeNodeComponent("root"),
  {
    // Helper components rendering sub-elements
    markComponent: makeNodeComponent("markComponent"),
    freeBox: makeNodeComponent("freeBox"),
    rightButtons: makeNodeComponent("rightButtons"),
    projectTokenButton: makeNodeComponent("projectTokenButton"),
    studioButton: makeNodeComponent("studioButton"),
    button: makeNodeComponent("button"),
    codegenType: makeNodeComponent("codegenType"),

    // Metadata about props expected for PlasmicDocsPortalHeader
    internalVariantProps: PlasmicDocsPortalHeader__VariantProps,
    internalArgProps: PlasmicDocsPortalHeader__ArgProps,
  }
);

export default PlasmicDocsPortalHeader;
/* prettier-ignore-end */
