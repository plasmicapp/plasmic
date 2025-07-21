import { PlumeMissingIngredientsPanel } from "@/wab/client/components/plume/PlumeComponentPanel";
import { ComponentPropsDefinitionSection } from "@/wab/client/components/sidebar-tabs/ComponentPropsDefinitionSection";
import S from "@/wab/client/components/sidebar-tabs/ComponentTab/ComponentTab.module.scss";
import VariablesSection from "@/wab/client/components/sidebar-tabs/StateManagement/VariablesSection";
import { ComponentDataQueriesSection } from "@/wab/client/components/sidebar-tabs/component-data-queries-section";
import { LegacyComponentParamsSection } from "@/wab/client/components/sidebar-tabs/legacy-component-params-section";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { NamedPanelHeader } from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  VariantsPanel,
  VariantsPanelHandle,
} from "@/wab/client/components/variants/VariantsPanel";
import { HoverableDisclosure } from "@/wab/client/components/widgets/HoverableDisclosure";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import GearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Gear";
import PlumeMarkIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__PlumeMark";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import { Component, Variant, VariantGroup } from "@/wab/shared/model/classes";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import { canEditStyleSection } from "@/wab/shared/ui-config-utils";
import { observer } from "mobx-react";
import React from "react";
import { useLocalStorage } from "react-use";

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
