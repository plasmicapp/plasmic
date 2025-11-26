/** @format */

import PageSettings from "@/wab/client/components/PageSettings";
import S from "@/wab/client/components/sidebar-tabs/ComponentTab/ComponentTab.module.scss";
import PageMetaPanel from "@/wab/client/components/sidebar-tabs/PageMetaPanel";
import { PageMinRoleSection } from "@/wab/client/components/sidebar-tabs/PageMinRoleSection";
import { PageURLParametersSection } from "@/wab/client/components/sidebar-tabs/PageURLParametersSection";
import VariablesSection from "@/wab/client/components/sidebar-tabs/StateManagement/VariablesSection";
import { ComponentDataQueriesSection } from "@/wab/client/components/sidebar-tabs/component-data-queries-section";
import { ServerQueriesSection } from "@/wab/client/components/sidebar-tabs/server-queries-section";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { NamedPanelHeader } from "@/wab/client/components/sidebar/sidebar-helpers";
import { TopModal } from "@/wab/client/components/studio/TopModal";
import { VariantsPanel } from "@/wab/client/components/variants/VariantsPanel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import GearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Gear";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import { PageComponent } from "@/wab/shared/core/components";
import { canEditStyleSection } from "@/wab/shared/ui-config-utils";
import { observer } from "mobx-react";
import React from "react";
import { useLocalStorage } from "react-use";

export const PageTab = observer(function PageTab(props: {
  viewCtx: ViewCtx;
  studioCtx: StudioCtx;
  page: PageComponent;
  isHalf?: boolean;
}) {
  const { studioCtx, page, viewCtx, isHalf = false } = props;

  const appConfig = studioCtx.appCtx.appConfig;
  const [showSettings, setShowSettings] = React.useState(false);
  const [isExpanded, setExpanded] = useLocalStorage(
    "PageTab.isExpanded",
    false
  );

  const uiConfig = studioCtx.getCurrentUiConfig();

  const canEdit = (section: PublicStyleSection) => {
    return canEditStyleSection(uiConfig, section, {
      isContentCreator: studioCtx.contentEditorMode,
      defaultContentEditorVisible: false,
    });
  };

  const headerTitle = React.useMemo(
    () => (
      <NamedPanelHeader
        icon={<Icon icon={PageIcon} className="component-fg" />}
        value={page.name}
        onChange={(name) =>
          studioCtx.changeUnsafe(() =>
            studioCtx.siteOps().tryRenameComponent(page, name)
          )
        }
        placeholder={`(unnamed page)`}
      />
    ),
    [page, page.name]
  );

  const headerControls = React.useMemo(
    () =>
      canEdit(PublicStyleSection.PageMeta) && (
        <IconButton
          tooltip="Page settings"
          onClick={() => setShowSettings(true)}
        >
          <Icon icon={GearIcon} />
        </IconButton>
      ),
    []
  );

  return (
    <>
      {showSettings && (
        <TopModal title="Page Settings" onClose={() => setShowSettings(false)}>
          <PageSettings page={page} />
        </TopModal>
      )}
      <SidebarSection
        style={{ paddingTop: 0 }}
        zeroBodyPadding
        scrollable
        defaultExtraContentExpanded={isExpanded}
        onExtraContentCollapsed={() => setExpanded(false)}
        onExtraContentExpanded={() => setExpanded(true)}
        title={undefined}
        controls={undefined}
      >
        {(renderMaybeCollapsibleRows) => {
          return (
            <>
              {renderMaybeCollapsibleRows([
                {
                  collapsible:
                    isHalf && !!studioCtx.focusedViewCtx()?.focusedTpl(),
                  content: (
                    <>
                      <SidebarSection>
                        <div className={S.componentTabHeaderContainer}>
                          {headerTitle}
                          {headerControls}
                        </div>
                      </SidebarSection>
                      {canEdit(PublicStyleSection.PageMeta) && (
                        <>
                          <PageMetaPanel page={page} viewCtx={viewCtx} />
                          <PageURLParametersSection page={page} />
                          <PageMinRoleSection page={page} />
                        </>
                      )}
                      {canEdit(PublicStyleSection.DataQueries) && (
                        <>
                          <ComponentDataQueriesSection
                            component={page}
                            viewCtx={viewCtx}
                          />
                          {appConfig.serverQueries && (
                            <ServerQueriesSection
                              component={page}
                              viewCtx={viewCtx}
                            />
                          )}
                        </>
                      )}

                      {canEdit(PublicStyleSection.States) && (
                        <VariablesSection component={page} viewCtx={viewCtx} />
                      )}
                      {canEdit(PublicStyleSection.ComponentVariants) && (
                        <VariantsPanel
                          component={page}
                          studioCtx={studioCtx}
                          viewCtx={viewCtx}
                        />
                      )}
                    </>
                  ),
                },
              ])}
            </>
          );
        }}
      </SidebarSection>
    </>
  );
});
