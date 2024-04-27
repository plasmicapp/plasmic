// TODO note that cursorPosition logic is broken / not correctly being
//  tracked, since the use case hasn't come up.

import { Cancelable, ensure, makeCancelable, spawn } from "@/wab/common";
import sty from "@/wab/commons/components/inputs/BetterAutoComplete.module.css";
import {
  callEventHandlers,
  KeyModifiers,
} from "@/wab/commons/components/ReactUtil";
import { Dropdown, Menu } from "antd";
import Downshift, {
  ControllerStateAndHelpers,
  DownshiftProps,
  DownshiftState,
  StateChangeOptions,
} from "downshift";
import $ from "jquery";
import L, * as _ from "lodash";
import * as React from "react";
import { Component, createRef } from "react";
import ReactDOM from "react-dom";

export interface AutoCompleteSource<T> {
  query: (
    query: string,
    cursorPosition?: number,
    number?: number
  ) => Promise<T[]>;
  render: (item: T) => any;
}

export type SelectMethod =
  | "Enter"
  | "Tab"
  | "Click"
  | "ArrowLeft"
  | "ArrowRight";
export interface SelectModifiers {
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
}

export interface AutoCompleteSelectProps<T> {
  item: T;
  source: AutoCompleteSource<T>;
  selector: SelectMethod;
  modifiers: SelectModifiers;
  cursorPosition?: number;
}

export const SHOW_MORE = "Show more...";

export const initialLimit = 100;

export interface AutoCompleteProps<P = any> {
  // Starting value.  If you only specify this and not `value`, then the
  // value of the input content is owned by this component.
  defaultValue?: string;

  // Input value.  If you specify this, then this component is "controlled",
  // and the input value must be passed down by the parent (you can listen for
  // changes to input by specifying onChange).
  value?: string;

  // an AutoCompleteSource that supplies the autocomplete options given
  // the query string in the input.
  source: AutoCompleteSource<P>;

  // an input-like Component, like antd's Input or TextArea.  This is the
  // component that the user will be typing into.
  children: React.ReactElement<any>;

  // Converts an autocomplete option to unique key string, used for React key.
  // If not specified, then JSON.stringify() is used.
  itemToString?: (item: P | null) => string;

  // Called whenever the text content in the input is changed
  onChange?: (changes: StateChangeOptions<P>) => void;

  // Called whenever the user selects an autocomplete option.
  onSelect?: (props: AutoCompleteSelectProps<P>) => void;

  // Whether the autocomplete menu is open by default.
  defaultIsOpen?: boolean;

  // Whether the autocomplete menu is always open while it is mounted
  alwaysOpen?: boolean;

  // If true, then left or right arrows will also select the highlighted option
  arrowSubmits?: boolean;

  openOnFocus?: boolean;

  openOnClick?: boolean;

  selectedItem?: P | null;

  // Ant automatically adjust the position of the menu, similar to
  // jquery.position. This is to disable it.
  disableAutoAdjustment?: boolean;

  className?: string;

  downshiftReducer?: (
    state: DownshiftState<P>,
    changes: StateChangeOptions<P>
  ) => Partial<StateChangeOptions<P>>;

  // If not empty, it specifies the class name of the ancestor that may the
  // content of the dropdown. Then the dropdown need to make it scrollable while
  // not extend the clipping area.
  scrollClipperAncestors?: string[];
}

interface AutoCompleteState<P> {
  /**
   * This is just a locally kept mirror of Downshift's inputValue state -
   * only because we can't arbitrarily reach into Downshift to examine its
   * state whenever we want.  Used to feed queryOptions when the component
   * updates.
   *
   * This is only set when the value prop is unused, i.e. we're uncontrolled.
   */
  text: string;
  queriedSource?: AutoCompleteSource<P>;
  queriedItems: P[];
  cursorPosition?: number;
}

