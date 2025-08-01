/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

/** @jsxRuntime classic */
/** @jsx createPlasmicElementProxy */
/** @jsxFrag React.Fragment */

// This class is auto-generated by Plasmic; please do not edit!
// Plasmic Project: aukbrhkegRkQ6KizvhdUPT
// Component: kkbHZ8nmgGH

import * as React from "react";

import {
  Flex as Flex__,
  PlasmicImg as PlasmicImg__,
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

import plasmic_plasmic_kit_color_tokens_css from "../../../plasmic/plasmic_kit_q_4_color_tokens/plasmic_plasmic_kit_q_4_color_tokens.module.css"; // plasmic-import: 95xp9cYcv7HrNWpFWWhbcv/projectcss
import plasmic_plasmic_kit_new_design_system_former_style_controls_css from "../../../plasmic/plasmic_kit_style_controls/plasmic_plasmic_kit_styles_pane.module.css"; // plasmic-import: gYEVvAzCcLMHDVPvuYxkFh/projectcss
import plasmic_plasmic_kit_design_system_deprecated_css from "../../../plasmic/PP__plasmickit_design_system.module.css"; // plasmic-import: tXkSR39sgCDWSitZxC5xFV/projectcss
import projectcss from "../../../plasmic/PP__plasmickit_left_pane.module.css"; // plasmic-import: aukbrhkegRkQ6KizvhdUPT/projectcss
import sty from "./PlasmicActivityFeedItem.module.css"; // plasmic-import: kkbHZ8nmgGH/css

createPlasmicElementProxy;

export type PlasmicActivityFeedItem__VariantMembers = {
  state:
    | "projectCreated"
    | "projectRenamed"
    | "projectShared"
    | "projectForked"
    | "userVisited"
    | "anonymousVisited"
    | "versionPublished";
  selected: "selected";
};
export type PlasmicActivityFeedItem__VariantsArgs = {
  state?: SingleChoiceArg<
    | "projectCreated"
    | "projectRenamed"
    | "projectShared"
    | "projectForked"
    | "userVisited"
    | "anonymousVisited"
    | "versionPublished"
  >;
  selected?: SingleBooleanChoiceArg<"selected">;
};
type VariantPropType = keyof PlasmicActivityFeedItem__VariantsArgs;
export const PlasmicActivityFeedItem__VariantProps = new Array<VariantPropType>(
  "state",
  "selected"
);

export type PlasmicActivityFeedItem__ArgsType = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  userPic?: React.ReactNode;
};
type ArgPropType = keyof PlasmicActivityFeedItem__ArgsType;
export const PlasmicActivityFeedItem__ArgProps = new Array<ArgPropType>(
  "title",
  "subtitle",
  "userPic"
);

export type PlasmicActivityFeedItem__OverridesType = {
  root?: Flex__<"div">;
  text?: Flex__<"div">;
};

export interface DefaultActivityFeedItemProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  userPic?: React.ReactNode;
  state?: SingleChoiceArg<
    | "projectCreated"
    | "projectRenamed"
    | "projectShared"
    | "projectForked"
    | "userVisited"
    | "anonymousVisited"
    | "versionPublished"
  >;
  selected?: SingleBooleanChoiceArg<"selected">;
  className?: string;
}

const $$ = {};

