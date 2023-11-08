import { observer } from "mobx-react";
import React from "react";
import { useLocalStorage } from "react-use";
import { Component, Variant, VariantGroup } from "../../../../classes";
import { PublicStyleSection } from "../../../../shared/ApiSchema";
import { getPlumeEditorPlugin } from "../../../../shared/plume/plume-registry";
import { canEditStyleSection } from "../../../../shared/ui-config-utils";
import ComponentIcon from "../../../plasmic/plasmic_kit/PlasmicIcon__Component";
import GearIcon from "../../../plasmic/plasmic_kit/PlasmicIcon__Gear";
import PlumeMarkIcon from "../../../plasmic/plasmic_kit_design_system/icons/PlasmicIcon__PlumeMark";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../../studio-ctx/view-ctx";
import { PlumeMissingIngredientsPanel } from "../../plume/PlumeComponentPanel";
import { NamedPanelHeader } from "../../sidebar/sidebar-helpers";
import { SidebarModal } from "../../sidebar/SidebarModal";
import { SidebarSection } from "../../sidebar/SidebarSection";
import {
  VariantsPanel,
  VariantsPanelHandle,
} from "../../variants/VariantsPanel";
import { HoverableDisclosure } from "../../widgets/HoverableDisclosure";
import { Icon } from "../../widgets/Icon";
import IconButton from "../../widgets/IconButton";
import { ComponentDataQueriesSection } from "../component-data-queries-section";
import { ComponentPropsDefinitionSection } from "../ComponentPropsDefinitionSection";
import { LegacyComponentParamsSection } from "../legacy-component-params-section";
import VariablesSection from "../StateManagement/VariablesSection";
import S from "./ComponentTab.module.scss";

export interface ComponentTabHandle {
  onVariantAdded: (variant: Variant) => void;
  onVariantGroupAdded: (group: VariantGroup) => void;
}

export const ComponentTab = observer(function ComponentTab(props: {
  component: Component;
  studioCtx: StudioCtx;
  viewCtx?: ViewCtx | null;
  isHalf?: boolean;
}) {
  const { component, studioCtx, viewCtx, isHalf = false } = props;

  const plugin = getPlumeEditorPlugin(component);
  const variantsPanelRef = React.useRef<VariantsPanelHandle>(null);
  const [isExpanded, setExpanded] = useLocalStorage(
    "ComponentTab.isExpanded",
    false
  );
  const [showSettings, setShowSettings] = React.useState(false);

  if (!viewCtx) {
    return null;
  }
  const uiConfig = studioCtx.getCurrentUiConfig();

  const canEdit = (section: PublicStyleSection) => {
    return canEditStyleSection(uiConfig, section, {
      isContentCreator: studioCtx.contentEditorMode,
      defaultContentEditorVisible: false,
    });
  };
  return (
    <>
      {showSettings && (
        <SidebarModal
          show
          title={`${component.name} Settings`}
          onClose={() => setShowSettings(false)}
          persistOnInteractOutside
          data-test-id="comp-settings"
        >
          <LegacyComponentParamsSection
            studioCtx={studioCtx}
            component={component}
            metaDataOnly={studioCtx.appCtx.appConfig.rightTabs}
          />
        </SidebarModal>
      )}
      <SidebarSection
        scrollable
        zeroBodyPadding
        defaultExtraContentExpanded={isExpanded}
        onExtraContentCollapsed={() => setExpanded(false)}
        onExtraContentExpanded={() => setExpanded(true)}
        data-test-id="component-panel"
      >
        {!studioCtx.contentEditorMode &&
          ((renderMaybeCollapsibleRows) => (
            <>
              <SidebarSection>
                <div className={S.componentTabHeaderContainer}>
                  <NamedPanelHeader
                    icon={
                      <Icon icon={ComponentIcon} className="component-fg" />
                    }
                    value={component.name}
                    onChange={async (name) =>
                      studioCtx.changeUnsafe(() =>
                        studioCtx.siteOps().tryRenameComponent(component, name)
                      )
                    }
                    placeholder={`(unnamed component)`}
                    subtitle={
                      plugin ? (
                        <HoverableDisclosure
                          title={plugin.componentMeta.description}
                        >
                          <span>
                            <Icon icon={PlumeMarkIcon} />{" "}
                            <code>{plugin.componentMeta.name}</code> Component
                          </span>
                        </HoverableDisclosure>
                      ) : undefined
                    }
                  />
                  {canEdit(PublicStyleSection.ComponentProps) && (
                    <IconButton
                      tooltip="Component settings"
                      onClick={() => setShowSettings(true)}
                      data-test-id="btn-show-settings"
                    >
                      <Icon icon={GearIcon} />
                    </IconButton>
                  )}
                </div>
              </SidebarSection>
              {renderMaybeCollapsibleRows([
                {
                  collapsible:
                    isHalf && !!studioCtx.focusedViewCtx()?.focusedTpl(),
                  content: (
                    <>
                      <PlumeMissingIngredientsPanel component={component} />
                      {canEdit(PublicStyleSection.ComponentProps) && (
                        <ComponentPropsDefinitionSection
                          studioCtx={studioCtx}
                          component={component}
                        />
                      )}
                      {canEdit(PublicStyleSection.DataQueries) && (
                        <ComponentDataQueriesSection
                          component={component}
                          viewCtx={viewCtx}
                        />
                      )}
                      {canEdit(PublicStyleSection.States) && (
                        <VariablesSection
                          component={component}
                          viewCtx={viewCtx}
                        />
                      )}
                      {canEdit(PublicStyleSection.ComponentVariants) && (
                        <VariantsPanel
                          studioCtx={studioCtx}
                          viewCtx={viewCtx}
                          component={component}
                          ref={variantsPanelRef}
                        />
                      )}
                    </>
                  ),
                },
              ])}
            </>
          ))}
      </SidebarSection>
    </>
  );
});
