import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import { ColorPicker } from "@/wab/client/components/widgets/ColorPicker";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import PlasmicColorButton from "@/wab/client/plasmic/plasmic_kit_style_controls/PlasmicColorButton";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isTokenRef, tryParseTokenRef } from "@/wab/commons/StyleToken";
import { TOKEN_CAP } from "@/wab/shared/Labels";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { zeroWidthSpace } from "@/wab/shared/common";
import { siteFinalColorTokens } from "@/wab/shared/core/site-style-tokens";
import { FinalToken } from "@/wab/shared/core/tokens";
import { StyleToken } from "@/wab/shared/model/classes";
import Chroma from "@/wab/shared/utils/color-utils";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import * as React from "react";
import { useRef, useState } from "react";

type ColorButtonProps = {
  color?: string;
  onChange: (colorOrToken: string) => any;
  hideTokenPicker?: boolean;
  sc: StudioCtx;
  derefToken?: boolean;
  className?: string;
  popupTitle?: React.ReactNode;
  valueSetState?: ValueSetState;
  isDisabled?: boolean;
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
  vsh?: VariantedStylesHelper;
  "data-plasmic-prop"?: string;
};

function _ColorButton(props: ColorButtonProps) {
  const {
    color,
    onChange,
    derefToken,
    sc,
    hideTokenPicker,
    popupTitle,
    valueSetState,
    isDisabled,
    className,
    disabledTooltip,
    vsh,
  } = props;
  const ref = useRef<HTMLElement | null>(null);
  const [show, setShow] = useState(false);

  const tokenRef = !!color && isTokenRef(color);
  const appliedToken = color
    ? tryParseTokenRef(
        color,
        siteFinalColorTokens(sc.site, { includeDeps: "all" })
      )
    : null;

  const resolver = useClientTokenResolver();
  const realColor = appliedToken ? resolver(appliedToken, vsh) : color ?? "";

  return (
    <>
      <PlasmicColorButton
        swatch={{
          color: realColor,
          className: "baseline-friendly-centered-block-container",
        }}
        label={
          appliedToken
            ? appliedToken.name
            : tokenRef
            ? "Invalid " + TOKEN_CAP
            : color != null
            ? Chroma.stringify(color)
            : zeroWidthSpace
        }
        valueSetState={valueSetState}
        overrides={{
          root: {
            props: {
              // ref,
              type: "button",
              "data-plasmic-prop": props["data-plasmic-prop"],
              onClick: (e) => {
                if (isDisabled) {
                  // We handle isDisabled explicitly this way, instead of setting disabled
                  // attr, because otherwise we cannot capture the mouse events necessary
                  // to show the disabledTooltip
                  e.stopPropagation();
                  e.preventDefault();
                } else {
                  setShow(true);
                }
              },
              className,
              "aria-disabled": isDisabled,
            },
            wrap: (elt) =>
              isDisabled && disabledTooltip ? (
                <Tooltip title={disabledTooltip}>{elt}</Tooltip>
              ) : (
                elt
              ),
          },
        }}
        isDisabled={isDisabled}
      />

      <ColorSidebarPopup
        color={color}
        onChange={onChange}
        show={show}
        onClose={() => {
          setShow(false);

          // focus on next frame since we are currently in SidebarModal's FocusScope
          setTimeout(() => ref.current?.focus());
        }}
        popupTitle={popupTitle}
        derefToken={derefToken}
        hideTokenPicker={hideTokenPicker}
        autoFocus={true}
        vsh={vsh}
      />
    </>
  );
}

export const ColorButton = observer(_ColorButton);

export const ColorSidebarPopup = observer(function ColorSidebarPopup(props: {
  color?: string;
  onChange: (colorOrToken: string) => any;
  show: boolean;
  onClose: () => void;
  popupTitle?: React.ReactNode;
  derefToken?: boolean;
  hideTokenPicker?: boolean;
  autoFocus?: boolean;
  colorTokens?: FinalToken<StyleToken>[];
  vsh?: VariantedStylesHelper;
}) {
  const {
    color,
    onChange,
    show,
    derefToken,
    hideTokenPicker,
    colorTokens,
    vsh,
  } = props;

  return (
    <SidebarModal
      show={show}
      onClose={props.onClose}
      title={
        props.popupTitle && (
          <div className="flex flex-vcenter flex-fill">{props.popupTitle}</div>
        )
      }
      dismissOnEnter={true}
    >
      <div className="panel-content">
        <ColorPicker
          autoFocus={props.autoFocus}
          color={color || ""}
          onChange={onChange}
          derefToken={derefToken}
          hideTokenPicker={hideTokenPicker}
          colorTokens={colorTokens}
          vsh={vsh}
        />
      </div>
    </SidebarModal>
  );
});