function OverlayMenu(props: {
  selectedKeys: string[];
  scrollClipperAncestors?: string[];
  children: React.ReactNode;
}) {
  const menuContainer = React.useRef<Menu | null>(null);
  React.useEffect(() => {
    if (
      menuContainer.current &&
      props.scrollClipperAncestors &&
      props.scrollClipperAncestors.length > 0
    ) {
      const menuDom = ReactDOM.findDOMNode(menuContainer.current);
      if (!menuDom) {
        return;
      }
      const menu = menuDom as HTMLDivElement;
      if (menu.style.height !== "") {
        return;
      }
      const $menu = $(menu as HTMLDivElement);
      // The bottom that the dropdown is clipped at
      const menuTop = menu.getBoundingClientRect().top;
      let clipBottom = menuTop + menu.scrollHeight;
      props.scrollClipperAncestors.forEach((clipperClass) => {
        const $ancestor = $menu.parents(clipperClass);
        if ($ancestor.length > 0) {
          // 8px as the padding
          clipBottom = Math.min(
            $ancestor.get(0).getBoundingClientRect().bottom - 8,
            clipBottom
          );
        }
      });
      menu.style.height = `${clipBottom - menuTop}px`;
    }
  });
  return (
    <Menu
      prefixCls={"ant-dropdown-menu"}
      ref={menuContainer}
      selectedKeys={props.selectedKeys}
      style={
        props.scrollClipperAncestors && props.scrollClipperAncestors.length > 0
          ? { overflowY: "auto" }
          : {}
      }
    >
      {props.children}
    </Menu>
  );
}

/**
 * AutoComplete-like Component that looks similar to antd's AutoComplete,
 * but:
 *
 * 1. Supports more detailed information on how an item is selected (whether via
 *    Enter, Tab or Click, and whether any modifier keys were held down).
 * 2. Supports arbitrary items, not just strings.
 * 3. Supply an AutoCompleteSource, instead of list of options.  This can
 *    query for options asynchronously, so that a consuming component
 *    doesn't have to manage this lifecycle itself.
 *
 * See AutoCompleteProps for documentation.
 */
export class BetterAutoComplete<P> extends React.Component<
  AutoCompleteProps<P>,
  AutoCompleteState<P>
