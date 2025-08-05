import { PublicLink } from "@/wab/client/components/PublicLink";
import { uncontrollable } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import { Textbox, TextboxRef } from "@/wab/client/components/widgets/Textbox";
import { plasmicIFrameMouseDownEvent } from "@/wab/client/definitions/events";
import { useFocusOnDisplayed } from "@/wab/client/dom-utils";
import { VERT_MENU_ICON } from "@/wab/client/icons";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import EyeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Eye";
import EyeClosedIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__EyeClosed";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import SearchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Search";
import TrashIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Trash";
import DragGripIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__DragGrip";
import {
  MaybeWrap,
  createFakeEvent,
  swallowClick,
  useReadablePromise,
} from "@/wab/commons/components/ReactUtil";
import {
  XDraggable,
  XDraggableEventHandler,
} from "@/wab/commons/components/XDraggable";
import { ReadablePromise } from "@/wab/commons/control";
import {
  cx,
  ensure,
  isCurrentlyWithinPath,
  makeCancelable,
  maybe,
} from "@/wab/shared/common";
import { Dropdown, Table, Tooltip } from "antd";
import classNames from "classnames";
import { isKeyHotkey } from "is-hotkey";
import L from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { CSSProperties, ReactElement, ReactNode } from "react";
import {
  DragDropContext,
  Draggable,
  DropResult,
  Droppable,
} from "react-beautiful-dnd";
import { createPortal } from "react-dom";
import { FaUpload } from "react-icons/fa";

export function LinkButton(props: React.ComponentProps<"button">) {
  const { className, ...rest } = props;
  return <button className={cx("link-like", className)} {...rest} />;
}
export interface PlainLinkButtonProps extends React.ComponentProps<"button"> {
  "data-test-id"?: string;
  tooltip?: React.ReactNode;
}
export function PlainLinkButton(props: PlainLinkButtonProps) {
  const { disabled, onClick, className, tooltip, ...forwardedProps } = props;
  return (
    <MaybeWrap
      cond={!!tooltip}
      wrapper={(x) => <Tooltip title={tooltip}>{x}</Tooltip>}
    >
      <button
        {...forwardedProps}
        className={cx(
          {
            "non-link-btn": true,
            "non-link-btn--disabled": disabled,
          },
          className
        )}
        onClick={disabled ? undefined : onClick}
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
      />
    </MaybeWrap>
  );
}

export function PlainLink(
  props: React.ComponentProps<"a"> & {
    disabled?: boolean;
    activeClassName?: string;
  }
) {
  const { href, className, activeClassName, disabled, ...forwardedProps } =
    props;
  return (
    <PublicLink
      {...forwardedProps}
      className={cx(
        {
          "plain-link": true,
          "plain-link--disabled": disabled,
        },
        className,
        href && isCurrentlyWithinPath(href) ? activeClassName : undefined
      )}
      tabIndex={disabled ? -1 : 0}
      href={href}
    />
  );
}

export function IconLinkButton(props: PlainLinkButtonProps) {
  return (
    <PlainLinkButton
      {...props}
      className={`icon-link-btn ${props.className}`}
    />
  );
}

type ModalProps = {
  className?: string;
  children: ReactNode;
};
export class Modal extends React.Component<ModalProps, {}> {
  render() {
    return (
      <div className={cx("modal", this.props.className)}>
        {this.props.children}
      </div>
    );
  }
}
export class Spinner extends React.Component<{}, {}> {
  render() {
    return (
      <div className={"loader-container"}>
        <div className={"loader"}>{"Loading..."}</div>
      </div>
    );
  }
}
type LoadableProps<T> = {
  loader: () => Promise<T>;
  contents: (data: T) => ReactNode;
  loadingContents: () => ReactNode;
};
type LoadableState<T> = {
  loaded: boolean;
  data: T | null;
};
export class Loadable<T> extends React.Component<
  LoadableProps<T>,
  LoadableState<T>
