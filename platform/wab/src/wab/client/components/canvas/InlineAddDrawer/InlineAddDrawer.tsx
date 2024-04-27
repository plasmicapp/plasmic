import { isKnownTplNode, TplNode, TplTag } from "@/wab/classes";
import styles from "@/wab/client/components/canvas/InlineAddDrawer/InlineAddDrawer.module.scss";
import InlineInsertionPosition from "@/wab/client/components/canvas/InlineAddDrawer/InlineInsertionPosition";
import {
  InsertableListItemType,
  InsertableListRow,
  InsertableRow,
} from "@/wab/client/components/canvas/InlineAddDrawer/InsertableListRow";
import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { buildAddItemGroups } from "@/wab/client/components/studio/add-drawer/AddDrawer";
import { AddItemGroup } from "@/wab/client/components/studio/add-drawer/AddDrawerSection";
import { Matcher } from "@/wab/client/components/view-common";
import { AddItem, AddTplItem } from "@/wab/client/definitions/insertables";
import { usePortalContainer } from "@/wab/client/hooks/usePortalContainer";
import { PlasmicInlineAddDrawer } from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicInlineAddDrawer";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isFlexContainer } from "@/wab/client/utils/tpl-client-utils";
import { mod } from "@/wab/common";
import { SlotSelection } from "@/wab/slots";
import {
  isComponentRoot,
  isTplColumn,
  isTplContainer,
  isTplTextBlock,
} from "@/wab/tpls";
import cn from "classnames";
import { toJS } from "mobx";
import { observer, useLocalStore } from "mobx-react";
import * as React from "react";
import {
  CSSProperties,
  forwardRef,
  Ref,
  useCallback,
  useEffect,
  useRef,
} from "react";
import ReactDOM from "react-dom";
import { VariableSizeList } from "react-window";

interface InlineAddDrawerProps {
  style?: CSSProperties;
  onDismiss: (e?: Event) => void;
  isOpen: boolean;
}

function EmptyResultsMessage() {
  return (
    <div className={styles.emptyResultsMessage}>
      Oops, couldn't find anything matching your search...
    </div>
  );
}

interface InsertableHeaderData {
  type: InsertableListItemType.groupHeader;
  data: AddItemGroup;
}

interface InsertableItemData {
  type: InsertableListItemType.insertable;
  ref: React.RefObject<HTMLDivElement>;
  data: AddItem;
}

export function getPlacementOptions(studioCtx: StudioCtx) {
  const viewCtx = studioCtx.focusedViewCtx();
  const focusedNode = viewCtx?.focusedTplOrSlotSelection();

  const _isComponentRoot =
    isKnownTplNode(focusedNode) && isComponentRoot(focusedNode);
  const isSlot = focusedNode instanceof SlotSelection;
  const isContainer =
    isKnownTplNode(focusedNode) && isTplContainer(focusedNode);
  const isColumn = isKnownTplNode(focusedNode) && isTplColumn(focusedNode);
  const isEmpty = (focusedNode as TplTag)?.children?.length === 0;
  const isMarkerTpl =
    isKnownTplNode(focusedNode) && isTplTextBlock(focusedNode.parent);

  const parentIsFlexContainer =
    isKnownTplNode(focusedNode) &&
    isFlexContainer((focusedNode as TplNode).parent, viewCtx);

  if (!isContainer && !isSlot && !isColumn) {
    return [
      { label: "Before", insertLoc: InsertRelLoc.before },
      { label: "After", insertLoc: InsertRelLoc.after, default: true },
    ];
  }

  if (_isComponentRoot || isSlot || isColumn || isMarkerTpl) {
    return [{ label: "Inside", insertLoc: InsertRelLoc.append }];
  }

  const preferToInsertInside = isEmpty || !parentIsFlexContainer;

  return [
    { label: "Before", insertLoc: InsertRelLoc.before },
    {
      label: "Inside",
      insertLoc: InsertRelLoc.append,
      default: preferToInsertInside,
    },
    {
      label: "After",
      insertLoc: InsertRelLoc.after,
      default: !preferToInsertInside,
    },
  ];
}

