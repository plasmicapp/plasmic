// eslint-disable-next-line no-restricted-imports
import RowGroup from "@/wab/client/components/RowGroup";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import ColorTokenControl from "@/wab/client/components/sidebar/ColorTokenControl";
import GeneralTokenControl from "@/wab/client/components/sidebar/GeneralTokenControl";
import { useMultiAssetsActions } from "@/wab/client/components/sidebar/MultiAssetsActions";
import { ColorSidebarPopup } from "@/wab/client/components/style-controls/ColorButton";
import ColorSwatch from "@/wab/client/components/style-controls/ColorSwatch";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TokenType, TokenValue } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { TokenValueResolver } from "@/wab/shared/cached-selectors";
import { ensure, spawn } from "@/wab/shared/common";
import { allColorTokens } from "@/wab/shared/core/sites";
import { maybeTokenRefCycle } from "@/wab/shared/core/styles";
import { StyleToken } from "@/wab/shared/model/classes";
import { canCreateAlias } from "@/wab/shared/ui-config-utils";
import { Menu, notification } from "antd";
import { sortBy } from "lodash";
import { observer } from "mobx-react";
import React from "react";
import { FaArrowRight } from "react-icons/fa";

export const TOKEN_ROW_HEIGHT = 32;

export const TokenControlsContext = React.createContext<{
  vsh: VariantedStylesHelper | undefined;
  resolver: TokenValueResolver;
  onDuplicate: (token: StyleToken) => Promise<void>;
  onSelect: (token: StyleToken) => void;
  onAdd: (tokenType: TokenType, folderName?: string) => Promise<void>;
  expandedHeaders: Set<TokenType>;
  setExpandedHeaders: React.Dispatch<React.SetStateAction<Set<TokenType>>>;
} | null>(null);

export function useTokenControls() {
  return ensure(
    React.useContext(TokenControlsContext),
    "useTokenControls must be used within a TokenControlsProvider"
  );
}

export const isTokenReadOnly = (studioCtx: StudioCtx) => {
  const uiConfig = studioCtx.getCurrentUiConfig();
  const canCreateToken = canCreateAlias(uiConfig, "token");

  return (
    !canCreateToken || studioCtx.getLeftTabPermission("tokens") === "readable"
  );
};

export const newTokenValueAllowed = (
  token: StyleToken,
  tokens: StyleToken[],
  newValue: string,
  vsh?: VariantedStylesHelper
) => {
  const maybeCycle = maybeTokenRefCycle(token, tokens, newValue, vsh);
  if (!maybeCycle) {
    return true;
  }
  const cycle = maybeCycle.map((name, i) => (
    <span key={i}>
      <span className={"token-ref-cycle-item"}>{name}</span>
      {i !== maybeCycle.length - 1 && <FaArrowRight />}
    </span>
  ));

  notification.error({
    message: "Cyclic token references disallowed",
    description: (
      <div>
        Cannot refer to the token since it will lead to the following cycle{" "}
        <div>{cycle}</div>
      </div>
    ),
  });

  return false;
};

const getLeftPadding = (indentMultiplier: number) => {
  return indentMultiplier * 16 + 6;
};

