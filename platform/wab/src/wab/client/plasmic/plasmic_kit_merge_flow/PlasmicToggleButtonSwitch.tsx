// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */

/** @jsxRuntime classic */
/** @jsx createPlasmicElementProxy */
/** @jsxFrag React.Fragment */

// This class is auto-generated by Plasmic; please do not edit!
// Plasmic Project: p8FkKgCnyuat1kHSEYAKfW
// Component: LCAZOUPfDDB

import * as React from "react";

import {
  Flex as Flex__,
  PlasmicImg as PlasmicImg__,
  SingleChoiceArg,
  Stack as Stack__,
  StrictProps,
  classNames,
  createPlasmicElementProxy,
  deriveRenderOpts,
  hasVariant,
  useDollarState,
} from "@plasmicapp/react-web";
import { useDataEnv } from "@plasmicapp/react-web/lib/host";

import "@plasmicapp/react-web/lib/plasmic.css";

import plasmic_plasmic_kit_color_tokens_css from "../plasmic_kit_q_4_color_tokens/plasmic_plasmic_kit_q_4_color_tokens.module.css"; // plasmic-import: 95xp9cYcv7HrNWpFWWhbcv/projectcss
import plasmic_plasmic_kit_design_system_css from "../PP__plasmickit_design_system.module.css"; // plasmic-import: tXkSR39sgCDWSitZxC5xFV/projectcss
import projectcss from "./plasmic_plasmic_kit_merge_flow.module.css"; // plasmic-import: p8FkKgCnyuat1kHSEYAKfW/projectcss
import sty from "./PlasmicToggleButtonSwitch.module.css"; // plasmic-import: LCAZOUPfDDB/css

import ChevronDownIcon from "./icons/PlasmicIcon__ChevronDown"; // plasmic-import: eV4_yyuiy3/icon
import SquareIcon from "./icons/PlasmicIcon__Square"; // plasmic-import: e1jr2JBmRV/icon
import SquareCheckFilledIcon from "./icons/PlasmicIcon__SquareCheckFilled"; // plasmic-import: TopFn49DCw/icon
import treeV2EVpmODo from "./images/tree.svg"; // plasmic-import: v2eVPM-oDO/picture

createPlasmicElementProxy;

export type PlasmicToggleButtonSwitch__VariantMembers = {
  side: "left" | "right";
};
export type PlasmicToggleButtonSwitch__VariantsArgs = {
  side?: SingleChoiceArg<"left" | "right">;
};
type VariantPropType = keyof PlasmicToggleButtonSwitch__VariantsArgs;
export const PlasmicToggleButtonSwitch__VariantProps =
  new Array<VariantPropType>("side");

export type PlasmicToggleButtonSwitch__ArgsType = {};
type ArgPropType = keyof PlasmicToggleButtonSwitch__ArgsType;
export const PlasmicToggleButtonSwitch__ArgProps = new Array<ArgPropType>();

export type PlasmicToggleButtonSwitch__OverridesType = {
  root?: Flex__<"div">;
  left?: Flex__<"button">;
  startIconsContainer11?: Flex__<"div">;
  labelsContainer11?: Flex__<"div">;
  labelText11?: Flex__<"div">;
  label13?: Flex__<"div">;
  labelIconsContainer11?: Flex__<"div">;
  endIconsContainer11?: Flex__<"div">;
  right?: Flex__<"button">;
  startIconsContainer12?: Flex__<"div">;
  labelsContainer12?: Flex__<"div">;
  labelText12?: Flex__<"div">;
  label14?: Flex__<"div">;
  labelIconsContainer12?: Flex__<"div">;
  endIconsContainer12?: Flex__<"div">;
};

export interface DefaultToggleButtonSwitchProps {
  side?: SingleChoiceArg<"left" | "right">;
  className?: string;
}

const $$ = {};

