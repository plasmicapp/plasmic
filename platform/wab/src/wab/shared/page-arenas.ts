import { ensure, ensureArrayOfInstances, partitions } from "@/wab/shared/common";
import { insertAt, removeFromArray } from "@/wab/commons/collections";
import { allComponentVariants } from "@/wab/shared/core/components";
import {
  ensureActivatedScreenVariantsForArena,
  ensureActivatedScreenVariantsForFrameByWidth,
  FrameViewMode,
  isHeightAutoDerived,
  mkArenaFrame,
  updateAutoDerivedFrameHeight,
} from "@/wab/shared/Arenas";
import { usedGlobalVariantGroups } from "@/wab/shared/cached-selectors";
import {
  ensureCellKey,
  makeComponentArenaCustomMatrix,
} from "@/wab/shared/component-arenas";
import {
  ArenaFrame,
  ArenaFrameCell,
  ArenaFrameGrid,
  ArenaFrameRow,
  Component,
  ensureKnownVariant,
  ensureMaybeKnownVariant,
  isKnownVariant,
  PageArena,
  Site,
  Variant,
  VariantGroup,
} from "@/wab/shared/model/classes";
import { ResponsiveStrategy } from "@/wab/shared/responsiveness";
import {
  ensureVariantSetting,
  isGlobalVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isScreenVariantGroup,
  makeVariantName,
} from "@/wab/shared/Variants";
import {
  allGlobalVariants,
  getResponsiveStrategy,
  getSiteScreenSizes,
} from "@/wab/shared/core/sites";
import { orderBy } from "lodash";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { IObservableArray } from "mobx";

export function mkPageArena({
  component,
  site,
}: {
  component: Component;
  site: Site;
}) {
  const arena = new PageArena({
    component,
    matrix: makeDefaultPageArenaMatrix(site, component),
    customMatrix: makeComponentArenaCustomMatrix(site, component),
  });
  ensureActivatedScreenVariantsForArena(site, arena);
  return arena;
}

function makeDefaultPageArenaMatrix(site: Site, component: Component) {
  const globalGroups = usedGlobalVariantGroups(site, component).filter(
    (g) => !isScreenVariantGroup(g)
  );

  const variants = [
    ...allComponentVariants(component).filter((v) => !isPrivateStyleVariant(v)),
    ...globalGroups.flatMap((g) => g.variants),
  ];
  return new ArenaFrameGrid({
    rows: variants.map((variant) => makeFrameRow(site, component, variant)),
  });
}

export function makePageArenaFrame(
  site: Site,
  component: Component,
  variants: Variant[],
  width: number,
  height: number
) {
  const [globals, locals] = partitions(variants, [isGlobalVariant]);
  const frame = mkArenaFrame({
    site,
    name: "",
    width: width,
    height: height,
    component,
    targetVariants: [...locals],
    targetGlobalVariants: [...globals],
    viewMode: FrameViewMode.Stretch,
  });
  ensureVariantSetting(frame.container, [site.globalVariant]);
  ensureActivatedScreenVariantsForFrameByWidth(site, frame);
  return frame;
}

function makeFrameRow(site: Site, component: Component, variant: Variant) {
  const sizes = getSiteScreenSizes(site);
  return new ArenaFrameRow({
    rowKey: variant,
    cols: sizes.map((size) => {
      const frame = makePageArenaFrame(
        site,
        component,
        [variant],
        size.width,
        size.height
      );
      return new ArenaFrameCell({
        cellKey: undefined,
        frame,
      });
    }),
  });
}

export function removeManagedFramesFromPageArenaForVariants(
  arena: PageArena,
  variants: Variant[]
) {
  // We only do this for managed artboards (arena.matrix.rows).
  // For custom artboards, we will just stop targeting / pinning
  // the removed variant, as we do for all artboards
  for (const row of [...arena.matrix.rows]) {
    if (row.rowKey && variants.includes(row.rowKey as any)) {
      removeFromArray(arena.matrix.rows, row);
    }
  }
  for (const row of arena.customMatrix.rows) {
    for (const cell of [...row.cols]) {
      if (
        ensureArrayOfInstances(ensureCellKey(cell), Variant).some((v) =>
          variants.includes(v)
        )
      ) {
        removeFromArray(row.cols, cell);
      }
    }
  }
}

export function removeManagedFramesFromPageArenaForVariantGroup(
  arena: PageArena,
  group: VariantGroup
) {
  for (const row of [...arena.matrix.rows]) {
    if (
      row.rowKey &&
      isKnownVariant(row.rowKey) &&
      group.variants.includes(row.rowKey)
    ) {
      removeFromArray(arena.matrix.rows, row);
    }
  }
}