> {
  static defaultProps = {
    loadingContents() {
      return <Spinner />;
    },
  };
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      data: null,
    };
  }
  pLoad: /*TWZ*/ { cancel: () => any; promise: Promise<T> };
  async componentDidMount() {
    this.pLoad = makeCancelable(this.props.loader());
    const data = await this.pLoad.promise;
    return this.setState({
      loaded: true,
      data,
    });
  }
  componentWillUnmount() {
    return this.pLoad.cancel();
  }
  render() {
    if (this.state.loaded) {
      return this.props.contents(
        ensure(this.state.data, "Data state not defined in Loadable component")
      );
    } else {
      return this.props.loadingContents();
    }
  }
}

export function ReadablePromiseLoadable<T, Err>({
  rp,
  contents,
  failureContents = () => null,
  loadingContents = () => <Spinner />,
}: {
  rp: ReadablePromise<T, Err>;
  loadingContents?: () => ReactElement | null;
  contents: (x: T) => ReactElement | null;
  failureContents?: (x: Err) => ReactElement | null;
}) {
  const result = useReadablePromise(rp);
  if (!result) {
    return loadingContents();
  }
  return result.match({
    success: contents,
    failure: failureContents,
  });
}

export const ObserverLoadable = observer(Loadable);

export class Tab {
  name: ReactNode;
  contents: () => any;
  key: string;
  pullRight?: boolean;
  constructor(args: Tab) {
    Object.assign(this, L.pick(args, "name", "contents", "key", "pullRight"));
  }
}
type _TabsProps = {
  tabs: Tab[];
  tabBarClassName?: string;
  className?: string;
  tabKey?: any;
  onSwitch?: (...args: any[]) => any;
  tabClassName?: any;
  activeTabClassName?: any;
  useDefaultClasses?: boolean;
  barWrapper: (bar: React.ReactNode) => any;
  contentWrapper: (...args: any[]) => any;
  scrollByTransform?: boolean;
  forceRender?: boolean;
  tabBarExtraContent?: React.ReactNode;
};
class _Tabs extends React.Component<_TabsProps, {}> {
  static defaultProps = {
    className: "",
    useDefaultClasses: true,
    barWrapper: L.identity,
    contentWrapper: L.identity,
  };
  render() {
    const tabKey = this.props.tabKey ?? 0;
    return (
      <div className={cx("tabs", this.props.className)}>
        {this.props.barWrapper(
          <div
            className={cx("nav-tabs", this.props.tabBarClassName)}
            role="tablist"
          >
            <div>
              {this.props.tabs.map((tab: /*TWZ*/ Tab, i: /*TWZ*/ number) => {
                const key = tab.key != null ? tab.key : i;
                const isActive = tabKey === key;
                return (
                  <button
                    key={key}
                    className={cx(
                      {
                        "nav-tab": true && this.props.useDefaultClasses,
                        "nav-tab--active":
                          isActive && this.props.useDefaultClasses,
                        "nav-tab--pull-right":
                          this.props.tabs.length > 1 && tab.pullRight,
                      },
                      this.props.tabClassName,
                      tabKey === key ? this.props.activeTabClassName : undefined
                    )}
                    id={`nav-tab-${key}`}
                    onClick={() => {
                      if (typeof this.props.onSwitch === "function") {
                        this.props.onSwitch(key);
                      }
                      return this.setState({ tabKey: key });
                    }}
                    data-test-tabkey={key}
                    tabIndex={0}
                    aria-selected={isActive}
                    role="tab"
                  >
                    {tab.name}
                  </button>
                );
              })}
            </div>
            {this.props.tabBarExtraContent}
          </div>
        )}

        <div
          className={"tab-content"}
          style={this.props.scrollByTransform ? { overflow: "hidden" } : {}}
        >
          {this.props.tabs.map((tab, i) => {
            const isSelected = tabKey === (tab.key ?? i);
            if (!isSelected && !this.props.forceRender) {
              return null;
            }
            return (
              <div
                className="vlist-scrollable-descendant"
                key={tab.key ?? i}
                style={{
                  display: isSelected ? "flex" : "none",
                }}
              >
                {this.props.contentWrapper(tab.contents())}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
export const Tabs = uncontrollable(_Tabs, _Tabs.defaultProps, {
  tabKey: "onSwitch",
});

interface DragItemProps {
  dragHandle: () => ReactNode;
  onDragStart?: XDraggableEventHandler;
  onDrag?: XDraggableEventHandler;
  onDragEnd?: XDraggableEventHandler;
  children: ReactNode;
  minPx?: number;
}

export function DragItem({
  onDragStart = () => {},
  onDrag = () => {},
  onDragEnd = () => {},
  children,
  dragHandle,
  minPx,
}: DragItemProps) {
  return (
    <XDraggable
      minPx={minPx}
      onStart={onDragStart}
      onDrag={onDrag}
      onStop={onDragEnd}
      render={(e) => (
        <div className={"pass-through no-select"}>
          {e &&
            e.data.started &&
            createPortal(
              <div
                className={"DragItem__Handle"}
                style={{
                  left: e.mouseEvent.pageX,
                  top: e.mouseEvent.pageY,
                }}
              >
                {dragHandle()}
              </div>,
              document.body
            )}
          {children}
        </div>
      )}
    />
  );
}

export interface FileUploaderProps {
  onChange: (files: FileList | null) => void;
  accept?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function FileUploader(props: FileUploaderProps) {
  const { onChange, accept, style, children, disabled } = props;
  const [isDragOver, setDragOver] = React.useState(false);
  return (
    <Tooltip title={"Upload or drag a file here"}>
      <PlainLinkButton
        className={cx("file-uploader", { "file-uploader--over": isDragOver })}
        style={style}
      >
        {children ?? (
          <div className={"fake-upload"}>
            <FaUpload />
          </div>
        )}
        <input
          type="file"
          className={"opaque-file-uploader"}
          onChange={(e) => onChange(e.target.files)}
          accept={accept}
          onDragEnter={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          disabled={disabled}
        />
      </PlainLinkButton>
    </Tooltip>
  );
}

export interface FileUploadLinkProps {
  onChange: (files: FileList | null) => void;
  accept?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function FileUploadLink(props: FileUploadLinkProps) {
  const { onChange, accept, style, children, className } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <PlainLinkButton
      className={cx("link-like", className)}
      style={style}
      onClick={() => {
        inputRef.current?.click();
      }}
    >
      {children}
      <input
        type="file"
        className={"display-none"}
        onChange={(e) => onChange(e.target.files)}
        accept={accept}
        ref={inputRef}
      />
    </PlainLinkButton>
  );
}

/**
 * Either addHoverContent or onAdd or addMenu must bes specified.
 */
interface ListBoxProps {
  addText?: string;
  addNode?: React.ReactNode;
  onAdd?: (...args: any[]) => any;
  addHoverContent?: React.ReactNode;
  appendPrepend?: "append" | "prepend";
  onReorder?: (from: number, to: number) => void;
  addMenu?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  "data-test-id"?: string;
}

type ListBoxState = {
  adding: boolean;
};
export class ListBox extends React.Component<ListBoxProps, ListBoxState> {
  constructor(props) {
    super(props);
    this.state = { adding: false };
  }
  private handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    const { onReorder } = this.props;
    if (onReorder) {
      onReorder(result.source.index, result.destination.index);
    }
  };
  render() {
    const { addText, addNode, disabled } = this.props;
    // TODO this is inconsistently firing onmouseleave because the div is
    //  actually getting unmounted and then mounted.  See
    //  https://github.com/facebook/react/issues/6807.
    let addButton = (
      <PlainLinkButton
        className={"list-box__add-placeholder"}
        onClick={this.props.onAdd}
        type="button"
        disabled={disabled}
        data-test-id={`${this.props["data-test-id"]}-add-btn`}
      >
        <div>
          {addNode ? (
            addNode
          ) : (
            <>
              <Icon icon={PlusIcon} /> {addText}
            </>
          )}
        </div>
      </PlainLinkButton>
    );
    if (this.props.addMenu) {
      addButton = (
        <IFrameAwareDropdownMenu menu={this.props.addMenu}>
          {addButton}
        </IFrameAwareDropdownMenu>
      );
    }
    const adder =
      !addText && !addNode ? null : (
        <div
          onMouseEnter={() => {
            if (this.props.addHoverContent != null) {
              return this.setState({ adding: true });
            }
          }}
          onMouseLeave={() => {
            this.setState({ adding: false });
          }}
        >
          {!this.state.adding ? (
            addButton
          ) : (
            <div className={"list-box__add-placeholder"}>
              {this.props.addHoverContent}
            </div>
          )}
        </div>
      );
    return (
      <DragDropContext onDragEnd={this.handleDragEnd}>
        {this.props.appendPrepend === "prepend" ? adder : undefined}
        <Droppable droppableId={"droppable"}>
          {(provided) => (
            <div ref={provided.innerRef} className={"list-box"}>
              {this.props.children}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        {this.props.appendPrepend === "append" ? adder : undefined}
      </DragDropContext>
    );
  }
}

interface ListBoxItemProps {
  thumbnail?: React.ReactNode;
  mainContent: React.ReactNode;
  /** Triggered on click or on "Enter" key down */
  onClick?: () => void;
  onRemove?: (...args: any[]) => any;
  onToggleHide?: () => void;
  index: number;
  isDragDisabled?: boolean;
  disabled?: boolean;
  isHidden?: boolean;
  alignTop?: boolean;
  className?: string;
  showGrip?: boolean;
  showDelete?: boolean;
  showHide?: boolean;
  clickable?: boolean;
  truncate?: boolean;
  gridThumbnail?: boolean;
  menu?: React.ReactNode | MenuMaker;
  "data-test-id"?: string;
}

// TODO Handle drag reordering
export class ListBoxItem extends React.Component<ListBoxItemProps, {}> {
  randId = Math.random();
  render() {
    const {
      index,
      className,
      isDragDisabled,
      disabled,
      isHidden,
      showGrip = true,
      showDelete = true,
      showHide = false,
      onRemove = () => {},
      onToggleHide = () => {},
      clickable = true,
      truncate = true,
      menu,
    } = this.props;
    return (
      <Draggable
        draggableId={`${this.randId}`}
        index={index}
        isDragDisabled={isDragDisabled}
      >
        {(provided, snapshot) => {
          const child = (
            <>
              <div
                ref={provided.innerRef}
                className={"list-box-item-focusable"}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                // TODO: remove this hack
                // react-beautiful-dnd interface exposes
                // React.DragEventHandler<any>, which results in a type mismatch
                onDragStart={
                  provided.dragHandleProps
                    ?.onDragStart as React.DragEventHandler<HTMLDivElement>
                }
                onKeyDown={(event) => {
                  if (
                    this.props.onClick &&
                    isKeyHotkey("enter", event.nativeEvent)
                  ) {
                    this.props.onClick();
                    event.stopPropagation();
                  }
                }}
              >
                <div
                  className={classNames(className, {
                    "list-box-item flex-vcenter": true,
                    "list-box-item--top": !!this.props.alignTop,
                    "list-box-item--clickable": !!clickable,
                    group: true,
                  })}
                  data-test-id={this.props["data-test-id"]}
                  onClick={this.props.onClick}
                >
                  {this.props.thumbnail && (
                    <div
                      className={classNames({
                        "list-box-item__img": true,
                        "list-box-item__img-grid": this.props.gridThumbnail,
                      })}
                    >
                      {this.props.thumbnail}
                    </div>
                  )}

                  <div
                    className={classNames({
                      "flex flex-vcenter list-box-item__label": true,
                      "list-box-item__label--truncate": !!truncate,
                    })}
                  >
                    {this.props.mainContent}
                  </div>

                  {showGrip && (
                    <div
                      className={"list-box-item__handle opaque-on-group-hover"}
                    >
                      <Icon icon={DragGripIcon} />
                    </div>
                  )}

                  {(showDelete || menu) && (
                    <div
                      className="list-box-item__actions"
                      onClick={(e) => swallowClick(e)}
                    >
                      {showDelete && (
                        <button
                          className={"icon-button opaque-on-group-hover"}
                          type="button"
                          onClick={(ev) => {
                            onRemove();
                            return ev.stopPropagation();
                          }}
                          disabled={disabled}
                          data-test-id={
                            this.props["data-test-id"]
                              ? `${this.props["data-test-id"]}-remove`
                              : undefined
                          }
                        >
                          <Icon icon={TrashIcon} />
                        </button>
                      )}
                      {menu && (
                        <IFrameAwareDropdownMenu menu={menu}>
                          <div className="list-box-item__action opaque-on-group-hover">
                            {VERT_MENU_ICON}
                          </div>
                        </IFrameAwareDropdownMenu>
                      )}
                    </div>
                  )}

                  {showHide &&
                    (isHidden ? (
                      <button
                        className={"icon-button"}
                        onClick={(ev) => {
                          onToggleHide();
                          ev.stopPropagation();
                        }}
                      >
                        <Icon icon={EyeClosedIcon} />
                      </button>
                    ) : (
                      <button
                        className={"icon-button opaque-on-group-hover"}
                        onClick={(ev) => {
                          onToggleHide();
                          ev.stopPropagation();
                        }}
                      >
                        <Icon icon={EyeIcon} />
                      </button>
                    ))}
                </div>
              </div>
            </>
          );
          if (snapshot.isDragging) {
            return createPortal(child, document.body);
          } else {
            return child;
          }
        }}
      </Draggable>
    );
  }
}

export function InlineIcon({ children }: { children: ReactNode }) {
  return <div className={"InlineIcon"}>{children}</div>;
}

export type MenuMaker = (onMenuClicked: () => void) => React.ReactNode;

export function useOnIFrameMouseDown(handler: () => void) {
  React.useEffect(() => {
    document.addEventListener(plasmicIFrameMouseDownEvent, handler);
    return () => {
      document.removeEventListener(plasmicIFrameMouseDownEvent, handler);
    };
  }, [handler]);
}

export const IFrameAwareDropdownMenu = (props: {
  menu: React.ReactNode | MenuMaker;
  children?: ReactNode;
  disabled?: boolean;
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
  onVisibleChange?: (visible: boolean) => void;
}) => {
  const { onVisibleChange } = props;
  const [menuVisible, setMenuVisibleState] = React.useState(false);

  const setMenuVisible = React.useCallback(
    (visible: boolean) => {
      setMenuVisibleState(visible);
      if (onVisibleChange) {
        onVisibleChange(visible);
      }
    },
    [setMenuVisibleState, onVisibleChange]
  );

  const onIFrameClick = React.useCallback(() => {
    setMenuVisible(false);
  }, [setMenuVisible]);

  useOnIFrameMouseDown(onIFrameClick);

  return (
    <Dropdown
      disabled={props.disabled}
      overlay={() => {
        const { menu } = props;
        const effectiveMenu = (
          L.isFunction(menu) ? menu(() => setMenuVisible(false)) : menu
        ) as React.ReactElement;
        return React.cloneElement(effectiveMenu, {
          onClick: (e) => {
            setMenuVisible(false);
            if (effectiveMenu.props.onClick) {
              effectiveMenu.props.onClick(e);
            }
            e.domEvent.stopPropagation();
          },
        });
      }}
      trigger={["click"]}
      visible={menuVisible}
      onVisibleChange={(visible) => setMenuVisible(visible)}
      overlayClassName={props.overlayClassName}
      overlayStyle={props.overlayStyle}
      destroyPopupOnHide
    >
      {props.children}
    </Dropdown>
  );
};

export function ClickStopper({
  children,
  passthrough,
  preventDefault,
  style,
  className,
}: {
  children: ReactNode;
  passthrough?: boolean;
  preventDefault?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={
        className +
        (passthrough
          ? " pass-through clicker-stopper"
          : " block clicker-stopper")
      }
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (preventDefault) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </div>
  );
}

export function SearchBox(
  props: Omit<React.ComponentProps<typeof Textbox>, "prefixIcon" | "suffixIcon">
) {
  const ref = React.useRef<TextboxRef>(null);

  const getInput = React.useCallback(
    () => maybe(ref.current, (x) => x.input()),
    [ref]
  );
  useFocusOnDisplayed(getInput, { autoFocus: props.autoFocus });

  const resetInput = (e: React.SyntheticEvent) => {
    if (ref.current) {
      ref.current.setValue("");
      if (props.onChange) {
        // Copied from antd's "antd/lib/input/Input.resolveOnChange"
        // Fakes a ChangeEvent with value ""
        const input = ref.current.input();
        const fakeEvent = createFakeEvent<React.ChangeEvent<HTMLInputElement>>(
          e,
          input
        );
        const originalInputValue = input.value;
        input.value = "";
        props.onChange && props.onChange(fakeEvent);
        input.value = originalInputValue;
      }
    }
  };
  return (
    <Textbox
      prefixIcon={<Icon icon={SearchIcon} />}
      withIcons={["withPrefix", "withSuffix"]}
      suffixIcon={
        props.value &&
        `${props.value}`.trim().length > 0 && (
          <IconButton type="seamless" onClick={(e) => resetInput(e)}>
            <Icon icon={CloseIcon} />
          </IconButton>
        )
      }
      ref={ref}
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          resetInput(e);
        }
      }}
    />
  );
}

/**
 * A version of antd's Table that fills the available vertical space,
 * and sets scroll properly for the table body
 */
export function VerticalFillTable(
  props: React.ComponentProps<typeof Table> & { wrapperClassName?: string }
) {
  const { wrapperClassName, ...rest } = props;
  return (
    <div className={cx("vertical-fill-table", wrapperClassName)}>
      <Table {...rest} />
    </div>
  );
}

export function StudioPlaceholder() {
  return (
    <div className="StudioPlaceholder visible">
      <div className="placeholder_topBar">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="placeholder_icon"
          fill="none"
          viewBox="0 0 32 32"
          role="img"
        >
          <path
            d="M3.2 22C3.2 14.93 8.93 9.2 16 9.2S28.8 14.93 28.8 22H32c0-8.837-7.163-16-16-16S0 13.163 0 22h3.2z"
            fill="currentColor"
          ></path>

          <path
            d="M24 22a8 8 0 10-16 0H4.8c0-6.185 5.015-11.2 11.2-11.2S27.2 15.815 27.2 22H24z"
            fill="currentColor"
          ></path>

          <path
            d="M12.8 22a3.2 3.2 0 016.4 0h3.2a6.4 6.4 0 10-12.8 0h3.2z"
            fill="currentColor"
          ></path>
        </svg>
      </div>
      <div className="placeholder_leftToolbar"></div>
      <div className="placeholder_leftPanel"></div>
      <div className="placeholder_canvasArea"></div>
      <div className="placeholder_rightPanel"></div>
      <div className="placeholder_loading placeholder_loading--fast"></div>
    </div>
  );
}
