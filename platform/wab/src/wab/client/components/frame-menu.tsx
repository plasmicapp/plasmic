import { Arena, ArenaFrame } from "@/wab/classes";
import {
  MenuBuilder,
  MenuItemContent,
} from "@/wab/client/components/menu-builder";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure } from "@/wab/common";
import {
  FrameViewMode,
  isDuplicatableFrame,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import {
  isBaseVariantFrame,
  isGlobalVariantFrame,
} from "@/wab/shared/component-arenas";
import { ARENA_LOWER, FRAME_LOWER } from "@/wab/shared/Labels";
import { isFrameWithVariantCombo } from "@/wab/shared/Variants";
import { Menu } from "antd";
import * as React from "react";

export function makeFrameMenu({
  viewCtx,
  onMenuClick,
  frame = viewCtx.arenaFrame(),
}: {
  viewCtx: ViewCtx;
  onMenuClick?: () => void;
  frame?: ArenaFrame;
}) {
  const originArena = ensure(viewCtx.studioCtx.currentArena);
  const _canCreateComponentFromFrame = !frame.container.component.name;

  const isCombinationPageArenaFrame =
    isPageArena(originArena) &&
    originArena.customMatrix.rows.some((r) =>
      r.cols.some((c) => c.frame === frame)
    );

  const builder = new MenuBuilder();

  if (isDuplicatableFrame(originArena, frame)) {
    const onClickToDuplicate = () =>
      viewCtx.change(() => viewCtx.getViewOps().duplicate(frame));
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          onClick={onClickToDuplicate}
          key={`duplicate-${FRAME_LOWER}`}
        >
          <MenuItemContent shortcut={getComboForAction("DUPLICATE")}>
            Duplicate {FRAME_LOWER}
          </MenuItemContent>
        </Menu.Item>
      );
    });
  }

  if (isMixedArena(originArena)) {
    const otherArenas = viewCtx.studioCtx.site.arenas.filter(
      (it) => it.uid !== originArena?.uid && isMixedArena(it)
    );
    const onClickToMoveToArena = (destinationArena: Arena) => () =>
      viewCtx.studioCtx.changeUnsafe(() =>
        viewCtx.studioCtx
          .siteOps()
          .moveFrameToArena(originArena, frame, destinationArena)
      );
    builder.genSub(`Move to ${ARENA_LOWER}...`, (push) => {
      for (const it of otherArenas) {
        push(
          <Menu.Item key={it.uid} onClick={onClickToMoveToArena(it)}>
            <MenuItemContent>{it.name}</MenuItemContent>
          </Menu.Item>
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-shadow
      builder.genSection(undefined, (push) => {
        push(
          <Menu.Item
            onClick={() =>
              viewCtx.studioCtx.changeUnsafe(() =>
                onClickToMoveToArena(
                  viewCtx.studioCtx.tplMgr().addArena(frame.name)
                )
              )
            }
            key={`new-${ARENA_LOWER}`}
          >
            <MenuItemContent>New {ARENA_LOWER}</MenuItemContent>
          </Menu.Item>
        );
      });
    });
  }

  if (_canCreateComponentFromFrame) {
    builder.genSection(undefined, (push) => {
      if (frame.viewMode === FrameViewMode.Stretch) {
        push(
          <Menu.Item
            key="extract-page"
            onClick={() =>
              viewCtx.getViewOps().convertFrameToComponent(undefined, "page")
            }
          >
            <MenuItemContent>Convert to a Page</MenuItemContent>
          </Menu.Item>
        );
      }

      push(
        <Menu.Item
          key="extract-component"
          onClick={() =>
            viewCtx.getViewOps().convertFrameToComponent(undefined, "component")
          }
        >
          <MenuItemContent>Convert to a reusable Component</MenuItemContent>
        </Menu.Item>
      );
    });
  }

  if (!isBaseVariantFrame(viewCtx.site, frame)) {
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          onClick={async () => viewCtx.getViewOps().deleteFrame(frame)}
          key={`delete-${FRAME_LOWER}`}
        >
          <MenuItemContent shortcut={getComboForAction("DELETE")}>
            {isPageArena(originArena) && !isCombinationPageArenaFrame
              ? "Delete this screen size"
              : "Delete " + FRAME_LOWER}
          </MenuItemContent>
        </Menu.Item>
      );
    });
  }

  if (isPageArena(originArena) && isGlobalVariantFrame(originArena, frame)) {
    const globalVariant = frame.targetGlobalVariants[0];
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          onClick={async () => {
            const response = await reactConfirm({
              title: "Delete " + FRAME_LOWER,
              message: (
                <>
                  This will clear all overrides for this variant in the current
                  page. Would you like to proceed?
                </>
              ),
            });
            if (response) {
              await viewCtx.studioCtx.change(({ success }) => {
                viewCtx.studioCtx
                  .siteOps()
                  .removePageArenaVariant(originArena, globalVariant);
                return success();
              });
            }
          }}
          key={`delete-global-variant-artboard`}
        >
          <MenuItemContent>
            Delete {FRAME_LOWER} for <strong>{globalVariant.name}</strong>
          </MenuItemContent>
        </Menu.Item>
      );
    });
  }

  if (
    (!isPageArena(originArena) &&
      isFrameWithVariantCombo({ site: viewCtx.site, frame })) ||
    isCombinationPageArenaFrame
  ) {
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          onClick={() =>
            viewCtx.change(() =>
              viewCtx.getViewOps().clearFrameComboSettings(frame)
            )
          }
          key={`clear-${FRAME_LOWER}`}
        >
          <MenuItemContent>Clear settings for this combo</MenuItemContent>
        </Menu.Item>
      );
    });
  }

  return builder.build({ onMenuClick, menuName: "frame-menu" });
}
