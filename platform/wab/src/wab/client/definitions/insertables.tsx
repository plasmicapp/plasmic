/** @format */

import {
  ensureTplColumnsRs,
  getScreenVariant,
  makeTplColumn,
} from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/tpl-columns-utils";
import { Icon } from "@/wab/client/components/widgets/Icon";
import {
  COMPONENT_ICON,
  FRAME_ICON,
  GRID_CONTAINER_ICON,
  HEADING_ICON,
  INPUT_ICON,
  PAGE_ICON,
  PASSWORD_INPUT_ICON,
  TEXTAREA_ICON,
} from "@/wab/client/icons";
import ButtonInputIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ButtonInput";
import HStackBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__HStackBlock";
import ImageBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ImageBlock";
import LinkIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Link";
import TextBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TextBlock";
import VStackBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__VStackBlock";
import BlockIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Block";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx, ensureBaseRs } from "@/wab/client/studio-ctx/view-ctx";
import {
  FREE_CONTAINER_CAP,
  HORIZ_CONTAINER_CAP,
  VERT_CONTAINER_CAP,
} from "@/wab/shared/Labels";
import { $$$ } from "@/wab/shared/TplQuery";
import { AddItemKey, WrapItemKey } from "@/wab/shared/add-item-keys";
import {
  adjustAllTplColumnsSizes,
  hasMaxWidthVariant,
} from "@/wab/shared/columns-utils";
import { spawn } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { CONTENT_LAYOUT_FULL_BLEED } from "@/wab/shared/core/style-props";
import {
  TplColumnsTag,
  TplTagType,
  reconnectChildren,
} from "@/wab/shared/core/tpls";
import {
  CONTENT_LAYOUT_INITIALS,
  getSimplifiedStyles,
} from "@/wab/shared/default-styles";
import {
  HostLessComponentInfo,
  HostLessPackageInfo,
} from "@/wab/shared/devflags";
import { Rect } from "@/wab/shared/geom";
import { CloneOpts } from "@/wab/shared/insertable-templates/types";
import { Arena, Component, TplNode, TplTag } from "@/wab/shared/model/classes";
import L from "lodash";
import * as React from "react";
import { FaListOl, FaListUl, FaPlus } from "react-icons/fa";

export enum AddItemType {
  frame = "frame",
  tpl = "tpl",
  plume = "plume",
  installable = "installable",
  fake = "fake",
}

interface AddItemCommon {
  label: string;
  /** Small icon shown when item is displayed in a single line. */
  icon: React.ReactNode;
  displayLabel?: React.ReactNode;
  /**
   * If a hostless component is not installed, `hostlessComponentName` is present.
   * Otherwise, the hostless component would be presented as `component`.
   */
  systemName?: string;
  /** Show a NEW banner over the item. **/
  isNew?: boolean;
  /**
   * Indicates the item can be displayed compactly to fit multiple items
   * in the same row. Requires a preview image/video.
   */
  isCompact?: boolean;
  previewImageUrl?: string;
  previewVideoUrl?: string;
  description?: string;
  /** Uses a monospace font for the label, usually for code libraries. */
  monospaced?: boolean;
}

export type AddInstallableItem<T = any> = AddItemCommon & {
  key: string;
  type: AddItemType.installable;
  isPackage: boolean;
  // Assumed to run inside sc.change()
  factory: (
    studioCtx: StudioCtx,
    extraInfo: T
  ) => Arena | Component | undefined;
  asyncExtraInfo?: (studioCtx: StudioCtx) => Promise<T>;
};

export type AddFrameItem = AddItemCommon & {
  key: AddItemKey;
  type: AddItemType.frame;
  // Assumed to run inside sc.change()
  onInsert: (studioCtx: StudioCtx) => void;
  addDrawerPreviewImage?: string; // URL to a preview image
};

export type ExtraInfoOpts = {
  isDragging?: boolean;
} & CloneOpts;

