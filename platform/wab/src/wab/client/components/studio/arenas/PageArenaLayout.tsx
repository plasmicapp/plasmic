import { observer } from "mobx-react-lite";
import React from "react";
import { ArenaFrame, ensureKnownVariant, PageArena } from "../../../../classes";
import { spawn } from "../../../../common";
import { allComponentVariants } from "../../../../components";
import { COMBINATIONS_CAP } from "../../../../shared/Labels";
import {
  isBaseVariant,
  isStandaloneVariant,
} from "../../../../shared/Variants";
import { allGlobalVariantGroups } from "../../../../sites";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { CanvasCtx } from "../../canvas/canvas-ctx";
import { makeFrameSizeMenu } from "../../menus/FrameSizeMenu";
import ExperimentCanvasButton from "../../splits/ExperimentCanvasButton";
import { VariantComboGhostFrame } from "./ComponentArenaLayout";
import sty from "./ComponentArenaLayout.module.sass";
import { GhostFrame } from "./GhostFrame";
import { GridFramesLayout } from "./GridFramesLayout";

export const PageArenaLayout = observer(function PageArenaLayout(props: {
  studioCtx: StudioCtx;
  arena: PageArena;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
}) {
  const { studioCtx, arena, onFrameLoad } = props;
  const component = arena.component;

  const componentVariants = allComponentVariants(component);
  const globalVariants = allGlobalVariantGroups(studioCtx.site, {
    includeDeps: "direct",
  });

  const allowCombos = componentVariants.length + globalVariants.length > 2;

  return (
    <div>
      <GridFramesLayout
        arena={arena}
        grid={arena.matrix}
        onFrameLoad={onFrameLoad}
        makeRowLabel={(row, _index) => {
          const variant = ensureKnownVariant(row.rowKey);
          if (isBaseVariant(variant)) {
            return null;
          } else if (isStandaloneVariant(variant)) {
            return variant.name;
          } else {
            return `${variant.parent?.param.variable.name}: ${variant.name}`;
          }
        }}
        makeRowLabelControls={(row, _index) => {
          const variant = ensureKnownVariant(row.rowKey);
          if (
            isBaseVariant(variant) ||
            isStandaloneVariant(variant) ||
            !variant.parent
          ) {
            return null;
          }
          const group = variant.parent;
          return <ExperimentCanvasButton group={group} />;
        }}
        rowEndControls={(_row, _index) => {
          return (
            <GhostFrame
              tooltip="Add screen size"
              data-event="page-arena-add-screen-size"
              menu={() =>
                makeFrameSizeMenu({
                  studioCtx,
                  onClick: (size) => {
                    spawn(
                      studioCtx.changeUnsafe(() => {
                        studioCtx.siteOps().addScreenSizeToPageArenas(size);
                      })
                    );
                  },
                })
              }
            />
          );
        }}
      />
      {allowCombos && (
        <>
          <div className="overflow-hidden">
            <hr
              className={sty.customGridDivider}
              style={{ transform: `scale(${1 / studioCtx.zoom})` }}
            />
          </div>
          <GridFramesLayout
            arena={arena}
            grid={arena.customMatrix}
            onFrameLoad={onFrameLoad}
            makeRowLabel={() => COMBINATIONS_CAP}
            className={sty.customGrid}
            rowEndControls={() => (
              <VariantComboGhostFrame studioCtx={studioCtx} arena={arena} />
            )}
          />
        </>
      )}
    </div>
  );
});
