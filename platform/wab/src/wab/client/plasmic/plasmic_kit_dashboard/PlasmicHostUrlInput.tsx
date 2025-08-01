/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

/** @jsxRuntime classic */
/** @jsx createPlasmicElementProxy */
/** @jsxFrag React.Fragment */

// This class is auto-generated by Plasmic; please do not edit!
// Plasmic Project: ooL7EhXDmFQWnW9sxtchhE
// Component: XxbnrpTDqu

import * as React from "react";

import {
  Flex as Flex__,
  SingleBooleanChoiceArg,
  SingleChoiceArg,
  Stack as Stack__,
  StrictProps,
  classNames,
  createPlasmicElementProxy,
  deriveRenderOpts,
  ensureGlobalVariants,
  generateStateOnChangeProp,
  generateStateValueProp,
  hasVariant,
  useDollarState,
} from "@plasmicapp/react-web";
import { useDataEnv } from "@plasmicapp/react-web/lib/host";

import HostProtocolSelect from "../../components/HostProtocolSelect"; // plasmic-import: 6_CfQ5GVLku/component
import HostProtocolSelect__Option from "../../components/HostProtocolSelect__Option"; // plasmic-import: aHgWgR3OVni/component
import Button from "../../components/widgets/Button"; // plasmic-import: SEF-sRmSoqV5c/component

import { useEnvironment } from "../plasmic_kit_pricing/PlasmicGlobalVariant__Environment"; // plasmic-import: hIjF9NLAUKG-/globalVariant

import "@plasmicapp/react-web/lib/plasmic.css";

import plasmic_plasmic_kit_pricing_css from "../plasmic_kit_pricing/plasmic_plasmic_kit_pricing.module.css"; // plasmic-import: ehckhYnyDHgCBbV47m9bkf/projectcss
import plasmic_plasmic_kit_color_tokens_css from "../plasmic_kit_q_4_color_tokens/plasmic_plasmic_kit_q_4_color_tokens.module.css"; // plasmic-import: 95xp9cYcv7HrNWpFWWhbcv/projectcss
import projectcss from "../PP__plasmickit_dashboard.module.css"; // plasmic-import: ooL7EhXDmFQWnW9sxtchhE/projectcss
import plasmic_plasmic_kit_design_system_deprecated_css from "../PP__plasmickit_design_system.module.css"; // plasmic-import: tXkSR39sgCDWSitZxC5xFV/projectcss
import sty from "./PlasmicHostUrlInput.module.css"; // plasmic-import: XxbnrpTDqu/css

import InfoIcon from "../plasmic_kit/PlasmicIcon__Info"; // plasmic-import: BjAly3N4fWuWe/icon
import ArrowRightSvgIcon from "../plasmic_kit_icons/icons/PlasmicIcon__ArrowRightSvg"; // plasmic-import: 9Jv8jb253/icon
import ChevronDownSvgIcon from "../plasmic_kit_icons/icons/PlasmicIcon__ChevronDownSvg"; // plasmic-import: xZrB9_0ir/icon

createPlasmicElementProxy;

export type PlasmicHostUrlInput__VariantMembers = {
  urlValidationStatus: "invalid" | "valid";
  urlPathStatus: "nonStandard" | "standard";
  showPlasmicHostValidations: "showPlasmicHostValidations";
};
export type PlasmicHostUrlInput__VariantsArgs = {
  urlValidationStatus?: SingleChoiceArg<"invalid" | "valid">;
  urlPathStatus?: SingleChoiceArg<"nonStandard" | "standard">;
  showPlasmicHostValidations?: SingleBooleanChoiceArg<"showPlasmicHostValidations">;
};
type VariantPropType = keyof PlasmicHostUrlInput__VariantsArgs;
export const PlasmicHostUrlInput__VariantProps = new Array<VariantPropType>(
  "urlValidationStatus",
  "urlPathStatus",
  "showPlasmicHostValidations"
);

export type PlasmicHostUrlInput__ArgsType = {};
type ArgPropType = keyof PlasmicHostUrlInput__ArgsType;
export const PlasmicHostUrlInput__ArgProps = new Array<ArgPropType>();

export type PlasmicHostUrlInput__OverridesType = {
  root?: Flex__<"div">;
  hostProtocolSelect?: Flex__<typeof HostProtocolSelect>;
  urlInput?: Flex__<"input">;
  clearButton?: Flex__<typeof Button>;
  confirmButton?: Flex__<typeof Button>;
};

