import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import { arrayMoveIndex } from "@/wab/collections";
import { cx, ensure, ensureHTMLElt, tuple } from "@/wab/common";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { Dropdown, Menu, Tooltip } from "antd";
import classNames from "classnames";
import Downshift, {
  ControllerStateAndHelpers,
  DownshiftProps,
} from "downshift";
import L from "lodash";
import * as React from "react";
import { createRef } from "react";
import type { SetOptional } from "type-fest";
import { DropdownArrow, IconLinkButton } from "./widgets";
import { Icon } from "./widgets/Icon";

interface _XMultiSelectProps<Item> {
  fixedValues: Item[];
  focusedItem?: Item;
  itemKey: (item: Item | null) => string;
  onBlur?: (...args: any[]) => any;
  onOuterClick?: () => any;
  onClick?: (e: React.MouseEvent) => any;
  onFocusItem?: (item: Item) => void;
  onInputValueChange?: (text: string) => void;
  onSelect: (item: Item) => boolean | void;
  onUnselect: (item: Item) => any;
  options: Item[];
  renderInput: (props: {}) => any;
  renderOption: (item: Item) => React.ReactNode;
  renderSelectedItem: (item: Item, index: number) => React.ReactNode;
  selectedItems: Item[];
  showDropdownArrow: boolean;
  downshiftProps?: Partial<DownshiftProps<Item>>;
  autoFocus?: boolean;
  placeholder?: string;
  pillsFocusable?: boolean;
  className?: string;
  focusedClassName?: string;
  pillClassName?: string;
  pillSelectedClassName?: string;
  onReorder?: (from: number, to: number) => void;
  hideCloseButton?: boolean;
  filterOptions: (options: Item[], input: string | null) => Item[];
  isDisabled?: boolean;
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
  "data-plasmic-prop"?: string;
}
interface _XMultiSelectState<Item> {
  focused?: boolean;
  draggedItem?: Item;
  draggedFromIndex?: number;
  draggedToIndex?: number;
}
class _XMultiSelect<Item> extends React.Component<
  _XMultiSelectProps<Item>,
  _XMultiSelectState<Item>