export type AddTplItem<T = any> = AddItemCommon & {
  key: AddItemKey | string;
  type: AddItemType.tpl | AddItemType.plume;
  // Assumed to run inside sc.change()
  factory: (viewCtx: ViewCtx, extraInfo: T) => TplNode | undefined;
  /**
   * Assumed to be run just outside sc.change().
   * This will get called twice when user is dragging an item:
   * 1. First will get called with isDragging = true at the beginning of the drag
   * 2. Second will get called with isDragging = false at the end of the drag
   * This needs to be called before factory, passing the results in
   */
  asyncExtraInfo?: (
    studioCtx: StudioCtx,
    opts?: ExtraInfoOpts
  ) => Promise<T | false>;
  canWrap?: boolean;
  component?: Component;
  previewImageUrl?: string;
};

export type AddFakeItem<T = any> = AddItemCommon & {
  key: AddItemKey | string;
  type: AddItemType.fake;
  label: string;
  systemName?: string;
  isPackage?: boolean;
  hostLessComponentInfo?: HostLessComponentInfo;
  hostLessPackageInfo?: HostLessPackageInfo;
  displayLabel?: React.ReactNode;
  icon: React.ReactNode;
  // Assumed to run inside sc.change()
  factory: (studioCtx: StudioCtx, extraInfo: T) => boolean;
  asyncExtraInfo?: (studioCtx: StudioCtx) => Promise<T>;
  component?: Component;
};

export function isTplAddItem(item: AddItem): item is AddTplItem {
  return item.type === AddItemType.tpl || item.type === AddItemType.plume;
}

export const INSERTABLE_TEMPLATE_COMPONENT_KEY_PREFIX =
  "insertable-template-component-";

export function isTemplateComponent(item: AddItem): boolean {
  return (
    isTplAddItem(item) &&
    // Ensure that we have template info either within the component or in the item's devflag meta
    (!!item.component?.templateInfo ||
      item.key.startsWith(INSERTABLE_TEMPLATE_COMPONENT_KEY_PREFIX))
  );
}

export type AddItem =
  | AddFrameItem
  | AddTplItem
  | AddFakeItem
  | AddInstallableItem;

export const isAddItem = (i: { type: string }): i is AddItem =>
  L.values(AddItemType).includes(i.type as AddItemType);

function mkListItem(vc: ViewCtx) {
  // We create a wrapper li to have display: "list-item" because
  // it is required to style the list correctly.
  const children = vc
    .variantTplMgr()
    .mkTplTagX("div", undefined, [
      vc.variantTplMgr().mkTplInlinedText("Enter some text", "div"),
    ]);
  const tag = vc.variantTplMgr().mkTplTagX("li", undefined, [children]);
  ensureBaseRs(vc, tag, { display: "list-item" });
  return tag;
}

function mkList(vc: ViewCtx, tag: "ol" | "ul") {
  const item = mkListItem(vc);
  const list = vc.variantTplMgr().mkTplTagX(tag);
  list.children = [item];
  reconnectChildren(list);
  ensureBaseRs(vc, list, {});
  return list;
}