export interface DefaultHostUrlInputProps {
  urlValidationStatus?: SingleChoiceArg<"invalid" | "valid">;
  urlPathStatus?: SingleChoiceArg<"nonStandard" | "standard">;
  showPlasmicHostValidations?: SingleBooleanChoiceArg<"showPlasmicHostValidations">;
  className?: string;
}

const $$ = {};

function PlasmicHostUrlInput__RenderFunc(props: {
  variants: PlasmicHostUrlInput__VariantsArgs;
  args: PlasmicHostUrlInput__ArgsType;
  overrides: PlasmicHostUrlInput__OverridesType;
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
        path: "hostProtocolSelect.value",
        type: "private",
        variableType: "text",
        initFunc: ({ $props, $state, $queries, $ctx }) => "https://",
      },
      {
        path: "urlInput.value",
        type: "private",
        variableType: "text",
        initFunc: ({ $props, $state, $queries, $ctx }) => undefined,
      },
      {
        path: "urlValidationStatus",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) =>
          $props.urlValidationStatus,
      },
      {
        path: "urlPathStatus",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) => $props.urlPathStatus,
      },
      {
        path: "showPlasmicHostValidations",
        type: "private",
        variableType: "variant",
        initFunc: ({ $props, $state, $queries, $ctx }) =>
          $props.showPlasmicHostValidations,
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

  const globalVariants = ensureGlobalVariants({
    environment: useEnvironment(),
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
        plasmic_plasmic_kit_pricing_css.plasmic_tokens,
        sty.root,
        {
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [plasmic_plasmic_kit_pricing_css.global_environment_website]:
            hasVariant(globalVariants, "environment", "website"),
          [sty.rooturlPathStatus_nonStandard]: hasVariant(
            $state,
            "urlPathStatus",
            "nonStandard"
          ),
          [sty.rooturlValidationStatus_invalid]: hasVariant(
            $state,
            "urlValidationStatus",
            "invalid"
          ),
          [sty.rooturlValidationStatus_valid]: hasVariant(
            $state,
            "urlValidationStatus",
            "valid"
          ),
        }
      )}
    >
      <Stack__
        as={"div"}
        hasGap={true}
        className={classNames(projectcss.all, sty.freeBox__ycLvv, {
          [sty.freeBoxurlValidationStatus_invalid__ycLvvVmYfF]: hasVariant(
            $state,
            "urlValidationStatus",
            "invalid"
          ),
          [sty.freeBoxurlValidationStatus_valid__ycLvv0YpMn]: hasVariant(
            $state,
            "urlValidationStatus",
            "valid"
          ),
        })}
      >
        <div
          className={classNames(
            projectcss.all,
            projectcss.__wab_text,
            sty.text__g2NsR,
            {
              [sty.texturlValidationStatus_invalid__g2NsRvmYfF]: hasVariant(
                $state,
                "urlValidationStatus",
                "invalid"
              ),
              [sty.texturlValidationStatus_valid__g2NsR0YpMn]: hasVariant(
                $state,
                "urlValidationStatus",
                "valid"
              ),
            }
          )}
        >
          {"URL:"}
        </div>
        <HostProtocolSelect
          data-plasmic-name={"hostProtocolSelect"}
          data-plasmic-override={overrides.hostProtocolSelect}
          className={classNames("__wab_instance", sty.hostProtocolSelect)}
          onChange={async (...eventArgs: any) => {
            ((...eventArgs) => {
              generateStateOnChangeProp($state, [
                "hostProtocolSelect",
                "value",
              ])(eventArgs[0]);
            }).apply(null, eventArgs);

            if (
              eventArgs.length > 1 &&
              eventArgs[1] &&
              eventArgs[1]._plasmic_state_init_
            ) {
              return;
            }
          }}
          placeholder={"Select\u2026"}
          value={generateStateValueProp($state, [
            "hostProtocolSelect",
            "value",
          ])}
        >
          <HostProtocolSelect__Option
            className={classNames("__wab_instance", sty.option__jSgyS)}
            textValue={"https://"}
            value={"https://"}
          >
            {"https://"}
          </HostProtocolSelect__Option>
          <HostProtocolSelect__Option
            className={classNames("__wab_instance", sty.option__nopaD)}
            textValue={"http://"}
            value={"http://"}
          >
            {"http://"}
          </HostProtocolSelect__Option>
        </HostProtocolSelect>
        <input
          data-plasmic-name={"urlInput"}
          data-plasmic-override={overrides.urlInput}
          className={classNames(
            projectcss.all,
            projectcss.input,
            sty.urlInput,
            {
              [sty.urlInputurlValidationStatus_invalid]: hasVariant(
                $state,
                "urlValidationStatus",
                "invalid"
              ),
              [sty.urlInputurlValidationStatus_valid]: hasVariant(
                $state,
                "urlValidationStatus",
                "valid"
              ),
            }
          )}
          onChange={async (...eventArgs: any) => {
            ((e) => {
              generateStateOnChangeProp($state, ["urlInput", "value"])(
                e.target.value
              );
            }).apply(null, eventArgs);
          }}
          placeholder={"my-app.com/plasmic-host"}
          ref={(ref) => {
            $refs["urlInput"] = ref;
          }}
          size={1}
          type={"text"}
          value={generateStateValueProp($state, ["urlInput", "value"]) ?? ""}
        />

        <Button
          data-plasmic-name={"clearButton"}
          data-plasmic-override={overrides.clearButton}
          caption={"Caption"}
          className={classNames("__wab_instance", sty.clearButton)}
          disabled={true}
          endIcon={
            <ChevronDownSvgIcon
              className={classNames(projectcss.all, sty.svg__vgMoN)}
              role={"img"}
            />
          }
          size={"wide"}
          startIcon={
            <ArrowRightSvgIcon
              className={classNames(projectcss.all, sty.svg__wNkJa)}
              role={"img"}
            />
          }
        >
          <div
            className={classNames(
              projectcss.all,
              projectcss.__wab_text,
              sty.text__sYxzC
            )}
          >
            {"Clear"}
          </div>
        </Button>
        <Button
          data-plasmic-name={"confirmButton"}
          data-plasmic-override={overrides.confirmButton}
          caption={"Caption"}
          className={classNames("__wab_instance", sty.confirmButton)}
          disabled={true}
          endIcon={
            <ChevronDownSvgIcon
              className={classNames(projectcss.all, sty.svg__idqB)}
              role={"img"}
            />
          }
          size={"wide"}
          startIcon={
            <ArrowRightSvgIcon
              className={classNames(projectcss.all, sty.svg__x95OL)}
              role={"img"}
            />
          }
          type={["primary"]}
        >
          <div
            className={classNames(
              projectcss.all,
              projectcss.__wab_text,
              sty.text__ijKr
            )}
          >
            {"Confirm"}
          </div>
        </Button>
      </Stack__>
      <Stack__
        as={"div"}
        hasGap={true}
        className={classNames(projectcss.all, sty.freeBox__bFmsS, {
          [sty.freeBoxshowPlasmicHostValidations__bFmsSiDwTg]: hasVariant(
            $state,
            "showPlasmicHostValidations",
            "showPlasmicHostValidations"
          ),
        })}
      >
        <Stack__
          as={"div"}
          hasGap={true}
          className={classNames(projectcss.all, sty.freeBox__oOj3, {
            [sty.freeBoxurlValidationStatus_invalid__oOj3VmYfF]: hasVariant(
              $state,
              "urlValidationStatus",
              "invalid"
            ),
            [sty.freeBoxurlValidationStatus_valid__oOj30YpMn]: hasVariant(
              $state,
              "urlValidationStatus",
              "valid"
            ),
          })}
        >
          <InfoIcon
            className={classNames(projectcss.all, sty.svg__k9HiC, {
              [sty.svgurlValidationStatus_invalid__k9HiCvmYfF]: hasVariant(
                $state,
                "urlValidationStatus",
                "invalid"
              ),
              [sty.svgurlValidationStatus_valid__k9HiC0YpMn]: hasVariant(
                $state,
                "urlValidationStatus",
                "valid"
              ),
            })}
            role={"img"}
          />

          <div
            className={classNames(
              projectcss.all,
              projectcss.__wab_text,
              sty.text__dSWc,
              {
                [sty.textshowPlasmicHostValidations__dSWCiDwTg]: hasVariant(
                  $state,
                  "showPlasmicHostValidations",
                  "showPlasmicHostValidations"
                ),
                [sty.texturlValidationStatus_invalid__dSWcvmYfF]: hasVariant(
                  $state,
                  "urlValidationStatus",
                  "invalid"
                ),
                [sty.texturlValidationStatus_valid__dSWc0YpMn]: hasVariant(
                  $state,
                  "urlValidationStatus",
                  "valid"
                ),
              }
            )}
          >
            {"Please enter a valid URL. Note that spaces are not allowed."}
          </div>
        </Stack__>
        <Stack__
          as={"div"}
          hasGap={true}
          className={classNames(projectcss.all, sty.freeBox__g5LjN, {
            [sty.freeBoxurlValidationStatus_invalid__g5LjNvmYfF]: hasVariant(
              $state,
              "urlValidationStatus",
              "invalid"
            ),
            [sty.freeBoxurlValidationStatus_valid__g5LjN0YpMn]: hasVariant(
              $state,
              "urlValidationStatus",
              "valid"
            ),
          })}
        >
          <InfoIcon
            className={classNames(projectcss.all, sty.svg__pyf5U, {
              [sty.svgurlPathStatus_nonStandard__pyf5UjMiBj]: hasVariant(
                $state,
                "urlPathStatus",
                "nonStandard"
              ),
              [sty.svgurlPathStatus_standard__pyf5UQuOX]: hasVariant(
                $state,
                "urlPathStatus",
                "standard"
              ),
            })}
            role={"img"}
          />

          <div
            className={classNames(
              projectcss.all,
              projectcss.__wab_text,
              sty.text__tgz1I,
              {
                [sty.texturlPathStatus_nonStandard__tgz1IjMiBj]: hasVariant(
                  $state,
                  "urlPathStatus",
                  "nonStandard"
                ),
                [sty.texturlPathStatus_standard__tgz1IQuOX]: hasVariant(
                  $state,
                  "urlPathStatus",
                  "standard"
                ),
                [sty.texturlValidationStatus_valid__tgz1I0YpMn]: hasVariant(
                  $state,
                  "urlValidationStatus",
                  "valid"
                ),
              }
            )}
          >
            <React.Fragment>
              <React.Fragment>
                {"For standard configuration, the URL path should end with "}
              </React.Fragment>
              <span
                className={"plasmic_default__all plasmic_default__span"}
                style={{ fontWeight: 700 }}
              >
                {"/plasmic-host"}
              </span>
            </React.Fragment>
          </div>
        </Stack__>
      </Stack__>
    </Stack__>
  ) as React.ReactElement | null;
}

