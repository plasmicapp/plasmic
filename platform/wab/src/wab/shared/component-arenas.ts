import { removeFromArray } from "@/wab/commons/collections";
import {
  FrameViewMode,
  ensurePositionManagedFrame,
  getActivatedVariantsForFrame,
  getArenaFrameCellsInGrid,
  getArenaFramesInGrid,
  getFrameSizeForTargetScreenVariant,
  isComponentArena,
  maybeResizeFrameForTargetScreenVariant,
  mkArenaFrame,
  resizeFrameForScreenVariant,
} from "@/wab/shared/Arenas";
import { FramePinManager } from "@/wab/shared/PinManager";
import {
  ensureValidCombo,
  ensureVariantSetting,
  getBaseVariant,
  getOrderedScreenVariants,
  getPartitionedScreenVariantsByTargetVariant,
  isBaseVariant,
  isGlobalVariant,
  isGlobalVariantGroup,
  isPrivateStyleVariant,
  isScreenVariant,
  isScreenVariantGroup,
} from "@/wab/shared/Variants";
import {
  findNonEmptyCombos,
  usedGlobalVariantGroups,
} from "@/wab/shared/cached-selectors";
import { isTplRootWithCodeComponentVariants } from "@/wab/shared/code-components/variants";
import {
  assert,
  ensure,
  ensureArray,
  ensureArrayOfInstances,
  partitions,
  remove,
  replaceAll,
  setsEq,
  sortAs,
} from "@/wab/shared/common";
import {
  getSuperComponentVariantGroupToComponent,
  isPageComponent,
  isPlainComponent,
} from "@/wab/shared/core/components";
import { getComponentArena } from "@/wab/shared/core/sites";
import { parseScreenSpec } from "@/wab/shared/css-size";
import {
  ArenaFrame,
  ArenaFrameCell,
  ArenaFrameGrid,
  ArenaFrameRow,
  Component,
  ComponentArena,
  ComponentVariantGroup,
  PageArena,
  Site,
  Variant,
  VariantGroup,
  ensureKnownVariant,
  ensureKnownVariantGroup,
  ensureMaybeKnownVariantGroup,
  isKnownVariant,
  isKnownVariantGroup,
} from "@/wab/shared/model/classes";
import {
  getComponentDefaultSize,
  isExplicitPixelSize,
} from "@/wab/shared/sizingutils";
import orderBy from "lodash/orderBy";
import pick from "lodash/pick";
import uniqBy from "lodash/uniqBy";

export function mkComponentArena({
  site,
  component,
  opts,
}: {
  site: Site;
  component: Component;
  opts?: { width: number; height: number };
}) {
  const arena = new ComponentArena({
    component,
    matrix: makeDefaultComponentArenaMatrix(site, component, opts),
    customMatrix: makeComponentArenaCustomMatrix(site, component, opts),
  });
  ensureActivatedScreenVariantsForComponentArena(site, arena);
  return arena;
}

export function makeComponentArenaCustomMatrix(
  site: Site,
  component: Component,
  opts?: { width: number; height: number }
) {
  const { width, height } = opts ?? deriveDefaultFrameSize(site, component);
  const combos = findNonEmptyCombos(component);
  return new ArenaFrameGrid({
    rows: [
      new ArenaFrameRow({
        rowKey: undefined,
        cols: combos.map(
          (combo) =>
            new ArenaFrameCell({
              cellKey: combo,
              frame: makeComponentArenaFrame({
                site,
                component,
                variants: combo,
                width,
                height,
                viewMode: FrameViewMode.Stretch,
              }),
            })
        ),
      }),
    ],
  });
}

