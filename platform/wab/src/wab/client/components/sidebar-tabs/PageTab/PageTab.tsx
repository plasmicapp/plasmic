/** @format */

import { observer } from "mobx-react-lite";
import React from "react";
import { useLocalStorage } from "react-use";
import PageSettings from "../../../../../PageSettings";
import { PageComponent } from "../../../../components";
import { PublicStyleSection } from "../../../../shared/ApiSchema";
import { canEditStyleSection } from "../../../../shared/ui-config-utils";
import GearIcon from "../../../plasmic/plasmic_kit/PlasmicIcon__Gear";
import PageIcon from "../../../plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../../studio-ctx/view-ctx";
import { NamedPanelHeader } from "../../sidebar/sidebar-helpers";
import { SidebarSection } from "../../sidebar/SidebarSection";
import { TopModal } from "../../studio/TopModal";
import { VariantsPanel } from "../../variants/VariantsPanel";
import { Icon } from "../../widgets/Icon";
import { IconButton } from "../../widgets/IconButton";
import { ComponentDataQueriesSection } from "../component-data-queries-section";
import S from "../ComponentTab/ComponentTab.module.scss";
import PageMetaPanel from "../PageMetaPanel";
import { PageMinRoleSection } from "../PageMinRoleSection";
import PageURLParametersSection from "../PageURLParametersSection";
import VariablesSection from "../StateManagement/VariablesSection";

export const PageTab = observer(function PageTab(props: {
  viewCtx?: ViewCtx | null;
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
        title={appConfig.rightTabs ? undefined : headerTitle}
        controls={appConfig.rightTabs ? undefined : headerControls}
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
                      {appConfig.rightTabs && (
                        <SidebarSection>
                          <div className={S.componentTabHeaderContainer}>
                            {headerTitle}
                            {headerControls}
                          </div>
                        </SidebarSection>
                      )}
                      {canEdit(PublicStyleSection.PageMeta) && (
                        <>
                          <PageMetaPanel page={page} viewCtx={viewCtx} />
                          <PageURLParametersSection page={page} />
                          <PageMinRoleSection page={page} />
                        </>
                      )}
                      {canEdit(PublicStyleSection.DataQueries) && (
                        <ComponentDataQueriesSection
                          component={page}
                          viewCtx={viewCtx}
                        />
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
