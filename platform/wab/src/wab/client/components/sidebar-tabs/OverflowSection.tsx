import {
  FullRow,
  LabeledToggleButtonGroup,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  ExpsProvider,
  StylePanelSection,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import { Icon } from "@/wab/client/components/widgets/Icon";
import OverflowHiddenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__OverflowHidden";
import OverflowVisibleIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__OverflowVisible";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import { getCssInitial } from "@/wab/shared/css";
import { Menu } from "antd";
import { observer } from "mobx-react";
import React from "react";

export const OverflowSection = observer(OverflowSection_);

function OverflowSection_({ expsProvider }: { expsProvider: ExpsProvider }) {
  const studioCtx = useStudioCtx();
  const exp = expsProvider.mergedExp();
  const currentOverflow = exp.getRaw("overflow");
  const currentOverflowX = exp.getRaw("overflow-x") ?? currentOverflow;
  const currentOverflowY = exp.getRaw("overflow-y") ?? currentOverflow;
  const isSplit = exp.has("overflow-x") || exp.has("overflow-y");

  return (
    <StylePanelSection
      expsProvider={expsProvider}
      styleProps={["overflow", "overflow-x", "overflow-y"]}
      title="Overflow"
      oneLiner
      extraMenuItems={
        isSplit
          ? undefined
          : (builder) =>
              builder.genSection(undefined, (push) => {
                push(
                  <Menu.Item
                    key="split"
                    onClick={() =>
                      spawn(
                        studioCtx.changeUnsafe(() => {
                          expsProvider
                            .targetExp()
                            .set(
                              "overflow-x",
                              currentOverflow ??
                                getCssInitial("overflow", undefined)
                            );
                          expsProvider
                            .targetExp()
                            .set(
                              "overflow-y",
                              currentOverflow ??
                                getCssInitial("overflow", undefined)
                            );
                        })
                      )
                    }
                  >
                    Split overflow for X and Y
                  </Menu.Item>
                );
              })
      }
      controls={
        !isSplit && (
          <OverflowToggles
            styleName="overflow"
            value={currentOverflow}
            hideIndicator
            onChange={(val) =>
              spawn(
                studioCtx.changeUnsafe(() => {
                  expsProvider.targetExp().clear("overflow-x");
                  expsProvider.targetExp().clear("overflow-y");
                  expsProvider.targetExp().set("overflow", val);
                })
              )
            }
          />
        )
      }
    >
      {isSplit && (
        <>
          <FullRow>
            <OverflowToggles
              styleName="overflow-x"
              label="X"
              value={currentOverflowX}
              onChange={(val) =>
                spawn(
                  studioCtx.changeUnsafe(() => {
                    expsProvider.targetExp().clear("overflow");
                    expsProvider.targetExp().set("overflow-x", val);
                  })
                )
              }
            />
          </FullRow>
          <FullRow>
            <OverflowToggles
              styleName="overflow-y"
              label="Y"
              value={currentOverflowY}
              onChange={(val) =>
                spawn(
                  studioCtx.changeUnsafe(() => {
                    expsProvider.targetExp().clear("overflow");
                    expsProvider.targetExp().set("overflow-y", val);
                  })
                )
              }
            />
          </FullRow>
        </>
      )}
    </StylePanelSection>
  );
}

function OverflowToggles(props: {
  styleName: string;
  label?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  hideIndicator?: boolean;
}) {
  const { styleName, label, value, onChange, hideIndicator } = props;
  return (
    <LabeledToggleButtonGroup
      styleName={styleName}
      className="labeled-item--end"
      label={label}
      value={value}
      onChange={onChange}
      hideIndicator={hideIndicator}
      autoWidth
    >
      <StyleToggleButton
        value="visible"
        tooltip={
          <>
            <strong>Visible</strong>: do not clip/hide content that overflows
          </>
        }
      >
        <Icon icon={OverflowVisibleIcon} />
      </StyleToggleButton>
      <StyleToggleButton
        value="hidden"
        tooltip={
          <>
            <strong>Hidden</strong>: clip/hide content that overflows
          </>
        }
      >
        <Icon icon={OverflowHiddenIcon} />
      </StyleToggleButton>
      <StyleToggleButton
        value="auto"
        tooltip="Show scrollbars when contents overflow"
        label={"Scroll"}
        showLabel
        children={null}
      />
    </LabeledToggleButtonGroup>
  );
}
