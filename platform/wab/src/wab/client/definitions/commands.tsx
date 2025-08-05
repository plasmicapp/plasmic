import { importProjectWithPrompt } from "@/wab/client/components/sidebar/ProjectDependencies";
import {
  ARROW_LEFT_ICON,
  COMPONENT_ICON,
  CREATE_ICON,
  FETCH_ICON,
  FRAME_ICON,
  PAGE_ICON,
} from "@/wab/client/icons";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import L from "lodash";
import * as React from "react";

export enum CommandItemKey {
  screenFrame = "screenFrame",
  componentFrame = "componentFrame",
  pageFrame = "pageFrame",
  newColorToken = "newColorToken",
  newSpaceToken = "newSpaceToken",
  newFontSizeToken = "newFontSizeToken",
  newLineHeightToken = "newLineHeightToken",
  newOpacityToken = "newOpacityToken",
  newMixin = "newMixin",
  newIcon = "newIcon",
  newImage = "newImage",
  gotoDashboard = "gotoDashboard",
  importProject = "importProject",
  cloneProject = "cloneProject",
  copyProjectId = "copyProjectId",
}

export enum CommandItemType {
  run = "run",
  focus = "focus",
  new = "new",
}

export interface CommandItem {
  key: string;
  type: CommandItemType;
  label: string;
  icon: React.ReactNode;
  // Not assumed to run within sc.change()
  // use sc.change yourself inside the action if you need to
  action: (studioCtx: StudioCtx) => Promise<void>;
}

export const isCommandItem = (i: { type: string }) =>
  L.values(CommandItemType).includes(i.type as CommandItemType);

export const COMMANDS: readonly CommandItem[] = [
  {
    type: CommandItemType.new as const,
    key: CommandItemKey.pageFrame as const,
    label: "New page",
    icon: PAGE_ICON,
    action: async (studioCtx: StudioCtx) => {
      await studioCtx.siteOps().createFrameForNewPage();
    },
  },
  {
    type: CommandItemType.new as const,
    key: CommandItemKey.componentFrame as const,
    label: "New component",
    icon: COMPONENT_ICON,
    action: async (studioCtx: StudioCtx) => {
      await studioCtx.siteOps().createFrameForNewComponent();
    },
  },
  {
    type: CommandItemType.new as const,
    key: CommandItemKey.screenFrame as const,
    label: `New scratch artboard`,
    icon: FRAME_ICON,
    action: async (studioCtx: StudioCtx) => {
      await studioCtx.changeUnsafe(() => {
        const component = studioCtx
          .tplMgr()
          .addComponent({ type: ComponentType.Frame });
        studioCtx.siteOps().createNewFrameForMixedArena(component);
      });
    },
  },
  {
    type: CommandItemType.run as const,
    key: CommandItemKey.gotoDashboard as const,
    label: `Return to Dashboard`,
    icon: ARROW_LEFT_ICON,
    action: async (studioCtx: StudioCtx) => {
      assert(window.top, "Unexpected null reference");
      window.top.location.href = fillRoute(APP_ROUTES.dashboard, {});
    },
  },
  {
    type: CommandItemType.run as const,
    key: CommandItemKey.importProject as const,
    label: `Import Project`,
    icon: FETCH_ICON,
    action: async (studioCtx: StudioCtx) => importProjectWithPrompt(studioCtx),
  },
  {
    type: CommandItemType.run as const,
    key: CommandItemKey.cloneProject as const,
    label: `Clone this project`,
    icon: CREATE_ICON,
    action: async (studioCtx: StudioCtx) => {
      const { projectId: newProjectId } =
        await studioCtx.appCtx.api.cloneProject(studioCtx.siteInfo.id);
      assert(window.top, "Unexpected null reference");
      window.top.location.href = fillRoute(APP_ROUTES.project, {
        projectId: newProjectId,
      });
    },
  },
];

export const COMMANDS_MAP: Record<string, CommandItem> = L.keyBy(
  COMMANDS,
  (x) => x.key
);