const PlasmicDescendants = {
  root: [
    "root",
    "hostProtocolSelect",
    "urlInput",
    "clearButton",
    "confirmButton",
  ],
  hostProtocolSelect: ["hostProtocolSelect"],
  urlInput: ["urlInput"],
  clearButton: ["clearButton"],
  confirmButton: ["confirmButton"],
} as const;
type NodeNameType = keyof typeof PlasmicDescendants;
type DescendantsType<T extends NodeNameType> =
  (typeof PlasmicDescendants)[T][number];
type NodeDefaultElementType = {
  root: "div";
  hostProtocolSelect: typeof HostProtocolSelect;
  urlInput: "input";
  clearButton: typeof Button;
  confirmButton: typeof Button;
};

type ReservedPropsType = "variants" | "args" | "overrides";
type NodeOverridesType<T extends NodeNameType> = Pick<
  PlasmicHostUrlInput__OverridesType,
  DescendantsType<T>
>;
type NodeComponentProps<T extends NodeNameType> =
  // Explicitly specify variants, args, and overrides as objects
  {
    variants?: PlasmicHostUrlInput__VariantsArgs;
    args?: PlasmicHostUrlInput__ArgsType;
    overrides?: NodeOverridesType<T>;
  } & Omit<PlasmicHostUrlInput__VariantsArgs, ReservedPropsType> & // Specify variants directly as props
    // Specify args directly as props
    Omit<PlasmicHostUrlInput__ArgsType, ReservedPropsType> &
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
          internalArgPropNames: PlasmicHostUrlInput__ArgProps,
          internalVariantPropNames: PlasmicHostUrlInput__VariantProps,
        }),
      [props, nodeName]
    );
    return PlasmicHostUrlInput__RenderFunc({
      variants,
      args,
      overrides,
      forNode: nodeName,
    });
  };
  if (nodeName === "root") {
    func.displayName = "PlasmicHostUrlInput";
  } else {
    func.displayName = `PlasmicHostUrlInput.${nodeName}`;
  }
  return func;
}

export const PlasmicHostUrlInput = Object.assign(
  // Top-level PlasmicHostUrlInput renders the root element
  makeNodeComponent("root"),
  {
    // Helper components rendering sub-elements
    hostProtocolSelect: makeNodeComponent("hostProtocolSelect"),
    urlInput: makeNodeComponent("urlInput"),
    clearButton: makeNodeComponent("clearButton"),
    confirmButton: makeNodeComponent("confirmButton"),

    // Metadata about props expected for PlasmicHostUrlInput
    internalVariantProps: PlasmicHostUrlInput__VariantProps,
    internalArgProps: PlasmicHostUrlInput__ArgProps,
  }
);

export default PlasmicHostUrlInput;
/* prettier-ignore-end */
