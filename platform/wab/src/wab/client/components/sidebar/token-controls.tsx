// eslint-disable-next-line no-restricted-imports
import { StyleToken } from "@/wab/classes";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { useMultiAssetsActions } from "@/wab/client/components/sidebar/MultiAssetsActions";
import { ColorSidebarPopup } from "@/wab/client/components/style-controls/ColorButton";
import ColorSwatch from "@/wab/client/components/style-controls/ColorSwatch";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/common";
import { removeFromArray } from "@/wab/commons/collections";
import { TokenType } from "@/wab/commons/StyleToken";
import { getComponentDisplayName } from "@/wab/components";
import { TokenResolver } from "@/wab/shared/cached-selectors";
import { FRAMES_CAP, FRAME_LOWER, MIXINS_CAP } from "@/wab/shared/Labels";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { allColorTokens } from "@/wab/sites";
import {
  changeTokenUsage,
  extractTokenUsages,
  maybeTokenRefCycle,
} from "@/wab/styles";
import { Menu, notification } from "antd";
import { sortBy } from "lodash";
import { observer } from "mobx-react-lite";
import React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { FaArrowRight } from "react-icons/fa";
import ColorTokenControl from "./ColorTokenControl";
import GeneralTokenControl from "./GeneralTokenControl";

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

export const makeUsageControl = (names: Array<string>, usageName: string) => {
  if (names.length === 0) {
    return null;
  }
  return (
    <li className="asset-usage-type-container" key={usageName}>
      {usageName}:{" "}
      <span className="asset-usage-items">
        {names.map((name, i) => (
          <span key={i} className={"asset-usage-item"}>
            {name}
          </span>
        ))}
      </span>
    </li>
  );
};

export const showDeleteModal = async (
  usages: React.ReactNode,
  title: string,
  message: string
) => {
  const content = (
    <>
      {message}
      <ul className="asset-usage-ul">{usages}</ul>
    </>
  );

  return await reactConfirm({
    title,
    message: content,
  });
};

export const StyleTokenControl = observer(function StyleTokenControl(props: {
  studioCtx: StudioCtx;
  token: StyleToken;
  onDuplicate?: () => void;
  onFindReferences: () => void;
  matcher: Matcher;
  readOnly?: boolean;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  onClick?: () => void;
  resolver: TokenResolver;
  vsh?: VariantedStylesHelper;
}) {
  const {
    token,
    studioCtx,
    readOnly,
    isDragging,
    dragHandleProps,
    onClick,
    resolver,
    vsh,
  } = props;

  const multiAssetsActions = useMultiAssetsActions();

  const overlay = () => {
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item key="references" onClick={() => props.onFindReferences()}>
          Find all references
        </Menu.Item>
      );
      if (props.onDuplicate) {
        push(
          <Menu.Item key="clone" onClick={() => props.onDuplicate!()}>
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
                    spawn(
                      studioCtx.changeUnsafe(() =>
                        studioCtx.tplMgr().swapTokens(token, tok)
                      )
                    );
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
                const site = studioCtx.site;
                const [usages, summary] = extractTokenUsages(site, token);

                if (usages.size > 0) {
                  const usageControls = (
                    <>
                      {makeUsageControl(
                        summary.components.map(getComponentDisplayName),
                        "Components"
                      )}
                      {makeUsageControl(
                        summary.frames.map(
                          (frame) => frame.name || `unnamed ${FRAME_LOWER}`
                        ),
                        FRAMES_CAP
                      )}
                      {makeUsageControl(
                        summary.mixins.map((m) => m.name),
                        MIXINS_CAP
                      )}
                      {makeUsageControl(
                        summary.tokens.map((t) => t.name),
                        "Tokens"
                      )}
                      {makeUsageControl(
                        summary.themes.map((t) => t.style.name),
                        "Default Typography Styles"
                      )}
                      {makeUsageControl(summary.addItemPrefs, "Initial Styles")}
                    </>
                  );

                  const reallyDelete = await showDeleteModal(
                    usageControls,
                    `Deleting token ${token.name}`,
                    "Deleting the token will hard code its value at all its usages as below."
                  );
                  if (reallyDelete) {
                    await studioCtx.changeUnsafe(() => {
                      usages.forEach((usage) =>
                        changeTokenUsage(site, token, usage, "inline")
                      );

                      removeFromArray(site.styleTokens, token);
                    });
                  }
                } else {
                  await studioCtx.changeUnsafe(() => {
                    removeFromArray(site.styleTokens, token);
                  });
                }
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

  const onClickHandler = multiAssetsActions.isSelecting ? onToggle : onClick;

  return (
    <>
      {token.type === TokenType.Color && (
        <ColorTokenControl
          matcher={props.matcher}
          token={props.token}
          studioCtx={studioCtx}
          readOnly={props.readOnly}
          menu={overlay}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
          onClick={onClickHandler}
          resolver={resolver}
          vsh={vsh}
        />
      )}

      {token.type !== TokenType.Color && (
        <GeneralTokenControl
          token={props.token}
          studioCtx={studioCtx}
          readOnly={props.readOnly}
          menu={overlay}
          matcher={props.matcher}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
          onClick={onClickHandler}
          resolver={resolver}
          vsh={vsh}
        />
      )}
    </>
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