export const TokenRow = observer(function TokenRow(props: {
  token: StyleToken;
  tokenValue: TokenValue;
  matcher: Matcher;
  isImported: boolean;
  indentMultiplier: number;
}) {
  const { token, tokenValue, matcher, isImported, indentMultiplier } = props;
  const studioCtx = useStudioCtx();
  const multiAssetsActions = useMultiAssetsActions();
  const { vsh, resolver, onDuplicate, onSelect } = useTokenControls();

  const uiConfig = studioCtx.getCurrentUiConfig();
  const canCreateToken = canCreateAlias(uiConfig, "token");

  const readOnly =
    isImported ||
    token.isRegistered ||
    !canCreateToken ||
    studioCtx.getLeftTabPermission("tokens") === "readable";

  const onFindReferences = () => {
    spawn(
      studioCtx.change(({ success }) => {
        studioCtx.findReferencesToken = token;
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
      if (!readOnly) {
        push(
          <Menu.Item key="clone" onClick={() => onDuplicate(token)}>
            Duplicate
          </Menu.Item>
        );
      }

      if (
        !readOnly &&
        vsh?.isTargetBaseVariant() === false &&
        !vsh?.isStyleInherited(token)
      ) {
        push(
          <Menu.Item
            key="remove-global-variant-value"
            onClick={async () => {
              return studioCtx.changeUnsafe(() => {
                vsh.removeVariantedValue(token);
              });
            }}
          >
            Remove global variant value
          </Menu.Item>
        );
      }

      builder.genSection(undefined, () => {
        const pushTokens = (
          tokens: StyleToken[],
          push_: (x: React.ReactElement) => void
        ) => {
          for (const tok of sortBy(tokens, (t) => t.name)) {
            if (tok !== token) {
              push_(
                <Menu.Item
                  key={tok.uuid}
                  onClick={() => {
                    spawn(studioCtx.siteOps().swapTokens(token, tok));
                  }}
                >
                  <div className="flex-row flex-vcenter gap-sm">
                    {tok.type === TokenType.Color && (
                      <ColorSwatch color={resolver(tok, vsh)} />
                    )}
                    <div>{tok.name}</div>
                    <div className="flex-push-right">
                      <code className="text-ellipsis ml-ch">
                        {resolver(tok, vsh)}
                      </code>
                    </div>
                  </div>
                </Menu.Item>
              );
            }
          }
        };
        builder.genSub("Replace all usages of this token with...", (push2) => {
          pushTokens(
            studioCtx.site.styleTokens.filter((t) => t.type === token.type),
            push2
          );
          for (const dep of studioCtx.site.projectDependencies) {
            builder.genSection(`Imported from "${dep.name}"`, (push3) => {
              pushTokens(
                dep.site.styleTokens.filter((t) => t.type === token.type),
                push3
              );
            });
          }
        });
      });

      if (!readOnly && !multiAssetsActions.isSelecting) {
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
                await studioCtx.siteOps().tryDeleteTokens([token]);
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
    : !readOnly
    ? () => onSelect(token)
    : undefined;

  return (
    <>
      {token.type === TokenType.Color && (
        <ColorTokenControl
          style={{
            height: TOKEN_ROW_HEIGHT,
            paddingLeft: getLeftPadding(indentMultiplier),
          }}
          token={token}
          tokenValue={tokenValue}
          matcher={matcher}
          menu={overlay}
          onClick={onClickHandler}
          vsh={vsh}
        />
      )}

      {token.type !== TokenType.Color && (
        <GeneralTokenControl
          style={{
            height: TOKEN_ROW_HEIGHT,
            paddingLeft: getLeftPadding(indentMultiplier),
          }}
          token={token}
          tokenValue={tokenValue}
          menu={overlay}
          matcher={matcher}
          onClick={onClickHandler}
          vsh={vsh}
        />
      )}
    </>
  );
});

export const TokenFolderRow = observer(function TokenFolderRow(props: {
  name: string;
  path?: string;
  tokenType: TokenType;
  matcher: Matcher;
  groupSize: number;
  indentMultiplier: number;
  isOpen: boolean;
}) {
  const {
    name,
    path,
    tokenType,
    matcher,
    groupSize,
    indentMultiplier,
    isOpen,
  } = props;
  const tokenControls = useTokenControls();
  const studioCtx = useStudioCtx();
  const readOnly = isTokenReadOnly(studioCtx);

  return (
    <RowGroup
      style={{
        height: TOKEN_ROW_HEIGHT,
        paddingLeft: getLeftPadding(indentMultiplier),
      }}
      groupSize={groupSize}
      isOpen={isOpen}
      showActions={!readOnly}
      actions={
        !readOnly && (
          <IconButton
            onClick={async (e) => {
              if (isOpen) {
                e.stopPropagation();
              }
              await tokenControls.onAdd(tokenType, path);
            }}
          >
            <Icon icon={PlusIcon} />
          </IconButton>
        )
      }
    >
      {matcher.boldSnippets(name)}
    </RowGroup>
  );
});

export const ColorTokenPopup = observer(function ColorTokenPopup(props: {
  token: StyleToken;
  studioCtx: StudioCtx;
  show: boolean;
  onClose: () => void;
  autoFocusName?: boolean;
  readOnly?: boolean;
  vsh?: VariantedStylesHelper;
}) {
  const {
    token,
    studioCtx,
    show,
    onClose,
    autoFocusName,
    readOnly,
    vsh = new VariantedStylesHelper(),
  } = props;
  return (
    <ColorSidebarPopup
      color={vsh.getActiveTokenValue(token)}
      onChange={async (newColor) => {
        if (
          newTokenValueAllowed(token, studioCtx.site.styleTokens, newColor, vsh)
        ) {
          await studioCtx.changeUnsafe(() => vsh.updateToken(token, newColor));
        }
      }}
      show={show}
      onClose={() => onClose()}
      autoFocus={!autoFocusName}
      colorTokens={allColorTokens(studioCtx.site, {
        includeDeps: "direct",
      }).filter((t) => t !== token)}
      popupTitle={
        <>
          <Icon
            icon={TokenIcon}
            className="token-fg custom-svg-icon--lg monochrome-exempt"
          />

          <SimpleTextbox
            defaultValue={token.name}
            onValueChange={(name) =>
              studioCtx.changeUnsafe(() =>
                studioCtx.tplMgr().renameToken(token, name)
              )
            }
            placeholder={"(unnamed token)"}
            autoFocus={autoFocusName}
            selectAllOnFocus={true}
            fontSize="xlarge"
            fontStyle="bold"
          />
        </>
      }
      vsh={vsh}
    />
  );
});
