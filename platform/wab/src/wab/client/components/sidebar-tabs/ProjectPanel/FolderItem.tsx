import {
  EditableLabel,
  EditableLabelHandles,
  EditableLabelProps,
} from "@/wab/client/components/widgets/EditableLabel";
import {
  DefaultFolderItemProps,
  PlasmicFolderItem,
} from "@/wab/client/plasmic/project_panel/PlasmicFolderItem";
import cn from "classnames";
import { observer } from "mobx-react";
import * as React from "react";
import { CSSProperties, ReactNode, useRef } from "react";
import styles from "./FolderItem.module.scss";

interface FolderItemProps
  extends DefaultFolderItemProps,
    React.HTMLAttributes<HTMLLIElement> {
  name: ReactNode;
  pathname?: string;
  style: CSSProperties;
  cleanName: string;
  onRename: EditableLabelProps["onEdit"];
  isSelected: boolean;
  isHighlighted?: boolean;
  renaming: boolean;
  menu: () => React.ReactElement;
  indent?: number;
  onClickActions?: () => void;
  tooltipActions: React.ReactNode;
  renamingDisabled?: boolean;
}

const FolderItem = observer(
  React.forwardRef(function FolderItem(
    {
      name,
      cleanName,
      isSelected: selected,
      isHighlighted,
      onRename,
      renaming,
      pathname,
      type,
      menu,
      style,
      indent,
      onClickActions,
      tooltipActions,
      renamingDisabled,
      ...props
    }: FolderItemProps,
    outerRef: React.Ref<HTMLLIElement>
  ) {
    const editableLabelRef = useRef<EditableLabelHandles>(null);

    return (
      <PlasmicFolderItem
        selected={selected}
        type={type}
        style={style}
        className={cn({
          // [styles.highlightSearchTerms]: !selected,
        })}
        listItem={{
          menu,
          style: {
            paddingLeft: (indent ?? 0) * 24,
          },
          isHighlighted,
          showActionsOnHover: !!onClickActions,
        }}
        root={{ ref: outerRef }}
        iconButton={{
          onClick: onClickActions,
          tooltip: tooltipActions,
        }}
        {...(props as any)}
      >
        <EditableLabel
          ref={editableLabelRef}
          value={cleanName}
          editing={renaming}
          labelFactory={({ className, ...restProps }) => (
            <div className={cn(styles.folderLabel, className)} {...restProps} />
          )}
          onEdit={onRename}
          disabled={renamingDisabled}
          // We need to programmatically trigger editing, because otherwise
          // double-click will both trigger the editing and also trigger a
          // navigation to the item
          programmaticallyTriggered
        >
          {name}{" "}
          {pathname && <span className={styles.itemPathName}>{pathname}</span>}
        </EditableLabel>
      </PlasmicFolderItem>
    );
  })
);

export default FolderItem;
