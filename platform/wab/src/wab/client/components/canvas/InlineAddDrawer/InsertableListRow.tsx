import styles from "@/wab/client/components/canvas/InlineAddDrawer/InlineAddDrawer.module.scss";
import ListSectionHeader from "@/wab/client/components/ListSectionHeader";
import ListSectionSeparator from "@/wab/client/components/ListSectionSeparator";
import { AddItemGroup } from "@/wab/client/components/studio/add-drawer/AddDrawerSection";
import { Matcher } from "@/wab/client/components/view-common";
import { AddItem } from "@/wab/client/definitions/insertables";
import PlasmicAddDrawerItem from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicAddDrawerItem";
import { getSuperComponents } from "@/wab/components";
import { observer } from "mobx-react";
import * as React from "react";
import { CSSProperties } from "react";

export const enum InsertableListItemType {
  groupHeader = "groupHeader",
  insertable = "insertable",
}

export interface InsertableRow {
  type: InsertableListItemType;
  data: AddItemGroup | AddItem;
  ref?: React.RefObject<HTMLDivElement>;
}

function _InsertableListRow({
  index,
  style,
  data: {
    insertables,
    matcher,
    insert,
    highlightIndex,
    highlightedInsertableIndex,
  },
}: {
  data: {
    highlightedInsertableIndex: number;
    matcher: Matcher;
    insertables: InsertableRow[];
    insert(item: AddItem): void;
    highlightIndex(index: number): void;
  };
  index: number;
  style: CSSProperties;
}) {
  const { type, data, ref } = insertables[index];

  // tslint:disable-next-line:switch-default
  switch (type) {
    case InsertableListItemType.groupHeader:
      return (
        <div style={style}>
          {index > 0 && (
            <ListSectionSeparator className={styles.listGroupSeparator} />
          )}
          <ListSectionHeader>{data.label}</ListSectionHeader>
        </div>
      );

    case InsertableListItemType.insertable: {
      const insertable = data as AddItem;
      const indent =
        !matcher.hasQuery() && insertable.type === "tpl" && insertable.component
          ? getSuperComponents(insertable.component).length
          : 0;
      const displayLabel = insertable.displayLabel ?? insertable.label;
      return (
        <div ref={ref} style={style}>
          <PlasmicAddDrawerItem
            root={{
              onClick: () => insert(insertable),
              onMouseMove: () => highlightIndex(index),
            }}
            key={insertable.key}
            icon={insertable.icon}
            actions={null}
            isHighlighted={index === highlightedInsertableIndex}
            listItem={{
              style: {
                paddingLeft: indent * 20,
              },
            }}
          >
            {matcher ? matcher.boldSnippets(displayLabel) : displayLabel}
          </PlasmicAddDrawerItem>
        </div>
      );
    }
  }
}

export const InsertableListRow = observer(_InsertableListRow);