> {
  private inputBox = createRef<HTMLInputElement>();

  static defaultProps = {
    onSelect: L.noop,
    onUnselect: L.noop,
    itemKey: (item: any) => (item === null ? "" : `${item}`),
    options: [],
    renderInput: (props) => <input {...props} className="transparent" />,
    renderOption: (item: any) => `${item}`,
    renderSelectedItem: (item: any) => `${item}`,
    selectedItems: [],
    showDropdownArrow: false,
    fixedValues: [],
    pillsFocusable: false,
  };

  constructor(props: _XMultiSelectProps<Item>) {
    super(props);
    this.state = {};
  }

  render() {
    const {
      downshiftProps,
      fixedValues,
      focusedItem,
      itemKey,
      onFocusItem,
      onInputValueChange,
      onSelect,
      onUnselect,
      options,
      renderInput,
      renderOption,
      renderSelectedItem,
      selectedItems,
      onBlur,
      onOuterClick,
      autoFocus,
      placeholder,
      pillsFocusable,
      onReorder,
      filterOptions,
      isDisabled,
      disabledTooltip,
      onClick,
    } = this.props;
    const reorderedItems = this.dragReorderedItems();
    const handleSelect = (
      item: Item | null,
      downshift: ControllerStateAndHelpers<Item>
    ) => {
      if (item && !selectedItems.includes(item)) {
        const closeOnSelect = onSelect(item);
        downshift.reset();
        if (!closeOnSelect) {
          downshift.openMenu();
        }
      }
    };
    return (
      <Downshift<Item>
        itemToString={itemKey}
        onChange={handleSelect}
        initialHighlightedIndex={0}
        selectedItem={null}
        onInputValueChange={onInputValueChange}
        onOuterClick={onOuterClick}
        {...downshiftProps}
      >
        {(downshift) => {
          const { getInputProps, getRootProps } = downshift;
          const isInputEmpty =
            !downshift.inputValue || downshift.inputValue.trim().length === 0;
          if (downshift.highlightedIndex == null && !isInputEmpty) {
            downshift.setHighlightedIndex(0);
          }
          const renderOptions = filterOptions(options, downshift.inputValue);
          const curItem =
            renderOptions.length > 0 && downshift.highlightedIndex !== null
              ? renderOptions[downshift.highlightedIndex]
              : undefined;
          return (
            <MaybeWrap
              cond={!!isDisabled && !!disabledTooltip}
              wrapper={(x) => <Tooltip title={disabledTooltip}>{x}</Tooltip>}
            >
              <div
                className={cx({
                  "dropdown-container flex": true,
                  [this.props.className || ""]: true,
                  "dropdown-container--focused": this.state.focused,
                  [this.props.focusedClassName || ""]: this.state.focused,
                })}
                data-plasmic-prop={this.props["data-plasmic-prop"]}
                {...getRootProps(undefined, { suppressRefError: true })}
              >
                <Dropdown
                  visible={downshift.isOpen && renderOptions.length > 0}
                  // We compartmentalize the Ant dropdown menu item padding style tweaks into .xselect.
                  // Don't want to globally affect all Ant dropdown menus.
                  getPopupContainer={() =>
                    ensureHTMLElt(document.querySelector(".xselect"))
                  }
                  overlay={
                    <Menu
                      className={"ant-select-dropdown-menu"}
                      selectedKeys={[curItem ? itemKey(curItem) : ""]}
                    >
                      {renderOptions.map((item: Item, index: number) => {
                        const key = itemKey(item);
                        return (
                          <Menu.Item key={key}>
                            <div
                              {...downshift.getItemProps({
                                item,
                                index,
                                key,
                              })}
                            >
                              {renderOption(item)}
                            </div>
                          </Menu.Item>
                        );
                      })}
                    </Menu>
                  }
                >
                  <div
                    className="flex flex-vcenter flex-wrap flex-fill"
                    onMouseDown={(e) => {
                      // This appears as part of the normal textbox.  If the user was focused on the textbox and then clicks here,
                      // no blur (however brief) should happen.
                      //
                      // From <https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus>:
                      // "If you call HTMLElement.focus() from a mousedown event handler, you must call
                      // event.preventDefault() to keep the focus from leaving the HTMLElement."
                      //
                      // Only do this for clicks on the container itself.  Clicks within the input box should not be
                      // interfered with (e.g. moving the I-beam), and clicks on the pills should not trigger focus and
                      // should be able to steal focus.
                      if (e.target === e.currentTarget) {
                        ensure(
                          this.inputBox.current,
                          "Unexpected undefined inputBox.current"
                        ).focus();
                        e.preventDefault();
                      }
                    }}
                  >
                    {reorderedItems.map((item: Item, index) => {
                      const isFocusedItem =
                        pillsFocusable && focusedItem === item;
                      return (
                        <div
                          key={itemKey(item)}
                          className={cx({
                            "dropdown-pill": true,
                            "dropdown-pill--selected":
                              isFocusedItem || item === this.state.draggedItem,
                            [this.props.pillClassName || ""]: true,
                            [this.props.pillSelectedClassName || ""]:
                              isFocusedItem || item === this.state.draggedItem,
                          })}
                          draggable={
                            !!onReorder && this.state.draggedItem !== item
                          }
                          onDragStart={
                            onReorder &&
                            ((e) => this.handleDragStart(e, item, index))
                          }
                          onDragOver={
                            onReorder &&
                            ((e) => this.handleDragOverOrEnter(e, item, index))
                          }
                          onDragEnter={
                            onReorder &&
                            ((e) => this.handleDragOverOrEnter(e, item, index))
                          }
                          onDragEnd={onReorder && this.handleDragEnd}
                          onDrop={
                            onReorder &&
                            (() => {
                              // We need to have a drop handler for this pill to be a valid drop target,
                              // but we don't actually need to do anything, as we handle the actual move
                              // in onDragEnd.
                            })
                          }
                          data-test-id={"multi-select-value"}
                        >
                          <span
                            className={classNames({
                              "dropdown-pill__contents": true,
                              "dropdown-pill__contents--clickable":
                                !!onFocusItem,
                            })}
                            onClick={() => {
                              if (onFocusItem) {
                                onFocusItem(item);
                                downshift.closeMenu();
                              }
                            }}
                          >
                            {renderSelectedItem(item, index)}
                          </span>

                          {!fixedValues.includes(item) &&
                            !this.props.hideCloseButton && (
                              <>
                                <IconLinkButton
                                  className={cx({
                                    "dropdown-pill__deleter": true,
                                    inverted: isFocusedItem,
                                  })}
                                  onMouseDown={(e) => {
                                    // Using onMouseDown instead of onClick to be ahead of
                                    // input element's blur event.  With onClick, sometimes
                                    // this fires before onBlur and sometiems after, not sure
                                    // why...
                                    e.preventDefault();
                                    onUnselect(item);
                                  }}
                                >
                                  <Icon
                                    icon={CloseIcon}
                                    className="no-line-height"
                                  />
                                </IconLinkButton>
                              </>
                            )}
                        </div>
                      );
                    })}

                    <div className={"dropdown-input-container"}>
                      {renderInput(
                        getInputProps({
                          ref: this.inputBox,
                          disabled: isDisabled,
                          onClick,
                          onBlur: (e) => {
                            this.setState({ focused: false });
                            if (onBlur) {
                              onBlur(e);
                            }
                          },
                          autoFocus,
                          onFocus: () => {
                            downshift.openMenu();
                            this.setState({ focused: true });
                          },
                          placeholder:
                            selectedItems.length === 0
                              ? placeholder
                              : undefined,
                          className: "textbox--transparent",
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === "Escape" && this.inputBox.current) {
                              this.inputBox.current.blur();
                              e.stopPropagation();
                            }
                            if (
                              (e.key === "Delete" || e.key === "Backspace") &&
                              isInputEmpty
                            ) {
                              const last = L.last(selectedItems);
                              if (last) {
                                onUnselect(last);
                              }
                            }
                            if (
                              e.key === "Enter" &&
                              !curItem &&
                              this.inputBox.current
                            ) {
                              this.inputBox.current.blur();
                            }
                          },
                        })
                      )}{" "}
                      {this.props.showDropdownArrow ? (
                        <DropdownArrow />
                      ) : undefined}
                    </div>
                  </div>
                </Dropdown>
              </div>
            </MaybeWrap>
          );
        }}
      </Downshift>
    );
  }

  private handleDragStart = (e: React.DragEvent, item: Item, index: number) => {
    this.setState({ draggedItem: item, draggedFromIndex: index });
    return true;
  };

  private handleDragOverOrEnter = (
    e: React.DragEvent,
    item: Item,
    index: number
  ) => {
    console.log("DRAG OVER", item, index, this.state);
    if (index !== this.state.draggedToIndex) {
      e.stopPropagation();
      e.preventDefault();
      this.setState({
        draggedToIndex: index,
      });
    }
  };

  private handleDragEnd = (_e: React.DragEvent) => {
    const fromIndex = ensure(
      this.state.draggedFromIndex,
      "Unexpected undefined draggedFromIndex. Should be not null to handle drag end"
    );
    const toIndex = this.state.draggedToIndex;
    this.setState({
      draggedItem: undefined,
      draggedToIndex: undefined,
      draggedFromIndex: undefined,
    });
    if (toIndex !== undefined && fromIndex !== toIndex) {
      ensure(
        this.props.onReorder,
        "Unexpected undefined onReorder. If drag is enable should have onReorder method"
      )(fromIndex, toIndex);
    }
  };

  private dragReorderedItems() {
    const selectedItems = this.props.selectedItems;
    if (this.state.draggedItem && this.state.draggedToIndex !== undefined) {
      return arrayMoveIndex(
        selectedItems,
        ensure(
          this.state.draggedFromIndex,
          "Unexpected undefined draggedFromIndex. Should be not null to drag reordered items"
        ),
        this.state.draggedToIndex
      );
    } else {
      return selectedItems;
    }
  }
}