function makeDefaultComponentArenaMatrix(
  site: Site,
  component: Component,
  opts?: { width: number; height: number }
) {
  const { width, height } = opts ?? deriveDefaultFrameSize(site, component);
  const globalGroups = usedGlobalVariantGroups(site, component);
  return new ArenaFrameGrid({
    rows: [
      // First row is for the base variant and other interaction variants
      new ArenaFrameRow({
        rowKey: undefined,
        cols: component.variants
          .filter((v) => !isPrivateStyleVariant(v))
          .map(
            (variant) =>
              new ArenaFrameCell({
                cellKey: variant,
                frame: makeComponentArenaFrame({
                  site,
                  component,
                  variants: [variant],
                  width,
                  height,
                  viewMode: FrameViewMode.Stretch,
                }),
              })
          ),
      }),
      ...[...component.variantGroups, ...globalGroups].map(
        (variantGroup) =>
          new ArenaFrameRow({
            rowKey: variantGroup,
            cols: getOrderedVariants(site, variantGroup).map(
              (variant) =>
                new ArenaFrameCell({
                  cellKey: variant,
                  frame: makeComponentArenaFrame({
                    site,
                    component,
                    variants: [variant],
                    width,
                    height,
                    viewMode: FrameViewMode.Stretch,
                  }),
                })
            ),
          })
      ),
    ],
  });
}

function getComponentArenaWidthFromScreenVariant(globals: Variant[]) {
  const screenVariant = globals.find((v) => isScreenVariant(v));
  if (!screenVariant || !screenVariant.mediaQuery) {
    return undefined;
  }
  const spec = parseScreenSpec(screenVariant.mediaQuery);
  return spec.maxWidth || spec.minWidth;
}

export function makeComponentArenaFrame({
  site,
  component,
  variants,
  width,
  height,
  viewMode,
}: {
  site: Site;
  component: Component;
  variants: Variant[];
  width: number;
  height: number;
  viewMode?: FrameViewMode;
}) {
  const [globals, locals] = partitions(variants, [isGlobalVariant]);
  const frame = mkArenaFrame({
    site,
    component: component,
    targetVariants: [...locals],
    targetGlobalVariants: [...globals],
    name: "",
    width: getComponentArenaWidthFromScreenVariant(globals) || width,
    height,
    viewMode: viewMode ?? FrameViewMode.Centered,
  });
  ensureVariantSetting(frame.container, [site.globalVariant]);
  return frame;
}

export function ensureCellKey(cell: ArenaFrameCell) {
  if (isKnownVariant(cell.cellKey)) {
    return cell.cellKey;
  }

  if (Array.isArray(cell.cellKey) && cell.cellKey.length) {
    return cell.cellKey;
  }

  const pinnedVariants = cell.frame.container.component.variants.filter(
    (it) => it.uuid in cell.frame.pinnedVariants
  );

  cell.cellKey = uniqBy(
    [
      ...pinnedVariants,
      ...cell.frame.targetVariants,
      ...cell.frame.targetGlobalVariants,
    ],
    (it) => it.uuid
  );

  return cell.cellKey;
}

