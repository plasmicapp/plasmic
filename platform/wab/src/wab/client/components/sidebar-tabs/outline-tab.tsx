import { Dropdown, Menu } from "antd";
import * as Immutable from "immutable";
import debounce from "lodash/debounce";
import { IObservableValue, observable, reaction, runInAction } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import {
  ArenaFrame,
  ComponentArena,
  isKnownArenaFrame,
  isKnownRenderExpr,
  isKnownTplComponent,
  TplComponent,
  TplNode,
} from "../../../classes";
import { ensure, switchType, tuple } from "../../../common";
import { DEVFLAGS } from "../../../devflags";
import {
  getArenaFrameDesc,
  getArenaFrames,
  isComponentArena,
  isPageArena,
} from "../../../shared/Arenas";
import { getComponentArenaRowLabel } from "../../../shared/component-arenas";
import { EffectiveVariantSetting } from "../../../shared/effective-variant-setting";
import { getSlotParams } from "../../../shared/SlotUtils";
import { SlotSelection } from "../../../slots";
import * as Tpls from "../../../tpls";
import { isTplTagOrComponent, summarizeSlotParam } from "../../../tpls";
import { useToggleDisplayed } from "../../dom-utils";
import PlasmicProjectPanel from "../../plasmic/project_panel/PlasmicProjectPanel";
import PlasmicSearchInput from "../../plasmic/project_panel/PlasmicSearchInput";
import ChevronDownsvgIcon from "../../plasmic/q_4_icons/icons/PlasmicIcon__ChevronDownsvg";
import { StudioCtx, useStudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { Matcher } from "../view-common";
import { Icon } from "../widgets/Icon";
import styles from "./outline-tab.module.scss";
import { ProjectPanel } from "./ProjectPanel";
import {
  ArenaTree,
  ArenaTreeRef,
  getTreeNodeSummary,
  TreeDndManager,
} from "./tpl-tree";

export const OutlineTab = observer(OutlineTab_);

function OutlineTab_() {
  const studioCtx = useStudioCtx();
  const dndManager = React.useMemo(
    () => new TreeDndManager(studioCtx),
    [studioCtx]
  );

  const outlineCtx = React.useMemo(
    () => new OutlineCtx(studioCtx, ""),
    [studioCtx]
  );

  // We track the focused element to clear the search whenever we change
  // the focus to a non-visible element
  React.useEffect(() => {
    const dispose = reaction(
      () => studioCtx.focusedViewCtx()?.focusedTplOrSlotSelection(),
      (focused) =>
        focused && !outlineCtx.isVisible(focused) && outlineCtx.setQuery("")
    );
    return () => {
      dispose();
    };
  }, [studioCtx, outlineCtx]);

  const ref = React.useRef<HTMLDivElement>(null);
  const treeRef = React.useRef<ArenaTreeRef>(null);
  const onVisible = React.useCallback((visible: boolean) => {
    if (treeRef.current && visible) {
      // Recompute tree when outline tab is visible again, to fix issues
      // with occasional blank space when switching back to this tab.
      treeRef.current.forceUpdate();
    }
  }, []);
  useToggleDisplayed(ref, onVisible);
  const arena = studioCtx.currentArena;

  const dismissSearch = () => {
    outlineCtx.setQuery("");
  };

  const currentArenaFrame = studioCtx.focusedViewCtx()?.arenaFrame();

  const _isPageArena = isPageArena(arena);
  const arenaFrameGroups: {
    groupLabel?: string;
    frames: ArenaFrame[];
    alwaysShowGroupLabel?: boolean;
  }[] = switchType(arena)
    .when(ComponentArena, (it) => [
      ...it.matrix.rows.map((row) => ({
        groupLabel: getComponentArenaRowLabel(it.component, row),
        frames: row.cols.map((col) => col.frame),
      })),
      {
        alwaysShowGroupLabel: true,
        groupLabel: "Combinations",
        frames: it.customMatrix.rows[0]?.cols.map((col) => col.frame),
      },
    ])
    .elseUnsafe(() => [{ frames: getArenaFrames(arena) }]);

  const query = outlineCtx.query;

  return (
    <>
      {!DEVFLAGS.projPanelTop && !studioCtx.appCtx.appConfig.projPanelTop && (
        <ProjectPanel />
      )}
      <PlasmicProjectPanel
        noHeader={_isPageArena || !arena}
        extraBottomPadding
        headerFilter={{
          wrap: () =>
            !_isPageArena && arena && !studioCtx.focusedMode ? (
              <Dropdown
                trigger={["click"]}
                overlay={() => (
                  <Menu>
                    {arenaFrameGroups
                      .filter((it) => it.frames.length)
                      .map((group) => {
                        const items = group.frames.map((frame) => (
                          <Menu.Item
                            onClick={() =>
                              studioCtx.changeUnsafe(() =>
                                studioCtx.setStudioFocusOnFrame({
                                  frame: frame,
                                  autoZoom: true,
                                })
                              )
                            }
                          >
                            {getArenaFrameDesc(arena, frame, studioCtx.site)}
                          </Menu.Item>
                        ));

                        const shouldShowGroupLabel =
                          group.groupLabel &&
                          (group.frames.length > 1 ||
                            group.alwaysShowGroupLabel);

                        return shouldShowGroupLabel ? (
                          <Menu.ItemGroup
                            key={group.groupLabel}
                            title={
                              <span className={styles.framesMenuGroupLabel}>
                                {group.groupLabel}
                              </span>
                            }
                          >
                            {items}
                          </Menu.ItemGroup>
                        ) : (
                          <React.Fragment key={0}>{items}</React.Fragment>
                        );
                      })}
                  </Menu>
                )}
              >
                <div
                  data-test-id="elements-panel--current-frame"
                  className={styles.currentFrame}
                >
                  {currentArenaFrame ? (
                    <strong>
                      {getArenaFrameDesc(
                        arena,
                        currentArenaFrame,
                        studioCtx.site
                      )}
                    </strong>
                  ) : (
                    <div>
                      {isComponentArena(arena)
                        ? "Select a variant"
                        : "Select an artboard"}
                    </div>
                  )}
                  {arenaFrameGroups.some((groups) => groups.frames.length) && (
                    <Icon monochromeExempt icon={ChevronDownsvgIcon} />
                  )}
                </div>
              </Dropdown>
            ) : (
              <div style={{ height: 8 }} />
            ),
        }}
        searchInput={{
          wrap: () => (
            <PlasmicSearchInput
              overrides={{
                searchInput: {
                  value: query,
                  onChange: (e) => outlineCtx.setQuery(e.target.value),
                  onKeyUp: (e) => {
                    if (e.key === "Escape") {
                      dismissSearch();
                    }
                  },
                },
                clearFieldIcon: {
                  style: { display: query ? "block" : "none" },
                  onClick: () => dismissSearch(),
                },
              }}
            />
          ),
        }}
        plusButtonContainer={{ render: () => null }}
      >
        <div
          className="tpltree__root flex-fill rel fill-width fill-height flex-child-min"
          onDragOver={(e) => {
            // We must cancel the onDragOver event to be considered a drop target.
            e.preventDefault();
          }}
          onDrop={(e) => {
            // In case the user drops on the tree panel instead of a tree node,
            // we inform the TreeDndManager to execute the drop anyway.
            dndManager.onDrop(e);
          }}
        >
          {arena && (
            <ArenaTree
              // We reset the ArenaTree whenever we switch Arena to work around
              // an issue with FixedSizeTree, where whenever we pass in a new treeWalker,
              // we end up walking the tree twice for each update.
              key={arena?.uid}
              studioCtx={studioCtx}
              arena={arena}
              outlineCtx={outlineCtx}
              dndManager={dndManager}
              ref={treeRef}
            />
          )}
        </div>
      </PlasmicProjectPanel>
    </>
  );
}

export function makeOutlineVisibleKey(
  tpl: TplNode | SlotSelection | ArenaFrame
) {
  if (isKnownArenaFrame(tpl)) {
    return `${tpl.uid}`;
  } else if (tpl instanceof SlotSelection) {
    return `${
      ensure(tpl.toTplSlotSelection().tpl, "SlotSelection.tpl must exist").uid
    }-${tpl.slotParam.uid}`;
  } else {
    return `${tpl.uid}`;
  }
}

export class OutlineCtx {
  private visible = observable.set<string>();
  private _query = observable.box("");
  private _matcher: IObservableValue<Matcher>;
  constructor(private studioCtx: StudioCtx, query: string) {
    const matcher = new Matcher(query);
    this._matcher = observable.box(matcher);
    this._query.set(query);
    this.fillVisibleSet();
  }

  isVisible(tpl: TplNode | SlotSelection) {
    if (!this.hasQuery()) {
      return true;
    }
    return this.visible.has(makeOutlineVisibleKey(tpl));
  }

  getVisibleKeys() {
    return new Set(this.visible);
  }

  get query() {
    return this._query.get();
  }

  get matcher() {
    return this._matcher.get();
  }

  setQuery(query: string) {
    this._query.set(query);
    this.updateVisible();
  }

  private updateVisible = debounce(() => {
    runInAction(() => {
      this._matcher.set(new Matcher(this.query));
      this.fillVisibleSet();
    });
  }, 300);

  hasQuery() {
    return this.query.trim() !== "";
  }

  private fillVisibleSet() {
    this.visible.clear();
    if (!this.hasQuery()) {
      return;
    }
    const matcher = this.matcher;

    for (const viewCtx of this.studioCtx.viewCtxs) {
      // This lets us walk up the Tpl ancestor path, but making jumps across
      // component boundaries per the current val component tree.
      // TODO This breaks if there are recursive instances of a component.
      const tplRootToParentTplComponent = new Map(
        viewCtx.currentComponentCtx() != null
          ? viewCtx
              .ancestorComponents(
                ensure(
                  viewCtx.currentComponentCtx(),
                  "ComponentCtx must exist"
                ).valComponent()
              )
              .map(
                (valComponent) =>
                  tuple(
                    valComponent.tpl.component.tplTree,
                    valComponent.tpl
                  ) as [TplNode, TplComponent]
              )
          : []
      );

      // TODO note this is somewhat wasteful for pages since tplSysRoot and
      // tplUserRoot both lead next code block to process top-level tpl tree.
      const tplRoots = tuple(viewCtx.tplSysRoot(), viewCtx.tplUserRoot());
      // This is to help us track which slot any particular child belongs to.
      const tplToSlotArg = new Map();
      // We always want to show nodes that match the typeahead, but also all their
      // ancestors.  The former we call "anchors."
      const visibleAnchors = Immutable.Set(
        (function* () {
          for (let _tplRoot of [
            ...[
              ...new Set([
                ...[...tplRoots],
                ...Array.from(Array.from(tplRootToParentTplComponent.keys())),
              ]),
            ],
          ]) {
            const tpls = Tpls.flattenTpls(_tplRoot);
            // This part is to build tplToSlotArg, not visibleAnchors.
            for (const tpl of tpls) {
              if (isKnownTplComponent(tpl)) {
                const args = viewCtx
                  .variantTplMgr()
                  .effectiveVariantSetting(tpl).args;
                for (let arg of args) {
                  if (isKnownRenderExpr(arg.expr)) {
                    for (let child of [...arg.expr.tpl]) {
                      tplToSlotArg.set(child, { tpl, arg });
                    }
                  }
                }
              }
            }
            // This part is for visibleAnchors.
            for (const tpl of [...tpls]) {
              const vs = isTplTagOrComponent(tpl)
                ? viewCtx.variantTplMgr().effectiveVariantSetting(tpl)
                : undefined;
              if (
                Array.from(getSearchableTexts(tpl, viewCtx, vs)).some((t) =>
                  matcher.matches(t)
                )
              ) {
                yield tpl;
              }
              if (isKnownTplComponent(tpl)) {
                for (let param of [...getSlotParams(tpl.component)]) {
                  if (matcher.matches(summarizeSlotParam(param))) {
                    yield new SlotSelection({
                      tpl,
                      slotParam: param,
                    });
                  }
                }
              }
            }
          }
        })()
      );

      for (const anchor_ of [...[...(visibleAnchors as any)]]) {
        let anchor: TplComponent;
        if (anchor_ instanceof SlotSelection) {
          this.visible.add(makeOutlineVisibleKey(anchor_));
          anchor = ensure(anchor_.tpl, "SlotSelection.tpl must exist");
        } else {
          anchor = anchor_;
        }
        while (true) {
          let ancestor: TplNode | undefined = undefined;
          // This can be short-circuited whenever we encounter an ancestor we've
          // previously visited, rather than visiting all ancestors.
          for (ancestor of [...Tpls.ancestors(anchor).reverse()]) {
            this.visible.add(makeOutlineVisibleKey(ancestor));
            // Most of the time, children of a component are specifically arguments
            // passed to the "children" slot, but if there are other slots, we want
            // to make those visible in the outline as well.
            const slotArg = tplToSlotArg.get(ancestor);
            if (slotArg != null) {
              let arg;
              ({ tpl: anchor, arg } = slotArg);
              this.visible.add(
                makeOutlineVisibleKey(
                  new SlotSelection({
                    tpl: anchor,
                    slotParam: arg.param,
                  })
                )
              );
            }
          }
          // If we are drilled into some component, make the jump up to the outer
          // component context.
          const nextAnchor = tplRootToParentTplComponent.get(
            ensure(ancestor, "ancestor must exist here")
          );
          if (!nextAnchor) {
            break;
          }
          anchor = nextAnchor;
        }
      }
    }
  }
}

function* getSearchableTexts(
  tpl: TplNode,
  viewCtx: ViewCtx,
  vs?: EffectiveVariantSetting
) {
  if (Tpls.isTplNamable(tpl) && tpl.name) {
    yield tpl.name;
  }
  if (Tpls.isTplTextBlock(tpl)) {
    const content = Tpls.getTplTextBlockContent(tpl, viewCtx);
    if (content) {
      yield content;
    } else {
      yield getTreeNodeSummary(tpl, vs?.rsh());
    }
  } else {
    yield getTreeNodeSummary(tpl, vs?.rsh());
  }
}
