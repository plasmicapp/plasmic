import { Tooltip } from "antd";
import { observer } from "mobx-react-lite";
import React from "react";
import { spawn } from "../../../common";
import { isTplSlot } from "../../../tpls";
import { FullRow } from "../sidebar/sidebar-helpers";
import { SidebarSection } from "../sidebar/SidebarSection";
import {
  ExpsProvider,
  TplExpsProvider,
} from "../style-controls/StyleComponent";
import StyleSwitch from "../style-controls/StyleSwitch";
import LabeledListItem from "../widgets/LabeledListItem";

export const SlotSettingsSection = observer(
  function SlotSettingsSection(props: { expsProvider: ExpsProvider }) {
    const { expsProvider } = props;
    const { studioCtx } = expsProvider;
    if (!(expsProvider instanceof TplExpsProvider)) {
      return null;
    }
    const tpl = expsProvider.tpl;
    if (!isTplSlot(tpl)) {
      return null;
    }
    const param = tpl.param;
    return (
      <SidebarSection
        fullyCollapsible
        title={"Advanced settings"}
        hasExtraContent
      >
        {(renderMaybeCollapsibleRows) =>
          renderMaybeCollapsibleRows([
            {
              collapsible: !param.mergeWithParent,
              content: (
                <FullRow>
                  <LabeledListItem
                    indicator={param.mergeWithParent}
                    padding={["noHorizontal"]}
                    noLabel
                  >
                    <StyleSwitch
                      isChecked={param.mergeWithParent}
                      onChange={(val) => {
                        spawn(
                          studioCtx.changeUnsafe(() => {
                            param.mergeWithParent = val;
                          })
                        );
                      }}
                    >
                      <Tooltip
                        title={
                          "Merge slot contents with the component; Studio users need to select the component first before they can select contents from this slot"
                        }
                      >
                        <span>Merge with component</span>
                      </Tooltip>
                    </StyleSwitch>
                  </LabeledListItem>
                </FullRow>
              ),
            },
          ])
        }
      </SidebarSection>
    );
  }
);