function PlasmicActivityFeedItem__RenderFunc(props: {
  variants: PlasmicActivityFeedItem__VariantsArgs;
  args: PlasmicActivityFeedItem__ArgsType;
  overrides: PlasmicActivityFeedItem__OverridesType;
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
        path: "state",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) => $props.state,
      },
      {
        path: "selected",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) => $props.selected,
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
        plasmic_plasmic_kit_design_system_deprecated_css.plasmic_tokens,
        plasmic_plasmic_kit_color_tokens_css.plasmic_tokens,
        plasmic_plasmic_kit_new_design_system_former_style_controls_css.plasmic_tokens,
        sty.root,
        {
          [sty.rootselected]: hasVariant($state, "selected", "selected"),
          [sty.rootstate_projectCreated]: hasVariant(
            $state,
            "state",
            "projectCreated"
          ),
          [sty.rootstate_versionPublished]: hasVariant(
            $state,
            "state",
            "versionPublished"
          ),
        }
      )}
    >
      <div
        className={classNames(projectcss.all, sty.freeBox__bGeUh, {
          [sty.freeBoxstate_versionPublished__bGeUh9SrPk]: hasVariant(
            $state,
            "state",
            "versionPublished"
          ),
        })}
      >
        <div
          data-plasmic-name={"text"}
          data-plasmic-override={overrides.text}
          className={classNames(
            projectcss.all,
            projectcss.__wab_text,
            sty.text,
            {
              [sty.textstate_anonymousVisited]: hasVariant(
                $state,
                "state",
                "anonymousVisited"
              ),
              [sty.textstate_projectCreated]: hasVariant(
                $state,
                "state",
                "projectCreated"
              ),
              [sty.textstate_projectForked]: hasVariant(
                $state,
                "state",
                "projectForked"
              ),
              [sty.textstate_projectRenamed]: hasVariant(
                $state,
                "state",
                "projectRenamed"
              ),
              [sty.textstate_projectShared]: hasVariant(
                $state,
                "state",
                "projectShared"
              ),
              [sty.textstate_userVisited]: hasVariant(
                $state,
                "state",
                "userVisited"
              ),
              [sty.textstate_versionPublished]: hasVariant(
                $state,
                "state",
                "versionPublished"
              ),
            }
          )}
        >
          {hasVariant($state, "state", "versionPublished")
            ? "\ud83d\uddc3\ufe0f"
            : hasVariant($state, "state", "anonymousVisited")
            ? "\ud83d\udd75\ufe0f"
            : hasVariant($state, "state", "userVisited")
            ? "\ud83d\ude0e"
            : hasVariant($state, "state", "projectForked")
            ? "\ud83c\udf5d"
            : hasVariant($state, "state", "projectShared")
            ? "\ud83d\udc4b"
            : hasVariant($state, "state", "projectRenamed")
            ? "\u2328\ufe0f"
            : hasVariant($state, "state", "projectCreated")
            ? "\u2728"
            : "\ud83e\udd26\u200d\u2640\ufe0f"}
        </div>
        <div
          className={classNames(projectcss.all, sty.freeBox__wrNkZ, {
            [sty.freeBoxselected__wrNkZ7Xsi1]: hasVariant(
              $state,
              "selected",
              "selected"
            ),
            [sty.freeBoxstate_versionPublished__wrNkZ9SrPk]: hasVariant(
              $state,
              "state",
              "versionPublished"
            ),
          })}
        />
      </div>
      <div
        className={classNames(projectcss.all, sty.freeBox__s0K6N, {
          [sty.freeBoxstate_anonymousVisited__s0K6Ntm6Oa]: hasVariant(
            $state,
            "state",
            "anonymousVisited"
          ),
          [sty.freeBoxstate_projectCreated__s0K6Nu8Xn2]: hasVariant(
            $state,
            "state",
            "projectCreated"
          ),
          [sty.freeBoxstate_userVisited__s0K6NXwSit]: hasVariant(
            $state,
            "state",
            "userVisited"
          ),
          [sty.freeBoxstate_versionPublished__s0K6N9SrPk]: hasVariant(
            $state,
            "state",
            "versionPublished"
          ),
        })}
      >
        {renderPlasmicSlot({
          defaultContents: "Something happened",
          value: args.title,
          className: classNames(sty.slotTargetTitle, {
            [sty.slotTargetTitlestate_anonymousVisited]: hasVariant(
              $state,
              "state",
              "anonymousVisited"
            ),
            [sty.slotTargetTitlestate_projectCreated]: hasVariant(
              $state,
              "state",
              "projectCreated"
            ),
            [sty.slotTargetTitlestate_projectForked]: hasVariant(
              $state,
              "state",
              "projectForked"
            ),
            [sty.slotTargetTitlestate_projectRenamed]: hasVariant(
              $state,
              "state",
              "projectRenamed"
            ),
            [sty.slotTargetTitlestate_projectShared]: hasVariant(
              $state,
              "state",
              "projectShared"
            ),
            [sty.slotTargetTitlestate_userVisited]: hasVariant(
              $state,
              "state",
              "userVisited"
            ),
            [sty.slotTargetTitlestate_versionPublished]: hasVariant(
              $state,
              "state",
              "versionPublished"
            ),
          }),
        })}
        {renderPlasmicSlot({
          defaultContents: "5d ago",
          value: args.subtitle,
          className: classNames(sty.slotTargetSubtitle, {
            [sty.slotTargetSubtitlestate_projectCreated]: hasVariant(
              $state,
              "state",
              "projectCreated"
            ),
          }),
        })}
      </div>
      {(hasVariant($state, "state", "anonymousVisited") ? false : true)
        ? renderPlasmicSlot({
            defaultContents: (
              <PlasmicImg__
                alt={""}
                className={classNames(sty.img___14Wx)}
                displayHeight={"48px"}
                displayMaxHeight={"none"}
                displayMaxWidth={"none"}
                displayMinHeight={"0"}
                displayMinWidth={"0"}
                displayWidth={"48px"}
                src={"http://localhost:3003/static/img/placeholder.png"}
              />
            ),

            value: args.userPic,
          })
        : null}
    </Stack__>
  ) as React.ReactElement | null;
}