type RawProps = typeof _XMultiSelect.defaultProps;

type XMultiSelectProps<Item> = SetOptional<
  _XMultiSelectProps<Item>,
  keyof RawProps
> & {
  onClick?: (e: React.MouseEvent) => void;
  selectedItems?: Item[];
  defaultSelectedItems?: Item[];

  focusedItem?: Item;
  defaultFocusedItem?: Item;
};

interface XMultiSelectState<Item> {
  selectedItems: Item[];
  focusedItem: Item | undefined;
}

export class XMultiSelect<Item> extends React.Component<
  XMultiSelectProps<Item>,
  XMultiSelectState<Item>
> {
  constructor(props: XMultiSelectProps<Item>) {
    super(props);
    this.state = {
      selectedItems: props.defaultSelectedItems || [],
      focusedItem: props.defaultFocusedItem,
    };
  }
  render() {
    const props: XMultiSelectProps<Item> = Object.assign({}, this.props);
    if (!this.props.selectedItems) {
      props.onSelect = (item: Item) =>
        this.setState(({ selectedItems }) => ({
          selectedItems: tuple(...selectedItems, item),
        }));
      props.onUnselect = (item: Item) =>
        this.setState(({ selectedItems }) => ({
          selectedItems: L.without(selectedItems, item),
        }));
      props.selectedItems = this.state.selectedItems;
    }
    if (!this.props.onFocusItem) {
      props.onFocusItem = (item: Item) => this.setState({ focusedItem: item });
      props.focusedItem = this.state.focusedItem;
    }
    return <_XMultiSelect<Item> {...props} />;
  }
}