export const INSERTABLES: readonly AddItem[] = [
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.box as const,
    label: FREE_CONTAINER_CAP,
    canWrap: true,
    icon: <Icon icon={BlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/box.svg",
    factory: (vc: ViewCtx) => {
      const tag = vc.variantTplMgr().mkTplTagX("div");
      ensureBaseRs(vc, tag, {
        position: "relative",
        display: "block",
        ...getSimplifiedStyles(AddItemKey.box, vc.studioCtx.getAddItemPrefs()),
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.hstack as const,
    label: HORIZ_CONTAINER_CAP,
    canWrap: true,
    icon: <Icon icon={HStackBlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/hstack.svg",
    factory: (vc: ViewCtx) => {
      const tag = vc.variantTplMgr().mkTplTagX("div");
      ensureBaseRs(vc, tag, {
        display: "flex",
        flexDirection: "row",
        position: "relative",
        ...getSimplifiedStyles(
          AddItemKey.hstack,
          vc.studioCtx.getAddItemPrefs()
        ),
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.vstack as const,
    label: VERT_CONTAINER_CAP,
    canWrap: true,
    icon: <Icon icon={VStackBlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/vstack.svg",
    factory: (vc: ViewCtx) => {
      const tag = vc.variantTplMgr().mkTplTagX("div");
      ensureBaseRs(vc, tag, {
        display: "flex",
        flexDirection: "column",
        position: "relative",
        ...getSimplifiedStyles(
          AddItemKey.vstack,
          vc.studioCtx.getAddItemPrefs()
        ),
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.ul as const,
    label: "Unordered list",
    canWrap: true,
    icon: <FaListUl />,
    factory: (vc: ViewCtx) => mkList(vc, "ul"),
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.ol as const,
    label: "Ordered list",
    canWrap: true,
    icon: <FaListOl />,
    factory: (vc: ViewCtx) => mkList(vc, "ol"),
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.li as const,
    label: "List item",
    canWrap: false,
    icon: <FaPlus />,
    factory: (vc: ViewCtx) => mkListItem(vc),
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.columns as const,
    label: "Responsive columns",
    icon: <Icon icon={HStackBlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/columns.svg",
    factory: (vc: ViewCtx) => {
      const tag = vc
        .variantTplMgr()
        .mkTplTagX("div", { type: TplTagType.Columns });

      const variant = getScreenVariant(vc);
      const isBaseColumn = variant && !hasMaxWidthVariant(variant);

      ensureTplColumnsRs(
        vc,
        tag,
        variant,
        isBaseColumn,
        getSimplifiedStyles(AddItemKey.columns, vc.studioCtx.getAddItemPrefs())
      );

      L.range(2).forEach(() => {
        $$$(tag).append(
          makeTplColumn(
            vc,
            getSimplifiedStyles(
              AddItemKey.vstack,
              vc.studioCtx.getAddItemPrefs()
            )
          )
        );
      });

      adjustAllTplColumnsSizes(tag as TplColumnsTag, vc.variantTplMgr());
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.grid as const,
    label: "Grid",
    icon: GRID_CONTAINER_ICON,
    previewImageUrl: "https://static1.plasmic.app/insertables/grid.svg",
    canWrap: true,
    factory(vc: ViewCtx) {
      const tag = vc.variantTplMgr().mkTplTagX("div");
      ensureBaseRs(vc, tag, {
        position: "relative",
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        ...getSimplifiedStyles(AddItemKey.grid, vc.studioCtx.getAddItemPrefs()),
      });

      L.range(2).forEach(() => {
        const vertStack = vc.variantTplMgr().mkTplTagX("div");
        ensureBaseRs(
          vc,
          vertStack,
          getSimplifiedStyles(AddItemKey.vstack, vc.studioCtx.getAddItemPrefs())
        );
        $$$(tag).append(vertStack);
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.section as const,
    label: "Page section",
    icon: GRID_CONTAINER_ICON,
    previewImageUrl: "https://static1.plasmic.app/insertables/section.svg",
    canWrap: true,
    factory(vc: ViewCtx) {
      const tag = vc.variantTplMgr().mkTplTagX("section");
      ensureBaseRs(vc, tag, {
        position: "relative",
        ...CONTENT_LAYOUT_INITIALS,
        ...getSimplifiedStyles(
          AddItemKey.section,
          vc.studioCtx.getAddItemPrefs()
        ),
        width: CONTENT_LAYOUT_FULL_BLEED,
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.stack as const,
    label: "Stack",
    icon: <Icon icon={VStackBlockIcon} />,
    canWrap: true,
    factory(vc: ViewCtx, drawnRect?: Rect) {
      const tag = vc.variantTplMgr().mkTplTagX("div");
      ensureBaseRs(vc, tag, {
        display: "flex",
        flexDirection:
          drawnRect && drawnRect.height > drawnRect.width ? "column" : "row",
        position: "relative",
        alignItems: "stretch",
        justifyContent: "flex-start",
        ...getSimplifiedStyles(
          AddItemKey.stack,
          vc.studioCtx.getAddItemPrefs()
        ),
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.text as const,
    label: "Text",
    canWrap: false,
    icon: <Icon icon={TextBlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/text.svg",
    factory: (vc: ViewCtx) => {
      const tag = vc.variantTplMgr().mkTplInlinedText("Enter some text", "div");
      ensureBaseRs(vc, tag, {
        position: "relative",
        ...getSimplifiedStyles(AddItemKey.text, vc.studioCtx.getAddItemPrefs()),
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.image as const,
    label: "Image",
    icon: <Icon icon={ImageBlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/image.svg",
    canWrap: false,
    factory(vc: ViewCtx) {
      const vtm = vc.variantTplMgr();
      const tag = vtm.mkTplImage({ type: ImageAssetType.Picture });
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(AddItemKey.image, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.icon as const,
    label: "Icon",
    icon: <Icon icon={ImageBlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/icon.svg",
    canWrap: false,
    factory(vc: ViewCtx) {
      const vtm = vc.variantTplMgr();
      const tag = vtm.mkTplImage({ type: ImageAssetType.Icon });
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(AddItemKey.icon, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.link as const,
    label: "Link",
    icon: <Icon icon={LinkIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/link.svg",
    canWrap: true,
    factory(vc: ViewCtx) {
      const vtm = vc.variantTplMgr();
      const tag = vtm.mkTplInlinedText("Some link text", "a", {
        attrs: {
          href: "https://www.plasmic.app/",
        },
      });
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(AddItemKey.link, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.linkContainer as const,
    canWrap: true,
    label: "Link container",
    icon: <Icon icon={LinkIcon} />,
    previewImageUrl:
      "https://static1.plasmic.app/insertables/linkContainer.svg",
    factory(vc: ViewCtx) {
      const tag = vc.variantTplMgr().mkTplTagX("a");
      ensureBaseRs(vc, tag, {
        display: "flex",
        flexDirection: "row",
        position: "relative",
        alignItems: "stretch",
        justifyContent: "flex-start",
        ...getSimplifiedStyles(
          AddItemKey.hstack,
          vc.studioCtx.getAddItemPrefs()
        ),
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.button as const,
    label: "Unstyled button",
    displayLabel: (
      <span>
        Unstyled <code>{"<button/>"}</code>
      </span>
    ),
    canWrap: true,
    icon: <Icon icon={ButtonInputIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/button.svg",
    factory(vc: ViewCtx) {
      const vtm = vc.variantTplMgr();
      const tag = vtm.mkTplInlinedText("Click Me", "button");
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(AddItemKey.button, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.textbox as const,
    label: "Unstyled text input",
    displayLabel: (
      <span>
        Unstyled <code>{"<input type='text'/>"}</code>
      </span>
    ),
    icon: INPUT_ICON,
    factory(vc: ViewCtx) {
      // input element has a default `size` attribute that often interferes
      // with sizing its width (for example, if it's set to "stretch" but it's
      // in a container that's shorter than its default `size` attribute).
      // Instead of asking the user to juggle the size attribute to overcome this,
      // though, we will just set it as "1" (cannot set it as 0, which is treated
      // as not setting it at all), and then provide a default width instead.
      const vtm = vc.variantTplMgr();
      const tag = vtm.mkTplTagX("input", {
        attrs: {
          type: "text",
          placeholder: "Some placeholder",
          value: "Some value",
          size: 1,
        },
      });
      vc.getViewOps().renameTpl(AddItemKey.textbox, tag, vc.component);
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(AddItemKey.textbox, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.textarea as const,
    label: "Multiline input",
    displayLabel: (
      <span>
        Multiline text input <code>{"<textarea/>"}</code>
      </span>
    ),
    icon: TEXTAREA_ICON,
    previewImageUrl: "https://static1.plasmic.app/insertables/textarea.svg",
    factory(vc: ViewCtx) {
      const tag = vc.variantTplMgr().mkTplTagX("textarea", {
        attrs: { value: "This is a text area." },
      });
      vc.getViewOps().renameTpl(AddItemKey.textarea, tag, vc.component);
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(AddItemKey.textarea, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.password as const,
    label: "Password input",
    icon: PASSWORD_INPUT_ICON,
    previewImageUrl: "https://static1.plasmic.app/insertables/password.svg",
    factory(vc: ViewCtx) {
      const tag = vc.variantTplMgr().mkTplTagX("input", {
        attrs: { type: "password", size: 1, value: "Some password" },
      });
      vc.getViewOps().renameTpl(AddItemKey.password, tag, vc.component);
      ensureBaseRs(vc, tag, {
        width: "180px",
        ...getSimplifiedStyles(
          AddItemKey.password,
          vc.studioCtx.getAddItemPrefs()
        ),
      });
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: AddItemKey.heading as const,
    label: "Heading",
    icon: HEADING_ICON,
    previewImageUrl: "https://static1.plasmic.app/insertables/heading.svg",
    factory(vc: ViewCtx) {
      const vtm = vc.variantTplMgr();
      const tag = vtm.mkTplInlinedText(
        "You won't believe what happens next.",
        "h1"
      );
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(AddItemKey.heading, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
  {
    type: AddItemType.frame as const,
    key: AddItemKey.pageFrame as const,
    label: "New page",
    icon: PAGE_ICON,
    onInsert: (studioCtx: StudioCtx) =>
      spawn(studioCtx.siteOps().createFrameForNewPage()),
  },
  {
    type: AddItemType.frame as const,
    key: AddItemKey.componentFrame as const,
    label: "New component",
    icon: COMPONENT_ICON,
    onInsert: (studioCtx: StudioCtx) =>
      spawn(studioCtx.siteOps().createFrameForNewComponent()),
  },
  {
    type: AddItemType.frame as const,
    key: AddItemKey.screenFrame as const,
    label: `New scratch artboard`,
    icon: FRAME_ICON,
    onInsert: (studioCtx: StudioCtx) => {
      const component = studioCtx
        .tplMgr()
        .addComponent({ type: ComponentType.Frame });
      studioCtx.siteOps().createNewFrameForMixedArena(component);
    },
  },
] as const;

export const INSERTABLES_MAP: Record<string, AddItem> = L.keyBy(
  INSERTABLES,
  (x) => x.key
);

export const WRAPPERS: AddTplItem[] = [
  {
    type: AddItemType.tpl as const,
    key: WrapItemKey.hstack as const,
    label: HORIZ_CONTAINER_CAP,
    icon: <Icon icon={HStackBlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/hstack.svg",
    factory: (vc: ViewCtx) => {
      const tag = (INSERTABLES_MAP[AddItemKey.hstack] as AddTplItem).factory(
        vc,
        null
      ) as TplTag;
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(WrapItemKey.hstack, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
  {
    type: AddItemType.tpl as const,
    key: WrapItemKey.vstack as const,
    label: VERT_CONTAINER_CAP,
    canWrap: true,
    icon: <Icon icon={VStackBlockIcon} />,
    previewImageUrl: "https://static1.plasmic.app/insertables/vstack.svg",
    factory: (vc: ViewCtx) => {
      const tag = (INSERTABLES_MAP[AddItemKey.vstack] as AddTplItem).factory(
        vc,
        null
      ) as TplTag;
      ensureBaseRs(
        vc,
        tag,
        getSimplifiedStyles(WrapItemKey.vstack, vc.studioCtx.getAddItemPrefs())
      );
      return tag;
    },
  },
];

export const WRAPPERS_MAP: Record<string, AddItem> = L.keyBy(
  WRAPPERS,
  (x) => x.key
);
