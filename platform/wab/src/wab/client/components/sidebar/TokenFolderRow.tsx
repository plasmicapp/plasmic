import RowGroup from "@/wab/client/components/RowGroup";
import { FolderContextMenu } from "@/wab/client/components/sidebar-tabs/ProjectPanel/FolderContextMenu";
import {
  TOKEN_ROW_HEIGHT,
  TokenFolder,
  TokenType,
  TokenValue,
  getLeftPadding,
  isTokenPanelReadOnly,
} from "@/wab/client/components/sidebar/token-utils";
import { Matcher } from "@/wab/client/components/view-common";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { DataTokenType, DataTokenValue } from "@/wab/commons/DataToken";
import { StyleTokenType, StyleTokenValue } from "@/wab/commons/StyleToken";
import { DataToken, StyleToken, Token } from "@/wab/shared/model/classes";
import cn from "classnames";
import { observer } from "mobx-react";
import React from "react";

interface TokenFolderRowProps<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue
> {
  folder: TokenFolder<TToken, TType, TValue>;
  matcher: Matcher;
  indentMultiplier: number;
  isOpen: boolean;
  toggleExpand: () => void;
}

function _TokenFolderRow<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue
>(props: TokenFolderRowProps<TToken, TType, TValue>) {
  const { folder, matcher, indentMultiplier, isOpen, toggleExpand } = props;
  const { onAddToken, onDeleteFolder, onFolderRenamed } = folder.actions ?? {};
  const studioCtx = useStudioCtx();
  const [renaming, setRenaming] = React.useState(false);

  const hasMenu = folder.actions && !isTokenPanelReadOnly(studioCtx);

  return (
    <RowGroup
      style={{
        height: TOKEN_ROW_HEIGHT,
        paddingLeft: getLeftPadding(indentMultiplier),
      }}
      groupSize={folder.count}
      isOpen={isOpen}
      menu={
        hasMenu ? (
          <FolderContextMenu
            onAdd={async () => {
              if (!isOpen) {
                toggleExpand();
              }
              await onAddToken?.(folder.tokenType, folder.path);
            }}
            itemDisplay={"token"}
            onSelectRename={() => setRenaming(true)}
            onDelete={() => onDeleteFolder?.(folder)}
          />
        ) : undefined
      }
    >
      <EditableLabel
        value={folder.name}
        editing={renaming}
        shrinkLabel={true}
        labelFactory={({ className, ...restProps }) => (
          <div
            className={cn("no-select fill-width", className)}
            {...restProps}
          />
        )}
        onEdit={async (newName) => {
          await onFolderRenamed?.(folder, newName);
          setRenaming(false);
        }}
        // We need to programmatically trigger editing, because otherwise
        // double-click will both trigger the editing and also trigger a
        // navigation to the item
        programmaticallyTriggered
      >
        <div className="flex-col">{matcher.boldSnippets(folder.name)}</div>
      </EditableLabel>
    </RowGroup>
  );
}

const TokenFolderRow = observer(_TokenFolderRow);

export const DataTokenFolderRow = TokenFolderRow<
  DataToken,
  DataTokenType,
  DataTokenValue
>;
export const StyleTokenFolderRow = TokenFolderRow<
  StyleToken,
  StyleTokenType,
  StyleTokenValue
>;
