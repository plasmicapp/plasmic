import { MenuBuilder } from "@/wab/client/components/menu-builder";
import GeneralDataTokenControl from "@/wab/client/components/sidebar/GeneralDataTokenControl";
import { useDataTokenControls } from "@/wab/client/components/sidebar/LeftGeneralDataTokensPanel";
import { useMultiAssetsActions } from "@/wab/client/components/sidebar/MultiAssetsActions";
import {
  TOKEN_ROW_HEIGHT,
  getLeftPadding,
  isDataTokenPanelReadOnly,
} from "@/wab/client/components/sidebar/token-utils";
import { Matcher } from "@/wab/client/components/view-common";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { DataTokenValue, isDataTokenEditable } from "@/wab/commons/DataToken";
import { spawn } from "@/wab/shared/common";
import { FinalToken, MutableToken } from "@/wab/shared/core/tokens";
import { DataToken } from "@/wab/shared/model/classes";
import { Menu } from "antd";
import { observer } from "mobx-react";
import React from "react";

const DataTokenRow = observer(function _DataTokenRow(props: {
  token: FinalToken<DataToken>;
  tokenValue: DataTokenValue;
  matcher: Matcher;
  indentMultiplier: number;
}) {
  const { token, tokenValue, matcher, indentMultiplier } = props;
  const studioCtx = useStudioCtx();
  const multiAssetsActions = useMultiAssetsActions();
  const { onDuplicate, onSelect } = useDataTokenControls();

  const tokenPanelReadOnly = isDataTokenPanelReadOnly(studioCtx);

  const onFindReferences = () => {
    spawn(
      studioCtx.change(({ success }) => {
        studioCtx.findReferencesDataToken = token.base;
        return success();
      })
    );
  };

  const overlay = () => {
    const builder = new MenuBuilder();

    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item key="references" onClick={() => onFindReferences()}>
          Find all references
        </Menu.Item>
      );

      if (!tokenPanelReadOnly && token.isLocal) {
        push(
          <Menu.Item key="clone" onClick={() => onDuplicate(token.base)}>
            Duplicate
          </Menu.Item>
        );
      }

      // TODO: Replace all usages option

      if (
        !tokenPanelReadOnly &&
        token instanceof MutableToken &&
        !multiAssetsActions.isSelecting
      ) {
        builder.genSection(undefined, (push2) => {
          push2(
            <Menu.Item
              key="bulk-select"
              onClick={() => {
                multiAssetsActions.onAssetSelected(token.uuid, true);
              }}
            >
              Start bulk selection
            </Menu.Item>
          );
          push2(
            <Menu.Item
              key="delete"
              onClick={async () => {
                // TODO: Token deletion
                // await studioCtx.siteOps().tryDeleteDataTokens([token.base]);
              }}
            >
              Delete
            </Menu.Item>
          );
        });
      }
    });
    return builder.build({
      onMenuClick: (e) => e.domEvent.stopPropagation(),
      menuName: "token-item-menu",
    });
  };

  const onToggle = React.useCallback(() => {
    if (multiAssetsActions.isSelecting) {
      const uuid = token.uuid;
      multiAssetsActions.onAssetSelected(
        uuid,
        !multiAssetsActions.isAssetSelected(uuid)
      );
    }
  }, [multiAssetsActions, token.uuid]);

  const onClickHandler = multiAssetsActions.isSelecting
    ? onToggle
    : !tokenPanelReadOnly && isDataTokenEditable(token)
    ? () => onSelect(token)
    : undefined;

  return (
    <GeneralDataTokenControl
      style={{
        height: TOKEN_ROW_HEIGHT,
        paddingLeft: getLeftPadding(indentMultiplier),
      }}
      token={token}
      tokenValue={tokenValue}
      matcher={matcher}
      menu={overlay}
      onClick={onClickHandler}
    />
  );
});

export default DataTokenRow;