function PlasmicToggleButtonSwitch__RenderFunc(props: {
  variants: PlasmicToggleButtonSwitch__VariantsArgs;
  args: PlasmicToggleButtonSwitch__ArgsType;
  overrides: PlasmicToggleButtonSwitch__OverridesType;
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
        path: "side",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) => $props.side,
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
          [sty.rootside_left]: hasVariant($state, "side", "left"),
          [sty.rootside_right]: hasVariant($state, "side", "right"),
        }
      )}
    >
      <Stack__
        as={"button"}
        data-plasmic-name={"left"}
        data-plasmic-override={overrides.left}
        hasGap={true}
        className={classNames(projectcss.all, projectcss.button, sty.left, {
          [sty.leftside_left]: hasVariant($state, "side", "left"),
        })}
        ref={(ref) => {
          $refs["left"] = ref;
        }}
      >
        <Stack__
          as={"div"}
          data-plasmic-name={"startIconsContainer11"}
          data-plasmic-override={overrides.startIconsContainer11}
          hasGap={true}
          className={classNames(projectcss.all, sty.startIconsContainer11)}
        >
          <SquareCheckFilledIcon
            className={classNames(projectcss.all, sty.svg__kkC6D, {
              [sty.svgside_left__kkC6DKxWfo]: hasVariant(
                $state,
                "side",
                "left"
              ),
            })}
            role={"img"}
          />
        </Stack__>
        <div
          data-plasmic-name={"labelsContainer11"}
          data-plasmic-override={overrides.labelsContainer11}
          className={classNames(projectcss.all, sty.labelsContainer11)}
        >
          <div
            data-plasmic-name={"labelText11"}
            data-plasmic-override={overrides.labelText11}
            className={classNames(projectcss.all, sty.labelText11)}
          >
            <div
              data-plasmic-name={"label13"}
              data-plasmic-override={overrides.label13}
              className={classNames(
                projectcss.all,
                projectcss.__wab_text,
                sty.label13,
                { [sty.label13side_left]: hasVariant($state, "side", "left") }
              )}
            >
              {"Keep"}
            </div>
            {false ? (
              <div
                className={classNames(
                  projectcss.all,
                  projectcss.__wab_text,
                  sty.text___3V0UF
                )}
              >
                {"Label"}
              </div>
            ) : null}
          </div>
          {false ? (
            <div
              data-plasmic-name={"labelIconsContainer11"}
              data-plasmic-override={overrides.labelIconsContainer11}
              className={classNames(projectcss.all, sty.labelIconsContainer11)}
            >
              <ChevronDownIcon
                className={classNames(projectcss.all, sty.svg__sJOr)}
                role={"img"}
              />
            </div>
          ) : null}
        </div>
        {false ? (
          <Stack__
            as={"div"}
            data-plasmic-name={"endIconsContainer11"}
            data-plasmic-override={overrides.endIconsContainer11}
            hasGap={true}
            className={classNames(projectcss.all, sty.endIconsContainer11)}
          >
            <PlasmicImg__
              alt={""}
              className={classNames(sty.img___4HY8P)}
              displayHeight={"20px"}
              displayMaxHeight={"none"}
              displayMaxWidth={"100%"}
              displayMinHeight={"0"}
              displayMinWidth={"0"}
              displayWidth={"20px"}
              loading={"lazy"}
              src={{
                src: treeV2EVpmODo,
                fullWidth: 20,
                fullHeight: 20,
                aspectRatio: 1,
              }}
            />
          </Stack__>
        ) : null}
      </Stack__>
      <Stack__
        as={"button"}
        data-plasmic-name={"right"}
        data-plasmic-override={overrides.right}
        hasGap={true}
        className={classNames(projectcss.all, projectcss.button, sty.right, {
          [sty.rightside_left]: hasVariant($state, "side", "left"),
          [sty.rightside_right]: hasVariant($state, "side", "right"),
        })}
        ref={(ref) => {
          $refs["right"] = ref;
        }}
      >
        {false ? (
          <Stack__
            as={"div"}
            data-plasmic-name={"startIconsContainer12"}
            data-plasmic-override={overrides.startIconsContainer12}
            hasGap={true}
            className={classNames(projectcss.all, sty.startIconsContainer12)}
          >
            <SquareIcon
              className={classNames(projectcss.all, sty.svg___28Q7C)}
              role={"img"}
            />
          </Stack__>
        ) : null}
        <div
          data-plasmic-name={"labelsContainer12"}
          data-plasmic-override={overrides.labelsContainer12}
          className={classNames(projectcss.all, sty.labelsContainer12)}
        >
          <div
            data-plasmic-name={"labelText12"}
            data-plasmic-override={overrides.labelText12}
            className={classNames(projectcss.all, sty.labelText12)}
          >
            <div
              data-plasmic-name={"label14"}
              data-plasmic-override={overrides.label14}
              className={classNames(
                projectcss.all,
                projectcss.__wab_text,
                sty.label14
              )}
            >
              {"Keep"}
            </div>
            {false ? (
              <div
                className={classNames(
                  projectcss.all,
                  projectcss.__wab_text,
                  sty.text__nsOzi
                )}
              >
                {"Label"}
              </div>
            ) : null}
          </div>
          {false ? (
            <div
              data-plasmic-name={"labelIconsContainer12"}
              data-plasmic-override={overrides.labelIconsContainer12}
              className={classNames(projectcss.all, sty.labelIconsContainer12)}
            >
              <ChevronDownIcon
                className={classNames(projectcss.all, sty.svg___9WnGr)}
                role={"img"}
              />
            </div>
          ) : null}
        </div>
        {false ? (
          <Stack__
            as={"div"}
            data-plasmic-name={"endIconsContainer12"}
            data-plasmic-override={overrides.endIconsContainer12}
            hasGap={true}
            className={classNames(projectcss.all, sty.endIconsContainer12)}
          >
            <PlasmicImg__
              alt={""}
              className={classNames(sty.img__atOz)}
              displayHeight={"20px"}
              displayMaxHeight={"none"}
              displayMaxWidth={"100%"}
              displayMinHeight={"0"}
              displayMinWidth={"0"}
              displayWidth={"20px"}
              loading={"lazy"}
              src={{
                src: treeV2EVpmODo,
                fullWidth: 20,
                fullHeight: 20,
                aspectRatio: 1,
              }}
            />
          </Stack__>
        ) : null}
      </Stack__>
    </Stack__>
  ) as React.ReactElement | null;
}

