import { ColorSwatch } from "@/wab/client/components/style-controls/ColorSwatch";
import { Matcher } from "@/wab/client/components/view-common";
import { PlainLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import { useToggleDisplayed } from "@/wab/client/dom-utils";
import { PlusIcon } from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import SearchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Search";
import { FinalStyleToken } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { cx } from "@/wab/shared/common";
import { TokenValueResolver } from "@/wab/shared/core/site-style-tokens";
import Chroma from "@/wab/shared/utils/color-utils";
import { Tooltip } from "antd";
import Downshift from "downshift";
import { observer } from "mobx-react";
import React from "react";
import { FixedSizeList } from "react-window";

const GRID_SIZE = 32;
const ROW_SIZE = 32;

export const ColorTokenSelector = observer(function ColorTokenSelector(props: {
  tokens: FinalStyleToken[];
  onSelect: (token: FinalStyleToken) => void;
  selectedToken?: FinalStyleToken;
  onAddToken: () => void;
  resolver: TokenValueResolver;
  className?: string;
  autoFocusSearch?: boolean;
  maxRows?: number;
  vsh?: VariantedStylesHelper;
  hideAddToken?: boolean;
}) {
  const {
    tokens,
    onSelect,
    selectedToken,
    onAddToken,
    resolver,
    vsh,
    hideAddToken,
  } = props;
  const maxRows = props.maxRows ?? 5;
  const listRef = React.useRef<FixedSizeList | null>(null);
  const [query, setQuery] = React.useState("");
  const hasQuery = !!query && query.trim() !== "";
  const matcher = new Matcher(hasQuery ? query : "", {
    matchMiddleOfWord: true,
  });
  const matchedTokens = hasQuery
    ? tokens.filter(
        (t) =>
          matcher.matches(t.name) ||
          matcher.matches(Chroma.stringify(resolver(t, vsh)))
      )
    : tokens;
  const inputRef = React.useRef<HTMLInputElement>(null);

  // TODO: measure actual width available to us
  const width = 240;
  const numCols = Math.ceil(width / GRID_SIZE) - 1;
  const numRows = Math.ceil(tokens.length / numCols);

  useToggleDisplayed(inputRef, () => {
    if (props.autoFocusSearch && inputRef.current) {
      inputRef.current.focus();
    }
  });

  React.useEffect(() => {
    if (listRef.current) {
      if (!hasQuery && selectedToken) {
        const index = tokens.indexOf(selectedToken);
        if (index >= 0) {
          const rowIndex = Math.ceil(index / numCols);
          listRef.current.scrollToItem(rowIndex, "smart");
        }
      }
    }
  }, [selectedToken]);

  return (
    <Downshift<FinalStyleToken>
      selectedItem={null}
      defaultHighlightedIndex={0}
      itemToString={(t) => ""}
      isOpen={true}
      onSelect={(item, downshift) => {
        if (item) {
          onSelect(item);
          setQuery("");
        }
      }}
      onStateChange={(change) => {
        if (listRef.current) {
          if (change.highlightedIndex != null) {
            listRef.current.scrollToItem(change.highlightedIndex, "smart");
          }
        }
      }}
      itemCount={hasQuery ? matchedTokens.length : undefined}
    >
      {(downshift) => {
        const height = hasQuery
          ? Math.min(maxRows, matchedTokens.length) * ROW_SIZE
          : Math.min(maxRows, numRows) * GRID_SIZE;
        return (
          <div className={props.className}>
            <div className="flex flex-vcenter">
              <Icon icon={SearchIcon} className="dimdimfg" />
              <input
                className="ml-sm flex-fill mr-sm"
                placeholder={"Search for token"}
                {...downshift.getInputProps({
                  onKeyDown: (e) => {
                    if (e.key === "Enter") {
                      // Don't propagate Enter key, in case we are in a modal
                      e.stopPropagation();
                    }
                  },
                  ref: inputRef,
                })}
                value={query}
                onChange={(e) => {
                  setQuery(e.currentTarget.value);
                }}
                autoFocus={props.autoFocusSearch}
              />
              {hideAddToken ? null : (
                <Tooltip title="Create a new color token">
                  <IconButton onClick={() => onAddToken()} type="round">
                    <Icon icon={PlusIcon} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
            <div className="SwatchItemList mt-m" {...downshift.getMenuProps()}>
              <FixedSizeList
                width={"100%"}
                height={height + 5}
                itemSize={hasQuery ? ROW_SIZE : GRID_SIZE}
                itemCount={hasQuery ? matchedTokens.length : numRows}
                ref={listRef}
                overscanCount={5}
              >
                {({ index, style }) => {
                  if (hasQuery) {
                    const token = matchedTokens[index];
                    if (!token) {
                      return null;
                    }
                    return (
                      <Tooltip
                        key={`tooltip-${token.uuid}`}
                        title={`${token.name} (${Chroma.stringify(
                          resolver(token, vsh)
                        )})`}
                      >
                        <div
                          {...downshift.getItemProps({
                            item: token,
                            key: token.uuid,
                            style: style,
                            index,
                            onMouseDown: () => onSelect(token),
                            className: cx({
                              NamedSwatch: true,
                              "NamedSwatch--highlighted":
                                downshift.highlightedIndex === index,
                              "NamedSwatch--selected": token === selectedToken,
                              "pl-m": true,
                            }),
                          })}
                        >
                          <ColorSwatch
                            color={resolver(token, vsh)}
                            isSelected={token === selectedToken}
                          />
                          <div className="text-ellipsis ml-m">
                            {matcher.boldSnippets(token.name)} (
                            {matcher.boldSnippets(
                              Chroma.stringify(resolver(token, vsh))
                            )}
                            )
                          </div>
                        </div>
                      </Tooltip>
                    );
                  } else {
                    const rowTokens = tokens.slice(
                      numCols * index,
                      numCols * index + numCols
                    );
                    return (
                      <div
                        className="flex flex-vcenter flex-hcenter"
                        style={style}
                      >
                        {rowTokens.map((token) => (
                          <Tooltip
                            key={token.uuid}
                            title={`${token.name} (${Chroma.stringify(
                              resolver(token, vsh)
                            )})`}
                          >
                            <PlainLinkButton
                              key={token.uuid}
                              onMouseDown={() => onSelect(token)}
                              className="flex flex-vcenter flex-hcenter SwatchButton"
                              style={{
                                width: GRID_SIZE,
                                height: GRID_SIZE,
                              }}
                            >
                              <ColorSwatch
                                color={resolver(token, vsh)}
                                isSelected={token === selectedToken}
                              />
                            </PlainLinkButton>
                          </Tooltip>
                        ))}
                      </div>
                    );
                  }
                }}
              </FixedSizeList>
            </div>
          </div>
        );
      }}
    </Downshift>
  );
});
