import {
  Component,
  ProjectDependency,
  TplComponent,
  TplNode,
} from "@/wab/classes";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { checkAndNotifyUnsupportedHostVersion } from "@/wab/client/components/modals/codeComponentModals";
import S from "@/wab/client/components/sidebar-tabs/CustomBehaviorsSection.module.scss";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { maybeShowGlobalContextNotification } from "@/wab/client/components/studio/add-drawer/AddDrawer";
import * as widgets from "@/wab/client/components/widgets";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { ApplyCustomBehaviorsTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import OpenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Open";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert, ensure, ensureArray } from "@/wab/common";
import {
  getComponentDisplayName,
  isCodeComponent,
  isHostLessCodeComponent,
} from "@/wab/components";
import { DEVFLAGS } from "@/wab/devflags";
import { CUSTOM_BEHAVIORS_CAP } from "@/wab/shared/Labels";
import { getSlotParams } from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { isHostLessPackage } from "@/wab/sites";
import { SlotSelection } from "@/wab/slots";
import { isTplComponent } from "@/wab/tpls";
import { Dropdown, Menu } from "antd";
import { findIndex } from "lodash";
import { observer } from "mobx-react";
import React from "react";

export const CustomBehaviorsSection = observer(function (props: {
  tpl: TplNode;
  viewCtx: ViewCtx;
}) {
  const { tpl, viewCtx } = props;

  // Getting immediate parents that are code component attachments
  const ancestors = $$$(tpl).ancestors().toArray();
  const attachedComps = ancestors.slice(
    1,
    findIndex(
      ancestors,
      (anc) =>
        !(
          isTplComponent(anc) &&
          isCodeComponent(anc.component) &&
          anc.component.codeComponentMeta.isAttachment
        ),
      1
    )
  ) as TplComponent[];

  const components = getAttachmentComponents(viewCtx.studioCtx);
  const menu = getMenu(viewCtx, components, tpl);

  return (
    <SidebarSection
      title={
        <LabelWithDetailedTooltip tooltip={<ApplyCustomBehaviorsTooltip />}>
          {CUSTOM_BEHAVIORS_CAP}
        </LabelWithDetailedTooltip>
      }
      controls={
        <Dropdown overlay={menu} trigger={["click"]}>
          <IconLinkButton onClick={(e) => e.preventDefault()}>
            <Icon icon={PlusIcon} />
          </IconLinkButton>
        </Dropdown>
      }
    >
      {attachedComps.length > 0 && (
        <widgets.ListBox>
          {attachedComps.map((attach: TplComponent, index: /*TWZ*/ number) => {
            return (
              <widgets.ListBoxItem
                index={index}
                key={attach.uuid}
                {...{
                  onClick: () => {
                    viewCtx.change(() => {
                      viewCtx.setStudioFocusByTpl(attach);
                    });
                  },
                }}
                onRemove={() => detachComp(viewCtx, attach)}
                mainContent={
                  <div style={{ minWidth: 80 }}>
                    {getComponentDisplayName(attach.component)}
                  </div>
                }
                isDragDisabled={true}
                showGrip={false}
              />
            );
          })}
        </widgets.ListBox>
      )}
    </SidebarSection>
  );
});

export function getAttachmentComponents(studioCtx: StudioCtx) {
  const hostComponents = studioCtx.site.components.filter(
    (comp) => isCodeComponent(comp) && comp.codeComponentMeta.isAttachment
  );
  const hostLessDeps = studioCtx.site.projectDependencies.filter((dep) =>
    isHostLessPackage(dep.site)
  );
  const hostLessComponents = hostLessDeps
    .map((dep) => dep.site.components)
    .flat()
    .filter((comp) => {
      return (
        isHostLessCodeComponent(comp) && comp.codeComponentMeta?.isAttachment
      );
    });
  return hostComponents.concat(hostLessComponents);
}

export function getMenu(
  viewCtx: ViewCtx,
  components: Component[],
  selectedTpl: TplNode
) {
  const defaultPacksNames = [
    "react-awesome-reveal",
    "react-parallax-tilt",
    "react-scroll-parallax-global",
  ];
  const defaultPacks = (
    viewCtx.studioCtx.appCtx.appConfig.hostLessComponents ??
    DEVFLAGS.hostLessComponents
  )?.filter((meta) => defaultPacksNames.includes(meta.codeName ?? ""));
  const uninstalledPacks = defaultPacks?.filter((pack) => {
    const isInstalled = ensureArray(pack.projectId).every((projectId) =>
      viewCtx.studioCtx.site.projectDependencies.find(
        (dep) => dep.projectId === projectId
      )
    );
    return !isInstalled;
  });

  const builder = new MenuBuilder();

  builder.genSection("", (push) => {
    components.forEach((comp) => {
      push(
        <Menu.Item
          key={comp.uuid}
          onClick={() => {
            attachComp(viewCtx, comp, selectedTpl);
          }}
        >
          {getComponentDisplayName(comp)}
        </Menu.Item>
      );
    });
  });

  builder.genSection("Available from Component Store", (push) => {
    uninstalledPacks?.forEach((pack) => {
      push(
        <Menu.Item
          key={pack.codeName}
          onClick={async () => {
            if (checkAndNotifyUnsupportedHostVersion()) {
              return;
            }
            const projectDependencies: ProjectDependency[] = [];
            for (const id of ensureArray(pack.projectId)) {
              projectDependencies.push(
                await viewCtx.studioCtx.projectDependencyManager.addByProjectId(
                  id
                )
              );
            }

            projectDependencies.forEach((projectDependency) =>
              maybeShowGlobalContextNotification(
                viewCtx.studioCtx,
                projectDependency
              )
            );
            // Assumes the project has only one component
            const hostLessComps = projectDependencies
              .flatMap((projectDependency) => projectDependency.site.components)
              .filter(
                (comp) =>
                  isHostLessCodeComponent(comp) &&
                  comp.codeComponentMeta?.isAttachment
              );
            assert(
              hostLessComps.length == 1,
              "Assumes the project has only one component"
            );
            attachComp(viewCtx, hostLessComps[0], selectedTpl);
          }}
        >
          {pack.name}
        </Menu.Item>
      );
    });
    push(
      <Menu.Item key={"browse-store"}>
        <div className={S.root}>
          <OpenIcon />
          <a
            href="https://docs.plasmic.app/learn/custom-behaviors/"
            target="_blank"
          >
            Docs on adding custom behaviors
          </a>
        </div>
      </Menu.Item>
    );
  });

  return builder.build();
}
export function attachComp(
  viewCtx: ViewCtx,
  comp: Component,
  selectedTpl: TplNode
) {
  const tplComp = viewCtx.variantTplMgr().mkTplComponentX({
    component: comp,
  });
  const ss = new SlotSelection({
    tpl: tplComp,
    slotParam: getSlotParams(tplComp.component)[0],
  });
  // Clear the forked children slots
  $$$(tplComp).clear();
  if (viewCtx.getViewOps().canInsertAsParent(ss, selectedTpl, true)) {
    viewCtx.change(() => {
      viewCtx.getViewOps().insertAsParent(ss, selectedTpl);
      viewCtx.setStudioFocusByTpl(tplComp);
    });
  }
}

export function detachComp(viewCtx: ViewCtx, attachTpl: TplComponent) {
  const parent = ensure(attachTpl.parent, "Parent");
  const parentChildren = $$$(parent).children().toArray();
  const insertPos = findIndex(parentChildren, (child) => child === attachTpl);
  const newChildren = $$$(attachTpl).children().toArray().reverse();
  viewCtx.change(() => {
    $$$(attachTpl).tryRemove({ deep: true });
    newChildren.forEach((child) => {
      $$$(parent).insertAt(child, insertPos);
    });
  });
}