export function syncPageArenaFrameSize(
  site: Site,
  arena: PageArena,
  anchor: ArenaFrame
) {
  const index = getFrameColumnIndex(arena, anchor);
  if (index < 0) {
    return;
  }

  for (const pageArena of site.pageArenas) {
    for (const row of pageArena.matrix.rows) {
      const frame = row.cols[index].frame;
      frame.width = anchor.width;
      frame.height = anchor.height;
      if (isHeightAutoDerived(anchor) && anchor._height) {
        updateAutoDerivedFrameHeight(frame, anchor._height.get());
      }
      ensureActivatedScreenVariantsForFrameByWidth(site, frame);
    }
  }
}

export function getFrameColumnIndex(arena: PageArena, anchor: ArenaFrame) {
  for (const row of arena.matrix.rows) {
    const index = row.cols.findIndex((c) => c.frame === anchor);
    if (index >= 0) {
      return index;
    }
  }
  return -1;
}

function getRowForVariant(arena: PageArena, variant: Variant) {
  return arena.matrix.rows.find((row) => row.rowKey === variant);
}

export function ensureManagedRowForVariantInPageArena(
  site: Site,
  arena: PageArena,
  variant: Variant
) {
  if (isScreenVariant(variant)) {
    // We don't create managed rows for screen variants
    return undefined;
  }

  const existing = getRowForVariant(arena, variant);
  if (existing) {
    return existing;
  }

  const row = makeFrameRow(site, arena.component, variant);
  // Find a good place to insert this
  const allVariants = [
    ...allComponentVariants(arena.component),
    ...allGlobalVariants(site, { includeDeps: "direct" }),
  ];
  const currentVariantIndexes = arena.matrix.rows.map((r) =>
    allVariants.indexOf(ensureKnownVariant(r.rowKey))
  );
  const newVariantIndex = allVariants.indexOf(variant);
  const insertionIndex = currentVariantIndexes.findIndex(
    (i) => i > newVariantIndex
  );
  if (insertionIndex >= 0) {
    arena.matrix.rows.splice(insertionIndex, 0, row);
  } else {
    arena.matrix.rows.push(row);
  }

  return row;
}

export function addScreenSizeToPageArenas({
  site,
  width,
  height,
}: {
  site: Site;
  width: number;
  height: number;
}) {
  const responsiveStrategy = getResponsiveStrategy(site);
  const firstPageArena = ensure(
    site.pageArenas[0],
    () => `Project has no Page Arenas`
  );
  const firstPageArenaRow = ensure(
    firstPageArena.matrix.rows[0],
    () => `PageArena has no ArenaFrameRow`
  );

  const preliminaryInsertionIndex = firstPageArenaRow?.cols.findIndex((it) =>
    responsiveStrategy === ResponsiveStrategy.desktopFirst
      ? it.frame.width <= width
      : it.frame.width >= width
  );

  const insertionIndex =
    preliminaryInsertionIndex !== -1
      ? preliminaryInsertionIndex
      : firstPageArenaRow?.cols.length;

  site.pageArenas.forEach((pageArena) =>
    pageArena.matrix.rows.forEach((arenaRow) => {
      const newArenaFrame = makePageArenaFrame(
        site,
        pageArena.component,
        [ensureKnownVariant(arenaRow.rowKey)],
        width,
        height
      );

      insertAt(
        arenaRow.cols,
        new ArenaFrameCell({
          frame: newArenaFrame,
          cellKey: undefined,
        }),
        insertionIndex
      );
    })
  );

  return insertionIndex;
}

export function reorderPageArenaCols(site: Site) {
  const direction =
    getResponsiveStrategy(site) === ResponsiveStrategy.mobileFirst
      ? "asc"
      : "desc";

  const movedFrames: ArenaFrame[] = [];

  site.pageArenas.forEach((arena) => {
    arena.matrix.rows.forEach((arenaRow) => {
      const originalCols = arenaRow.cols as IObservableArray;

      const orderedCols = orderBy(originalCols, (it) => it.frame.width, [
        direction,
      ]).map((it, i) =>
        // If the frame has been moved,
        // we create a new cell to invalidate the canvas frame rendering
        it.frame === originalCols[i].frame
          ? it
          : new ArenaFrameCell({
              frame: it.frame,
              cellKey: undefined,
            })
      );

      originalCols.forEach((it, i) => {
        if (it.frame !== orderedCols[i].frame) {
          movedFrames.push(it.frame);
        }
      });

      originalCols.replace(orderedCols);
    });
  });

  return movedFrames;
}

export function getPageArenaRowLabel(component: Component, row: ArenaFrameRow) {
  const variant = ensureMaybeKnownVariant(row.rowKey);

  if (!variant) {
    return "";
  }

  return makeVariantName({ variant });
}