const PlasmicDescendants = {
  root: [
    "root",
    "left",
    "startIconsContainer11",
    "labelsContainer11",
    "labelText11",
    "label13",
    "labelIconsContainer11",
    "endIconsContainer11",
    "right",
    "startIconsContainer12",
    "labelsContainer12",
    "labelText12",
    "label14",
    "labelIconsContainer12",
    "endIconsContainer12",
  ],
  left: [
    "left",
    "startIconsContainer11",
    "labelsContainer11",
    "labelText11",
    "label13",
    "labelIconsContainer11",
    "endIconsContainer11",
  ],
  startIconsContainer11: ["startIconsContainer11"],
  labelsContainer11: [
    "labelsContainer11",
    "labelText11",
    "label13",
    "labelIconsContainer11",
  ],
  labelText11: ["labelText11", "label13"],
  label13: ["label13"],
  labelIconsContainer11: ["labelIconsContainer11"],
  endIconsContainer11: ["endIconsContainer11"],
  right: [
    "right",
    "startIconsContainer12",
    "labelsContainer12",
    "labelText12",
    "label14",
    "labelIconsContainer12",
    "endIconsContainer12",
  ],
  startIconsContainer12: ["startIconsContainer12"],
  labelsContainer12: [
    "labelsContainer12",
    "labelText12",
    "label14",
    "labelIconsContainer12",
  ],
  labelText12: ["labelText12", "label14"],
  label14: ["label14"],
  labelIconsContainer12: ["labelIconsContainer12"],
  endIconsContainer12: ["endIconsContainer12"],
} as const;
type NodeNameType = keyof typeof PlasmicDescendants;
type DescendantsType<T extends NodeNameType> =
  (typeof PlasmicDescendants)[T][number];
type NodeDefaultElementType = {
  root: "div";
  left: "button";
  startIconsContainer11: "div";
  labelsContainer11: "div";
  labelText11: "div";
  label13: "div";
  labelIconsContainer11: "div";
  endIconsContainer11: "div";
  right: "button";
  startIconsContainer12: "div";
  labelsContainer12: "div";
  labelText12: "div";
  label14: "div";
  labelIconsContainer12: "div";
  endIconsContainer12: "div";
};

type ReservedPropsType = "variants" | "args" | "overrides";
type NodeOverridesType<T extends NodeNameType> = Pick<
  PlasmicToggleButtonSwitch__OverridesType,
  DescendantsType<T>
>;
type NodeComponentProps<T extends NodeNameType> =
  // Explicitly specify variants, args, and overrides as objects
  {
    variants?: PlasmicToggleButtonSwitch__VariantsArgs;
    args?: PlasmicToggleButtonSwitch__ArgsType;
    overrides?: NodeOverridesType<T>;
  } & Omit<PlasmicToggleButtonSwitch__VariantsArgs, ReservedPropsType> & // Specify variants directly as props
    // Specify args directly as props
    Omit<PlasmicToggleButtonSwitch__ArgsType, ReservedPropsType> &
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
          internalArgPropNames: PlasmicToggleButtonSwitch__ArgProps,
          internalVariantPropNames: PlasmicToggleButtonSwitch__VariantProps,
        }),
      [props, nodeName]
    );
    return PlasmicToggleButtonSwitch__RenderFunc({
      variants,
      args,
      overrides,
      forNode: nodeName,
    });
  };
  if (nodeName === "root") {
    func.displayName = "PlasmicToggleButtonSwitch";
  } else {
    func.displayName = `PlasmicToggleButtonSwitch.${nodeName}`;
  }
  return func;
}

export const PlasmicToggleButtonSwitch = Object.assign(
  // Top-level PlasmicToggleButtonSwitch renders the root element
  makeNodeComponent("root"),
  {
    // Helper components rendering sub-elements
    left: makeNodeComponent("left"),
    startIconsContainer11: makeNodeComponent("startIconsContainer11"),
    labelsContainer11: makeNodeComponent("labelsContainer11"),
    labelText11: makeNodeComponent("labelText11"),
    label13: makeNodeComponent("label13"),
    labelIconsContainer11: makeNodeComponent("labelIconsContainer11"),
    endIconsContainer11: makeNodeComponent("endIconsContainer11"),
    right: makeNodeComponent("right"),
    startIconsContainer12: makeNodeComponent("startIconsContainer12"),
    labelsContainer12: makeNodeComponent("labelsContainer12"),
    labelText12: makeNodeComponent("labelText12"),
    label14: makeNodeComponent("label14"),
    labelIconsContainer12: makeNodeComponent("labelIconsContainer12"),
    endIconsContainer12: makeNodeComponent("endIconsContainer12"),

    // Metadata about props expected for PlasmicToggleButtonSwitch
    internalVariantProps: PlasmicToggleButtonSwitch__VariantProps,
    internalArgProps: PlasmicToggleButtonSwitch__ArgProps,
  }
);

export default PlasmicToggleButtonSwitch;
/* prettier-ignore-end */