function _InlineAddDrawer(
  { isOpen, onDismiss, style }: InlineAddDrawerProps,
  ref: Ref<HTMLDivElement>
) {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.focusedViewCtx();
  const portalContainer = usePortalContainer();

  const store = useLocalStore(
    (source) => ({
      query: "",
      highlightedInsertableIndex: 1,
      selectedPlacementIndex: 0,

      setQuery(q: string) {
        this.query = q;
        this.highlightedInsertableIndex = 1;
      },

      setSelectedPlacementIndex(i: number) {
        this.selectedPlacementIndex = i;
      },

      highlightIndex(i: number) {
        this.highlightedInsertableIndex = i;
      },

      get matcher() {
        return new Matcher(this.query, { matchMiddleOfWord: true });
      },

      get insertableGroups() {
        return buildAddItemGroups({
          studioCtx,
          matcher: this.matcher,
          includeFrames: false,
          filterToTarget: true,
          insertLoc: this.placementOption.insertLoc,
        });
      },

      get insertables(): InsertableRow[] {
        return this.insertableGroups.flatMap((it) =>
          it.items.length
            ? [
                { type: InsertableListItemType.groupHeader, data: it },
                ...it.items.map((item) => ({
                  ref: React.createRef<HTMLDivElement>(),
                  type: InsertableListItemType.insertable,
                  data: item,
                })),
              ]
            : []
        );
      },

      get placementOptions() {
        return getPlacementOptions(studioCtx);
      },

      movePlacementSelection(step: -1 | 1) {
        this.selectedPlacementIndex = mod(
          this.selectedPlacementIndex + step,
          this.placementOptions.length
        );
      },

      moveInsertableHighlight(step: number) {
        const currentIndex = this.highlightedInsertableIndex;
        const insertables = this.insertables;

        let newIndex = mod(currentIndex + step, insertables.length);

        if (insertables[newIndex].type === InsertableListItemType.groupHeader) {
          newIndex = mod(newIndex + step, insertables.length);
        }

        window.requestAnimationFrame(() => {
          // Using VariableSizeList's scrollToItem to make sure the row
          // will be rendered so we can use scrollIntoView to make sure
          // scroll position will be accurate
          listRef.current?.scrollToItem(newIndex, "center");

          insertables[newIndex].ref?.current?.scrollIntoView({
            block: "center",
          });
        });

        this.highlightIndex(newIndex);
      },

      get placementOption() {
        return this.placementOptions[this.selectedPlacementIndex];
      },

      async insert(item?: AddItem): Promise<void> {
        const newItem =
          item ?? this.insertables[this.highlightedInsertableIndex]?.data;
        // Tolerate empty list.
        if (!newItem) {
          return;
        }
        const placement = this.placementOption;

        if (viewCtx) {
          const newTplItem = newItem as AddTplItem;
          const extraInfo = newTplItem.asyncExtraInfo
            ? await newTplItem.asyncExtraInfo(studioCtx)
            : undefined;

          if (extraInfo !== false) {
            viewCtx
              .getViewOps()
              .tryInsertInsertableSpec(
                newTplItem,
                placement.insertLoc,
                extraInfo,
                undefined
              );
          }
        }

        this.dismiss();
      },

      dismiss() {
        store.highlightIndex(1);
        source.onDismiss();
      },
    }),
    { onDismiss }
  );

  useEffect(() => {
    /*
     * React to placementOptions updates
     * to set the selectedPlacementIndex
     * in case a default option is defined
     */

    const defaultPlacementIndex = store.placementOptions.findIndex(
      (it) => it.default
    );

    if (defaultPlacementIndex > -1) {
      store.setSelectedPlacementIndex(defaultPlacementIndex);
    }
  }, [store.placementOptions]);

  const onContextMenu = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const onChangeQuery = useCallback((e) => store.setQuery(e.target.value), []);

  const onSearchKeyDown = useCallback(
    async (e) => {
      switch (e.key) {
        case "Tab":
          e.preventDefault();
          store.movePlacementSelection(e.shiftKey ? -1 : 1);
          break;

        case "ArrowUp":
          e.preventDefault();
          store.moveInsertableHighlight(-1);
          break;

        case "ArrowDown":
          e.preventDefault();
          store.moveInsertableHighlight(1);
          break;

        case "Enter":
          await store.insert();
          store.dismiss();
          break;

        case "Escape":
          e.stopPropagation();
          e.preventDefault();
          store.dismiss();
          break;

        default:
          break;
      }
    },
    [store]
  );

  const listRef = useRef<VariableSizeList>(null);

  return ReactDOM.createPortal(
    <PlasmicInlineAddDrawer
      root={{
        ref,
        style,
        onContextMenu,
        className: cn(styles.overlayRoot, {
          [styles.invisible]: !isOpen,
        }),
      }}
      placementOptions={{
        className: cn({
          [styles.invisible]: store.placementOptions.length === 1,
        }),
        children: store.placementOptions.map((placement, i) => (
          <InlineInsertionPosition
            selected={i === store.selectedPlacementIndex}
            onMouseDown={(e) => {
              e.preventDefault();
              store.setSelectedPlacementIndex(i);
            }}
          >
            {placement.label}
          </InlineInsertionPosition>
        )),
      }}
      leftSearchPanel={{
        searchboxProps: {
          autoFocus: true,
          onChange: onChangeQuery,
          value: store.query,
          onKeyDown: onSearchKeyDown,
          className: cn({
            [styles.reducedTopSpacingSearchField]:
              store.placementOptions.length === 1,
          }),
        },
      }}
      content={{
        children:
          store.insertables.length === 0 ? (
            <EmptyResultsMessage />
          ) : (
            <VariableSizeList
              key={store.query + "," + store.insertables.length}
              ref={listRef}
              itemCount={store.insertables.length}
              itemData={{
                insertables: toJS(store.insertables),
                matcher: store.matcher,
                insert: store.insert,
                highlightIndex: store.highlightIndex,
                highlightedInsertableIndex: store.highlightedInsertableIndex,
              }}
              itemKey={(index) => store.insertables[index].data.key}
              itemSize={
                (index) =>
                  store.insertables[index].type ===
                  InsertableListItemType.groupHeader
                    ? index === 0
                      ? 44 // First group header height (no separator)
                      : 55 // Regular group header height
                    : 32 // Insertable item height
              }
              width="100%"
              height={Math.min(400, window.innerHeight * 0.4)}
              children={InsertableListRow}
            />
          ),
      }}
    />,
    portalContainer
  );
}

export const InlineAddDrawer = observer(forwardRef(_InlineAddDrawer));