> {
  /**
   * Used to make sure that on the next update after a select, we update
   * queryOptions, even if the text hasn't changed (and the source hasn't
   * changed).
   *
   * This is important to make sure we are re-populating queryOptions if we
   * select the same value twice (so the input text doesn't change).
   */
  justSelected = false;
  curLimit = initialLimit;

  constructor(props: AutoCompleteProps<P>) {
    super(props);
    this.state = {
      text: props.defaultValue || "",
      queriedItems: [],
      cursorPosition: undefined,
    };
  }

  private downshift =
    createRef<Component<DownshiftProps<P>, DownshiftState<P>>>();

  render() {
    const items = this.state.queriedItems;
    const source = this.state.queriedSource;
    const { selectedItem, value, downshiftReducer } = this.props;
    return (
      <Downshift
        ref={this.downshift}
        onChange={this.onDownshiftChange}
        inputValue={value}
        itemToString={this.itemKey}
        defaultHighlightedIndex={0}
        defaultIsOpen={this.props.defaultIsOpen || this.props.alwaysOpen}
        stateReducer={downshiftReducer}
        selectedItem={selectedItem}
        onStateChange={(changes) => {
          if (changes.isOpen) {
            spawn(this.queryOptions());
          }
          if (this.downshift.current && !this.downshift.current.state.isOpen) {
            this.curLimit = initialLimit;
          }
          this.handleInputValueUpdated(changes);
        }}
      >
        {(downshift) => {
          const curItem =
            items.length > 0 && downshift.highlightedIndex !== null
              ? items[downshift.highlightedIndex]
              : undefined;
          const selectedKey = curItem ? this.itemKey(curItem) : "";
          return (
            <div className={`${sty.container} ${this.props.className}`}>
              <Dropdown
                open={downshift.isOpen && items.length > 0}
                onOpenChange={(open) => {
                  if (open) {
                    downshift.openMenu();
                  } else {
                    downshift.closeMenu();
                  }
                }}
                trigger={this.props.openOnClick ? ["click"] : []}
                // This is the trick to disable auto adjustment - see
                // https://github.com/ant-design/ant-design/issues/12070
                align={
                  this.props.disableAutoAdjustment
                    ? { overflow: { adjustX: false, adjustY: false } }
                    : undefined
                }
                overlay={() => (
                  <OverlayMenu
                    selectedKeys={[selectedKey]}
                    scrollClipperAncestors={this.props.scrollClipperAncestors}
                  >
                    {items.map((item, index) => {
                      const itemKey = this.itemKey(item);
                      let props = downshift.getItemProps({
                        item,
                        index,
                        key: itemKey,
                      });
                      if (itemKey === selectedKey) {
                        props.className = sty.item__active;
                      }
                      if (L.isString(item) && item === SHOW_MORE) {
                        props = L.assign({}, props, {
                          onClick: (param) => {
                            this.curLimit *= 2;
                            spawn(this.queryOptions());
                            param.domEvent.stopPropagation();
                          },
                        });
                      }
                      return (
                        <Menu.Item key={itemKey} {...props}>
                          {ensure(source, "Unexpected undefined source").render(
                            item
                          )}
                        </Menu.Item>
                      );
                    })}
                  </OverlayMenu>
                )}
              >
                <div>{this.makeInput(downshift)}</div>
              </Dropdown>
            </div>
          );
        }}
      </Downshift>
    );
  }

  private itemKey = (item: P | null) => {
    if (this.props.itemToString) {
      return this.props.itemToString(item);
    } else if (_.isObject(item) && "uid" in item) {
      // Prefer uid because JSON.stringify fails with circular dependency.
      return "" + item["uid"];
    } else if (_.isObject(item)) {
      return JSON.stringify(item);
    } else {
      return `${item}`;
    }
  };

  private makeInput(downshift: ControllerStateAndHelpers<P>) {
    // We clone the caller's input element with our own handlers
    // for onChange and onKeyDown
    const input = this.props.children;
    return React.cloneElement(
      input,
      downshift.getInputProps({
        ...input.props,
        onChange: (event) => callEventHandlers(event, [input.props.onChange]),
        onFocus: (event) =>
          callEventHandlers(event, [
            () => {
              if (this.props.openOnFocus) {
                downshift.openMenu();
              }
            },
            input.props.onFocus,
          ]),
        onKeyDown: (event) => callEventHandlers(event, [input.props.onKeyDown]),
      })
    );
  }

  private onDownshiftChange = (item: P | null) => {
    // If the user isn't selecting with ENTER or TAB, then the only
    // way now is with the mouse.
    this.onSelect(item, "Click", {}, this.state.cursorPosition);
  };

  private onSelect = (
    item: P | null,
    selector: SelectMethod,
    modifiers: KeyModifiers,
    cursorPosition?: number
  ) => {
    if (
      this.props.source !== this.state.queriedSource ||
      !this.state.queriedSource
    ) {
      // Selected outdated item, as the source has changed;
      // ignore.  Unfortunately antd's AutoComplete has this
      // annoying bug where it's still possible to select
      // an item via ENTER even if you pass in an empty dataSource.
      return;
    }
    if (this.props.onSelect && item) {
      this.props.onSelect({
        item,
        source: this.state.queriedSource,
        selector,
        modifiers,
        cursorPosition,
      });
    }

    this.justSelected = true;

    // After selecting an item, close the menu by setting the queried items to an empty array.
    this.setState({ queriedItems: [], cursorPosition: undefined });
  };

  private pQuerying?: Cancelable<any>;

  componentDidMount() {
    // This is the only place where we reach into the Downshift instance to
    // access its state.  Elsewhere we are relying on our own text state,
    // which should be mirroring the inputValue.
    const text = this.downshift.current!.state.inputValue;
    if (this.state.text !== text) {
      this.setState({ text: text || "" });
    } else {
      spawn(this.queryOptions());
    }
  }

  componentDidUpdate(
    prevProps: AutoCompleteProps<P>,
    prevState: AutoCompleteState<P>
  ) {
    if (
      this.justSelected ||
      prevProps.source !== this.props.source ||
      this.queryText(prevProps, prevState) !== this.queryText()
    ) {
      this.justSelected = false;
      if (this.downshift.current!.state.isOpen) spawn(this.queryOptions());
    }
  }
  private queryOptions = async () => {
    const source = this.props.source;
    const text = this.queryText(this.props, this.state);
    try {
      if (this.pQuerying) {
        this.pQuerying.cancel();
      }
      this.pQuerying = makeCancelable(
        source.query(text, this.state.cursorPosition, this.curLimit)
      );
      const queriedItems = await this.pQuerying.promise;
      if (source !== this.props.source) {
        // Source has changed since we returned from .query();
        // ignore.
        return;
      }
      this.setState({ queriedItems, queriedSource: source });
    } catch (err) {
      if (err.isCanceled) {
        return;
      }
      throw err;
    }
  };

  private handleInputValueUpdated = (change: StateChangeOptions<P>) => {
    // Only set state.text if this component isn't being "controlled"
    if (change.inputValue !== undefined && !_.has(this.props, "value")) {
      this.setState({ text: change.inputValue || "" });
    }

    if (this.props.onChange) {
      this.props.onChange(change);
    }
  };

  /**
   * Reads the text to query, either from props.value or from state.text,
   * depending on if this component is controlled.
   */
  private queryText(
    props?: AutoCompleteProps<P>,
    state?: AutoCompleteState<P>
  ) {
    props = props || this.props;
    state = state || this.state;
    if (_.has(props, "value")) {
      return props.value || "";
    } else {
      return state.text;
    }
  }

  componentWillUnmount() {
    if (this.pQuerying) {
      this.pQuerying.cancel();
    }
  }
}
