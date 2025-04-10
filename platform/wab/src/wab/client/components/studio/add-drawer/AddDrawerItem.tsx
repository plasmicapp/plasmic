// This is a skeleton starter React component generated by Plasmic.
// This file is owned by you, feel free to edit as you see fit.
import { getComponentPresets } from "@/wab/client/code-components/code-presets";
import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { ImagePreview } from "@/wab/client/components/style-controls/ImageSelector";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import {
  AddItem,
  AddTplItem,
  isTplAddItem,
} from "@/wab/client/definitions/insertables";
import AfterIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__After";
import BeforeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Before";
import { AddPresetIcon } from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__AddPreset";
import BoxControlsIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__BoxControls";
import { PlasmicAddDrawerItem } from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicAddDrawerItem";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isCodeComponent } from "@/wab/shared/core/components";
import { TplNode } from "@/wab/shared/model/classes";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

interface AddDrawerItemProps {
  studioCtx: StudioCtx;
  item: AddItem;
  matcher?: Matcher;
  isHighlighted?: boolean;
  onInserted?: (tplNode: TplNode | null) => void;
  validTplLocs?: Set<InsertRelLoc>;
  indent: number;
  showPreviewImage?: boolean;
}

function AddDrawerItem(props: AddDrawerItemProps) {
  const {
    item,
    matcher,
    onInserted,
    studioCtx,
    isHighlighted,
    validTplLocs,
    indent,
    showPreviewImage,
  } = props;
  const displayLabel = item.displayLabel ?? item.label;
  return (
    <Tooltip title={item.description}>
      <PlasmicAddDrawerItem
        root={{
          props: {
            "data-plasmic-class": "AddDrawerItem",
            "data-drawer-item-name": item.label,
          } as any,
        }}
        showPreviewImage={showPreviewImage}
        previewImage={
          <ImagePreview
            uri={item.type === "frame" ? item.addDrawerPreviewImage : ""}
          />
        }
        listItem={{
          style: {
            paddingLeft: 16 + indent * 20,
          },
        }}
        className="no-select"
        icon={item.icon}
        isHighlighted={isHighlighted}
        actions={
          isTplAddItem(item) ? (
            <InsertActions
              studioCtx={studioCtx}
              item={item}
              onInserted={onInserted}
              validTplLocs={validTplLocs}
            />
          ) : null
        }
      >
        {item.monospaced ? (
          <code>{displayLabel}</code>
        ) : (
          <>{matcher ? matcher.boldSnippets(displayLabel) : displayLabel}</>
        )}
      </PlasmicAddDrawerItem>
    </Tooltip>
  );
}

const InsertActions = observer(function InsertActions(props: {
  studioCtx: StudioCtx;
  item: AddTplItem;
  onInserted?: (tplNode: TplNode | null) => void;
  validTplLocs?: Set<InsertRelLoc>;
}) {
  const { studioCtx, item, onInserted, validTplLocs } = props;

  let preset: React.ReactElement | null = null;
  if (item.component && isCodeComponent(item.component)) {
    const component = item.component;
    if (getComponentPresets(studioCtx, item.component).length > 0) {
      preset = (
        <Tooltip title="Insert a component template" trigger="focus hover">
          <IconButton
            onClick={(e) => {
              studioCtx.showPresetsModal(component);
              e.stopPropagation();
            }}
            aria-label={`Insert presets...`}
          >
            <AddPresetIcon />
          </IconButton>
        </Tooltip>
      );
    }
  }

  const vc = studioCtx.focusedViewCtx();
  if (!vc || !validTplLocs) {
    return preset;
  }

  const insert = async (
    e: React.MouseEvent,
    loc: InsertRelLoc
  ): Promise<void> => {
    const extraInfo = item.asyncExtraInfo
      ? await item.asyncExtraInfo(studioCtx)
      : undefined;
    if (extraInfo === false) {
      return;
    }
    vc.change(() => {
      e.stopPropagation();
      const tplNode = vc
        .getViewOps()
        .tryInsertInsertableSpec(item, loc, extraInfo, undefined);
      onInserted?.(tplNode);
    });
  };

  return (
    <>
      {preset}
      {validTplLocs.has(InsertRelLoc.wrap) && item.canWrap && (
        <Tooltip title="Wrap current selection" trigger="focus hover">
          <IconButton
            onClick={async (e) => await insert(e, InsertRelLoc.wrap)}
            aria-label={`Wrap current selection with ${item.label}`}
            size="small"
            type="seamless"
          >
            <Icon icon={BoxControlsIcon} />
          </IconButton>
        </Tooltip>
      )}

      {validTplLocs.has(InsertRelLoc.before) && (
        <Tooltip title="Insert before current selection" trigger="focus hover">
          <IconButton
            onClick={async (e) => await insert(e, InsertRelLoc.before)}
            aria-label={`Insert ${item.label} before current selection`}
            size="small"
            type="seamless"
          >
            <Icon icon={BeforeIcon} />
          </IconButton>
        </Tooltip>
      )}

      {validTplLocs.has(InsertRelLoc.after) && (
        <Tooltip title="Insert after current selection" trigger="focus hover">
          <IconButton
            onClick={async (e) => await insert(e, InsertRelLoc.after)}
            aria-label={`Insert ${item.label} after current selection`}
            size="small"
            type="seamless"
          >
            <Icon icon={AfterIcon} />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
});

export default AddDrawerItem;
