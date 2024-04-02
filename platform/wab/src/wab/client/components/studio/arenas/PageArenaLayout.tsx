import { ArenaFrame, ensureKnownVariant, PageArena } from "@/wab/classes";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { makeFrameSizeMenu } from "@/wab/client/components/menus/FrameSizeMenu";
import ExperimentCanvasButton from "@/wab/client/components/splits/ExperimentCanvasButton";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/common";
import { allComponentVariants } from "@/wab/components";
import { COMBINATIONS_CAP } from "@/wab/shared/Labels";
import { isBaseVariant, isStandaloneVariant } from "@/wab/shared/Variants";
import { allGlobalVariantGroups } from "@/wab/sites";
import { observer } from "mobx-react";
import React from "react";
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
            rowEndControls={() => (
              <VariantComboGhostFrame studioCtx={studioCtx} arena={arena} />
            )}
          />
        </>
      )}
    </div>
  );
});