export function removeFramesFromComponentArenaForVariants(
  arena: ComponentArena,
  variants: Variant[]
) {
  // We only do this for managed artboards (arena.matrix.rows).
  // For custom artboards, we will just stop targeting / pinning
  // the removed variant, as we do for all artboards
  for (const row of [...arena.matrix.rows]) {
    for (const cell of [...row.cols]) {
      if (cell.cellKey && variants.includes(ensureKnownVariant(cell.cellKey))) {
        removeFromArray(row.cols, cell);
      }
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

export function removeManagedFramesFromComponentArenaForVariantGroup(
  arena: ComponentArena,
  group: VariantGroup
) {
  for (const row of [...arena.matrix.rows]) {
    if (row.rowKey === group) {
      removeFromArray(arena.matrix.rows, row);
    }
  }
}

export function removeCustomComponentFrame(
  arena: ComponentArena,
  frame: ArenaFrame
) {
  for (const row of arena.customMatrix.rows) {
    const cell = row.cols.find((c) => c.frame === frame);
    if (cell) {
      removeFromArray(row.cols, cell);
    }
  }
}

export function removeSuperOrGlobalVariantComponentFrame(
  arena: ComponentArena,
  frame: ArenaFrame
) {
  const component = arena.component;
  const cellKey = ensureKnownVariant(getCellKeyForFrame(arena, frame));
  const group = ensureKnownVariantGroup(cellKey.parent);
  assert(
    isGlobalVariantGroup(group) ||
      getSuperComponentVariantGroupToComponent(component).has(group),
    `VariantGroup must be either a global group or a super component group`
  );
  const row = arena.matrix.rows.find((it) =>
    it.cols.some((col) => col.frame === frame)
  );

  const cell = row?.cols.find((c) => c.frame === frame);

  if (cell) {
    removeFromArray(row!.cols, cell);
  }

  if (row?.cols.length === 0) {
    removeFromArray(arena.matrix.rows, row);
  }
}

export function isGlobalVariantFrame(
  arena: ComponentArena | PageArena,
  frame: ArenaFrame
) {
  if (isComponentArena(arena)) {
    return arena.matrix.rows.some(
      (it) =>
        isKnownVariantGroup(it.rowKey) &&
        isGlobalVariantGroup(it.rowKey) &&
        it.cols.some((col) => col.frame === frame)
    );
  }
  return arena.matrix.rows.some(
    (it) =>
      isKnownVariant(it.rowKey) &&
      isKnownVariantGroup(it.rowKey.parent) &&
      isGlobalVariantGroup(it.rowKey.parent) &&
      it.cols.some((col) => col.frame === frame)
  );
}

export function isSuperVariantFrame(arena: ComponentArena, frame: ArenaFrame) {
  const superGroups = [
    ...getSuperComponentVariantGroupToComponent(arena.component).keys(),
  ];
  return arena.matrix.rows.some(
    (it) =>
      isKnownVariantGroup(it.rowKey) &&
      superGroups.includes(it.rowKey) &&
      it.cols.some((col) => col.frame === frame)
  );
}

export function isCustomComponentFrame(
  arena: ComponentArena,
  frame: ArenaFrame
) {
  return arena.customMatrix.rows.some((row) =>
    row.cols.some((cell) => cell.frame === frame)
  );
}

export function getCellKeyForFrame(arena: ComponentArena, frame: ArenaFrame) {
  const cell = getCellForFrame(arena, frame);
  return cell ? cell.cellKey : undefined;
}

export function getCellForFrame(arena: ComponentArena, frame: ArenaFrame) {
  for (const cell of getArenaFrameCellsInGrid(arena.matrix)) {
    if (cell.frame === frame) {
      return cell;
    }
  }
  for (const cell of getArenaFrameCellsInGrid(arena.customMatrix)) {
    if (cell.frame === frame) {
      return cell;
    }
  }
  return undefined;
}

export function maybeEnsureManagedFrameForGlobalVariantInComponentArena(
  site: Site,
  arena: ComponentArena,
  variant: Variant
) {
  assert(isGlobalVariant(variant), "Must be global variant");
  const group = ensureKnownVariantGroup(variant.parent);
  const row = getRowForVariantGroupInComponentArena(arena, group);
  if (row) {
    ensureManagedFrameForVariantInComponentArena(site, arena, variant);
    ensureComponentArenaColsOrder(site, arena.component, group);
  }
}

export function ensureManagedFrameForVariantInComponentArena(
  site: Site,
  arena: ComponentArena,
  variant: Variant
) {
  const existing = getManagedFrameForVariant(site, arena, variant);
  if (existing) {
    return existing;
  }

  // We never create a dedicated frame for private style variants
  assert(
    !isPrivateStyleVariant(variant),
    "No dedicated frame for private style variants"
  );

  const { width, height } = deriveDefaultFrameSize(site, arena.component);

  const row = variant.parent
    ? // If variant belongs in a variant group, create a row for it
      ensureRowForVariantGroupInComponentArena(site, arena, variant.parent)
    : // else a style variant always goes into the first row
      ensure(arena.matrix.rows[0], `First row of matrix always exists`);

  // It is possible that in doing ensureRowForVariantGroupInComponentArena,
  // we have created the cell that we need.  So check again.
  const existing2 = getManagedFrameForVariant(site, arena, variant);
  if (existing2) {
    return existing2;
  }

  const frame = makeComponentArenaFrame({
    site,
    component: arena.component,
    variants: [variant],
    width,
    height,
    viewMode: getComponentArenaBaseFrameViewMode(arena),
  });
  const newCell = new ArenaFrameCell({ frame, cellKey: variant });
  row.cols.push(newCell);
  if (isScreenVariant(variant)) {
    ensureActivatedScreenVariantsForTargetScreenVariant(site, frame, variant);
  }
  return frame;
}

export function deriveDefaultFrameSize(
  site: Site,
  component: Component
): { width: number; height: number } {
  const componentArena = getComponentArena(site, component);
  const totalFramePadding = isPageComponent(component) ? 0 : 40;

  if (componentArena) {
    return pick(getComponentArenaBaseFrame(componentArena), [
      "width",
      "height",
    ]);
  }

  const base = getBaseVariant(component);
  const { height, width } = getComponentDefaultSize(component, [base]);

  const defaultScreenWidth = ensure(
    getFrameSizeForTargetScreenVariant(site, undefined),
    "There should always be a default screen width for base variant"
  );

  const frameWidth =
    width && isExplicitPixelSize(width)
      ? parseInt(width, 10)
      : defaultScreenWidth;
  const frameHeight =
    height && isExplicitPixelSize(height) ? parseInt(height, 10) : 500;

  return {
    width: frameWidth + totalFramePadding,
    height: frameHeight + totalFramePadding,
  };
}

export function addCustomComponentFrame(
  site: Site,
  arena: ComponentArena,
  frame: ArenaFrame,
  position?: number
) {
  assert(
    frame.container.component === arena.component,
    `Frame and arena must match`
  );
  if (arena.customMatrix.rows.length === 0) {
    arena.customMatrix.rows.push(
      new ArenaFrameRow({ cols: [], rowKey: undefined })
    );
  }
  const activeVariants = getActivatedVariantsForFrame(site, frame);
  const cell = new ArenaFrameCell({ frame, cellKey: [...activeVariants] });

  if (position !== undefined && position >= 0) {
    arena.customMatrix.rows[0].cols.splice(position, 0, cell);
  } else {
    arena.customMatrix.rows[0].cols.push(cell);
  }

  // Turn frame into position-managed frame
  ensurePositionManagedFrame(frame);

  ensureActivatedScreenVariantsForCustomCell(site, cell);
}

export function getManagedFrameForVariant(
  site: Site,
  arena: ComponentArena,
  variant: Variant
) {
  if (isBaseVariant(variant)) {
    return getComponentArenaBaseFrame(arena);
  } else {
    const cell = getArenaFrameCellsInGrid(arena.matrix).find(
      (c) => c.cellKey === variant
    );
    return cell ? cell.frame : undefined;
  }
}

export function getCustomFrameForActivatedVariants(
  arena: ComponentArena | PageArena,
  variants: Set<Variant>
) {
  const combo = new Set(ensureValidCombo(arena.component, [...variants]));
  const cell = getArenaFrameCellsInGrid(arena.customMatrix).find((c) =>
    setsEq(new Set(ensureArrayOfInstances(ensureCellKey(c), Variant)), combo)
  );
  return cell ? cell.frame : undefined;
}

export function getFrameForActivatedVariants(
  arena: ComponentArena,
  variants: Set<Variant>
) {
  const combo = new Set(ensureValidCombo(arena.component, [...variants]));
  const cell = getArenaFrameCellsInGrid(arena.matrix).find((c) => {
    return setsEq(
      new Set(ensureArrayOfInstances([ensureCellKey(c)], Variant)),
      combo
    );
  });
  return cell ? cell.frame : undefined;
}

function getRowForVariantGroupInComponentArena(
  arena: ComponentArena,
  group: VariantGroup
) {
  return arena.matrix.rows.find((row) => row.rowKey === group);
}

export function ensureRowForVariantGroupInComponentArena(
  site: Site,
  arena: ComponentArena,
  group: VariantGroup
) {
  let row = getRowForVariantGroupInComponentArena(arena, group);
  if (!row) {
    row = new ArenaFrameRow({
      rowKey: group,
      cols: [],
    });
    if (isGlobalVariantGroup(group)) {
      // always insert global variant groups at the end
      arena.matrix.rows.push(row);
    } else {
      // for component variant groups, always insert before global variant groups
      const index = arena.matrix.rows.findIndex(
        (r) =>
          r.rowKey && isGlobalVariantGroup(ensureKnownVariantGroup(r.rowKey))
      );
      if (index >= 0) {
        arena.matrix.rows.splice(index, 0, row);
      } else {
        arena.matrix.rows.push(row);
      }
    }

    for (const variant of group.variants) {
      ensureManagedFrameForVariantInComponentArena(site, arena, variant);
    }
  }
  return row;
}

export function getComponentArenaCustomFrames(arena: ComponentArena) {
  return arena.customMatrix.rows.flatMap((r) => r.cols.map((col) => col.frame));
}

export function getComponentArenaBaseFrame(arena: ComponentArena | PageArena) {
  return arena.matrix.rows[0].cols[0].frame;
}

export function getComponentArenaBaseFrameViewMode(
  arena: ComponentArena | PageArena
): FrameViewMode {
  return getComponentArenaBaseFrame(arena).viewMode as FrameViewMode;
}

export function ensureActivatedScreenVariantsForComponentArena(
  site: Site,
  arena: ComponentArena
) {
  for (const row of arena.matrix.rows) {
    if (
      row.rowKey &&
      isScreenVariantGroup(ensureKnownVariantGroup(row.rowKey)) &&
      row.rowKey === site.activeScreenVariantGroup
    ) {
      for (const cell of row.cols) {
        const targetVariant = ensureKnownVariant(cell.cellKey);
        ensureActivatedScreenVariantsForTargetScreenVariant(
          site,
          cell.frame,
          targetVariant
        );
      }
    }
  }

  for (const cell of getArenaFrameCellsInGrid(arena.customMatrix)) {
    ensureActivatedScreenVariantsForCustomCell(site, cell);
  }
}

export function ensureActivatedScreenVariantsForCustomCell(
  site: Site,
  cell: ArenaFrameCell
) {
  const keyVariants = ensureArrayOfInstances(ensureCellKey(cell), Variant);
  for (const variant of keyVariants) {
    if (isScreenVariant(variant)) {
      ensureActivatedScreenVariantsForTargetScreenVariant(
        site,
        cell.frame,
        variant
      );
    }
  }
}

export function ensureActivatedScreenVariantsForComponentArenaFrame(
  site: Site,
  arena: ComponentArena,
  frame: ArenaFrame
) {
  if (isCustomComponentFrame(arena, frame)) {
    const cell = ensure(
      getCellForFrame(arena, frame),
      "Should be able to find cell for custom frame in arena"
    );
    ensureActivatedScreenVariantsForCustomCell(site, cell);
  } else {
    const cellKey = ensureKnownVariant(getCellKeyForFrame(arena, frame));
    if (isScreenVariant(cellKey)) {
      ensureActivatedScreenVariantsForTargetScreenVariant(site, frame, cellKey);
    }
  }
}

function ensureActivatedScreenVariantsForTargetScreenVariant(
  site: Site,
  frame: ArenaFrame,
  targetVariant: Variant
) {
  const [active, inactive] = getPartitionedScreenVariantsByTargetVariant(
    site,
    targetVariant
  );
  const pinManager = new FramePinManager(site, frame);
  for (const variant of active) {
    pinManager.activateVariant(variant);
  }
  for (const variant of inactive) {
    pinManager.deactivateVariant(variant);
  }
}

export function isStretchyComponentFrame(frame: ArenaFrame) {
  return (
    isPlainComponent(frame.container.component) &&
    frame.viewMode === FrameViewMode.Stretch
  );
}

export function syncComponentArenaFrameSize(
  arena: ComponentArena,
  anchor: ArenaFrame
) {
  // Don't sync arena frames when in focused mode.
  if (arena._focusedFrame) {
    return;
  }

  const anchorCellKeyVariants = ensureArray(
    getCellKeyForFrame(arena, anchor)
  ).map((it) => ensureKnownVariant(it));

  // Don't propagate frame size for screen variant artboards
  if (anchorCellKeyVariants.some((it) => isScreenVariant(it))) {
    return;
  }

  const arenaGridFrames = [
    ...getArenaFrameCellsInGrid(arena.matrix),
    ...getArenaFrameCellsInGrid(arena.customMatrix),
  ];

  arenaGridFrames
    .filter((cell) =>
      ensureArray(cell.cellKey)
        .map((it) => ensureKnownVariant(it))
        .every((it) => !isScreenVariant(it))
    )
    .forEach((cell) => {
      cell.frame.width = anchor.width;
      cell.frame.height = anchor.height;
    });
}

export function ensureComponentArenaFrameSizeForTargetScreenVariant(
  site: Site,
  arena: ComponentArena,
  variant: Variant
) {
  for (const cell of getArenaFrameCellsInGrid(arena.matrix)) {
    if (cell.cellKey === variant) {
      resizeFrameForScreenVariant(site, cell.frame, variant);
    }
  }

  for (const frame of getArenaFramesInGrid(arena.customMatrix)) {
    maybeResizeFrameForTargetScreenVariant(site, frame, variant);
  }
}

export function ensureComponentArenaColsOrder(
  site: Site,
  component: Component,
  group: VariantGroup
) {
  const arena = getComponentArena(site, component);

  if (arena) {
    const row = getRowForVariantGroupInComponentArena(arena, group);

    if (row) {
      replaceAll(
        row.cols,
        sortAs(row.cols, getOrderedVariants(site, group), (c) => c.cellKey)
      );
    }
  }
}

export function ensureComponentArenaRowsOrder(
  site: Site,
  component: Component
) {
  const arenaRows = getComponentArena(site, component)?.matrix.rows;

  if (arenaRows) {
    const variantGroupPositionByUid = Object.fromEntries(
      component.variantGroups.map((it, i) => [it.uid, i])
    );
    const orderedRows = orderBy(arenaRows, (it) =>
      it.rowKey ? variantGroupPositionByUid[it.rowKey.uid] : 0
    );
    arenaRows.splice(0, arenaRows.length, ...orderedRows);
  }
}

export function moveVariantCellInComponentArena(
  site: Site,
  component: Component,
  variant: Variant,
  oldParent: VariantGroup,
  newParent: VariantGroup
) {
  const arena = getComponentArena(site, component);

  if (!arena) {
    return;
  }

  const oldRow = getRowForVariantGroupInComponentArena(arena, oldParent);
  const newRow = getRowForVariantGroupInComponentArena(arena, newParent);

  const cell = oldRow?.cols.find((c) => c.cellKey === variant);

  if (!cell) {
    return;
  }

  remove(oldRow?.cols ?? [], cell);
  newRow?.cols.push(cell);

  ensureComponentArenaColsOrder(site, component, oldParent);
  ensureComponentArenaColsOrder(site, component, newParent);
}

function getOrderedVariants(site: Site, group: VariantGroup) {
  if (isScreenVariantGroup(group)) {
    return getOrderedScreenVariants(site, group);
  } else {
    return group.variants;
  }
}

export function isBaseVariantFrame(site: Site, frame: ArenaFrame) {
  return site.componentArenas
    .map((it) => it.matrix.rows[0]?.cols[0]?.frame)
    .some((it) => it === frame);
}

export function getComponentArenaRowLabel(
  component: Component,
  row: ArenaFrameRow
) {
  const group = ensureMaybeKnownVariantGroup(row.rowKey);

  if (!group) {
    return row.cols.length === 1
      ? "Base"
      : isTplRootWithCodeComponentVariants(component.tplTree)
      ? "Base + Registered"
      : "Base + Interactions";
  }

  if (component.variantGroups.includes(group as ComponentVariantGroup)) {
    return group.param.variable.name;
  } else {
    const groupToSuperComp =
      getSuperComponentVariantGroupToComponent(component);
    const superComp = groupToSuperComp.get(group);
    if (superComp) {
      return `${superComp.name} - ${group.param.variable.name}`;
    } else {
      return group.param.variable.name;
    }
  }
}