const PlasmicDescendants = {
  root: ["root", "text"],
  text: ["text"],
} as const;
type NodeNameType = keyof typeof PlasmicDescendants;
type DescendantsType<T extends NodeNameType> =
  (typeof PlasmicDescendants)[T][number];
type NodeDefaultElementType = {
  root: "div";
  text: "div";
};

type ReservedPropsType = "variants" | "args" | "overrides";
type NodeOverridesType<T extends NodeNameType> = Pick<
  PlasmicActivityFeedItem__OverridesType,
  DescendantsType<T>
>;
type NodeComponentProps<T extends NodeNameType> =
  // Explicitly specify variants, args, and overrides as objects
  {
    variants?: PlasmicActivityFeedItem__VariantsArgs;
    args?: PlasmicActivityFeedItem__ArgsType;
    overrides?: NodeOverridesType<T>;
  } & Omit<PlasmicActivityFeedItem__VariantsArgs, ReservedPropsType> & // Specify variants directly as props
    // Specify args directly as props
    Omit<PlasmicActivityFeedItem__ArgsType, ReservedPropsType> &
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
          internalArgPropNames: PlasmicActivityFeedItem__ArgProps,
          internalVariantPropNames: PlasmicActivityFeedItem__VariantProps,
        }),
      [props, nodeName]
    );
    return PlasmicActivityFeedItem__RenderFunc({
      variants,
      args,
      overrides,
      forNode: nodeName,
    });
  };
  if (nodeName === "root") {
    func.displayName = "PlasmicActivityFeedItem";
  } else {
    func.displayName = `PlasmicActivityFeedItem.${nodeName}`;
  }
  return func;
}

export const PlasmicActivityFeedItem = Object.assign(
  // Top-level PlasmicActivityFeedItem renders the root element
  makeNodeComponent("root"),
  {
    // Helper components rendering sub-elements
    text: makeNodeComponent("text"),

    // Metadata about props expected for PlasmicActivityFeedItem
    internalVariantProps: PlasmicActivityFeedItem__VariantProps,
    internalArgProps: PlasmicActivityFeedItem__ArgProps,
  }
);

export default PlasmicActivityFeedItem;
/* prettier-ignore-end */
