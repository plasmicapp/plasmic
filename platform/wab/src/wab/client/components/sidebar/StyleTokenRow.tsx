import { MenuBuilder } from "@/wab/client/components/menu-builder";
import ColorTokenControl from "@/wab/client/components/sidebar/ColorTokenControl";
import GeneralTokenControl from "@/wab/client/components/sidebar/GeneralTokenControl";
import { useStyleTokenControls } from "@/wab/client/components/sidebar/LeftGeneralTokensPanel";
import { useMultiAssetsActions } from "@/wab/client/components/sidebar/MultiAssetsActions";
import {
  TOKEN_ROW_HEIGHT,
  getLeftPadding,
  isTokenPanelReadOnly,
} from "@/wab/client/components/sidebar/token-utils";
import ColorSwatch from "@/wab/client/components/style-controls/ColorSwatch";
import { Matcher } from "@/wab/client/components/view-common";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  StyleTokenValue,
  isStyleTokenEditable,
} from "@/wab/commons/StyleToken";
import { spawn } from "@/wab/shared/common";
import {
  finalStyleTokensForDep,
  siteFinalStyleTokensOfType,
} from "@/wab/shared/core/site-style-tokens";
import {
  FinalToken,
  MutableToken,
  OverrideableToken,
} from "@/wab/shared/core/tokens";
import { StyleToken } from "@/wab/shared/model/classes";
import { Menu } from "antd";
import { sortBy } from "lodash";
import { observer } from "mobx-react";
import React from "react";

const StyleTokenRow = observer(function _StyleTokenRow(props: {
  token: FinalToken<StyleToken>;
  tokenValue: StyleTokenValue;
  matcher: Matcher;
  indentMultiplier: number;
}) {
  const { token, tokenValue, matcher, indentMultiplier } = props;
  const studioCtx = useStudioCtx();
  const multiAssetsActions = useMultiAssetsActions();
  const { vsh, resolver, onDuplicate, onSelect, onDeleteOverride } =
    useStyleTokenControls();

  const tokenPanelReadOnly = isTokenPanelReadOnly(studioCtx);

  const onFindReferences = () => {
    spawn(
      studioCtx.change(({ success }) => {
        studioCtx.findReferencesStyleToken = token.base;
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
      if (
        !tokenPanelReadOnly &&
        isStyleTokenEditable(token, vsh, studioCtx.getCurrentUiConfig()) &&
        token instanceof OverrideableToken
      ) {
        if (vsh && !vsh.isTargetBaseVariant()) {
          push(
            <Menu.Item key="varianted-override" onClick={() => onSelect(token)}>
              Override global variant value
            </Menu.Item>
          );
          if (token.override && !vsh.isStyleInherited(token)) {
            push(
              <Menu.Item
                key="remove-global-variant-value"
                onClick={async () => {
                  return studioCtx.change(({ success }) => {
                    vsh.removeVariantedValue(token);
                    return success();
                  });
                }}
              >
                Remove global variant override
              </Menu.Item>
            );
          }
        } else {
          push(
            <Menu.Item key="override" onClick={() => onSelect(token)}>
              Override value
            </Menu.Item>
          );
          if (token.override?.value) {
            push(
              <Menu.Item
                key="remove-override"
                onClick={() => onDeleteOverride(token)}
              >
                Remove override
              </Menu.Item>
            );
          }
        }
      }

      if (!tokenPanelReadOnly && token.isLocal) {
        push(
          <Menu.Item key="clone" onClick={() => onDuplicate(token.base)}>
            Duplicate
          </Menu.Item>
        );
      }

      if (
        !tokenPanelReadOnly &&
        token instanceof MutableToken &&
        vsh &&
        !vsh.isTargetBaseVariant() &&
        !vsh.isStyleInherited(token)
      ) {
        push(
          <Menu.Item
            key="remove-global-variant-value"
            onClick={async () => {
              return studioCtx.change(({ success }) => {
                vsh.removeVariantedValue(token);
                return success();
              });
            }}
          >
            Remove global variant value
          </Menu.Item>
        );
      }

      builder.genSection(undefined, () => {
        const pushTokens = (
          tokens: ReadonlyArray<FinalToken<StyleToken>>,
          push_: (x: React.ReactElement) => void
        ) => {
          for (const tok of sortBy(tokens, (t) => t.name)) {
            if (tok.uuid !== token.uuid) {
              push_(
                <Menu.Item
                  key={tok.uuid}
                  onClick={() => {
                    spawn(studioCtx.siteOps().swapTokens(token.base, tok.base));
                  }}
                >
                  <div className="flex-row flex-vcenter gap-sm">
                    {tok.type === "Color" && (
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
            siteFinalStyleTokensOfType(studioCtx.site, token.type),
            push2
          );
          for (const dep of studioCtx.site.projectDependencies) {
            builder.genSection(`Imported from "${dep.name}"`, (push3) => {
              pushTokens(
                finalStyleTokensForDep(studioCtx.site, dep.site).filter(
                  (t) => t.type === token.type
                ),
                push3
              );
            });
          }
        });
      });

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
                await studioCtx.siteOps().tryDeleteTokens([token.base]);
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
    : !tokenPanelReadOnly &&
      isStyleTokenEditable(token, vsh, studioCtx.getCurrentUiConfig())
    ? () => onSelect(token)
    : undefined;

  return (
    <>
      {token.type === "Color" && (
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

      {token.type !== "Color" && (
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

export default StyleTokenRow;
