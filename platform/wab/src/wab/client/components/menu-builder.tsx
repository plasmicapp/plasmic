import { comboToKeyLabels } from "@/wab/client/components/studio/Shortcuts";
import { analytics } from "@/wab/client/observability";
import { MaybeWrap, joinReactNodes } from "@/wab/commons/components/ReactUtil";
import { ensure, filterFalsy } from "@/wab/shared/common";
import type { MenuProps } from "antd";
import { Menu, Tooltip } from "antd";
import L from "lodash";
import React from "react";

type onMenuClick = MenuProps["onClick"];

interface MenuBuilderFrame {
  type: "root" | "group" | "sub";
  name?: React.ReactNode;
  items: React.ReactNode[];
}

export class MenuBuilder {
  private stack: MenuBuilderFrame[] = [{ type: "root", items: [] }];
  private keyCounter: number = 0;

  private curFrame() {
    return ensure(L.last(this.stack), `Must be at least one frame`);
  }

  private pushItem = (...item: React.ReactNode[]) =>
    this.curFrame().items.push(...filterFalsy(item));

  private newStack(type: "group" | "sub", name?: React.ReactNode) {
    this.stack.push({ type, name, items: [] });
  }

  private makeKey() {
    return `key-${this.keyCounter++}`;
  }

  private popStack() {
    if (this.stack.length === 1) {
      return;
    }

    const frame = ensure(this.stack.pop(), `Must be at least one frame`);
    if (frame.items.length === 0) {
      return;
    }

    if (frame.type === "group") {
      const lastItem = L.last(this.curFrame().items);
      if (
        lastItem &&
        React.isValidElement(lastItem) &&
        lastItem.type !== Menu.Divider
      ) {
        this.pushItem(<Menu.Divider key={`${this.makeKey()}`} />);
      }
      if (frame.name) {
        this.pushItem(
          <Menu.ItemGroup title={frame.name as string} key={this.makeKey()}>
            {frame.items}
          </Menu.ItemGroup>
        );
      } else {
        this.pushItem(...frame.items);
      }
    } else if (frame.type === "sub") {
      this.pushItem(
        <Menu.SubMenu
          title={<span className="mr-sm">{frame.name}</span>}
          key={this.makeKey()}
        >
          {frame.items}
        </Menu.SubMenu>
      );
    }
  }

  genSection(
    name: React.ReactNode | undefined,
    func: (push: (...item: React.ReactNode[]) => void) => void
  ): this {
    this.newStack("group", name);
    func(this.pushItem);
    this.popStack();
    return this;
  }

  genSub(
    name: React.ReactNode,
    func: (push: (...item: React.ReactNode[]) => void) => void
  ) {
    this.newStack("sub", name);
    func(this.pushItem);
    this.popStack();
  }

  build(
    opts: {
      onMenuClick?: onMenuClick;
      subMenuCloseDelay?: number;
      menuName?: string;
    } = {}
  ) {
    while (this.stack.length > 1) {
      this.popStack();
    }
    return (
      <Menu
        onClick={(event) => {
          const target = event.domEvent.target;
          if (target) {
            analytics().track("menu", {
              item: event.key,
              menuName: opts.menuName,
            });
          }
          opts.onMenuClick?.(event);
        }}
        subMenuCloseDelay={opts.subMenuCloseDelay}
      >
        {this.curFrame().items}
      </Menu>
    );
  }
}

export function MenuItemContent(props: {
  children: React.ReactNode;
  shortcut?: string;
}) {
  return <TextAndShortcut {...props} />;
}

export function KeyboardShortcut(props: {
  children?: string;
  tooltip?: React.ReactNode;
}) {
  return props.children ? (
    <MaybeWrap
      cond={!!props.tooltip}
      wrapper={(x) => <Tooltip title={props.tooltip}>{x}</Tooltip>}
    >
      <div className="shortcut-combo inline-block">
        {normalizeCombo(props.children)}
      </div>
    </MaybeWrap>
  ) : null;
}

export function TextAndShortcut(props: {
  children: React.ReactNode;
  shortcut?: string;
}) {
  const { children, shortcut } = props;
  return (
    <div className="flex">
      <div className="flex-fill mr-sm">{children}</div>
      <KeyboardShortcut>{shortcut}</KeyboardShortcut>
    </div>
  );
}

function normalizeCombo(combo: string) {
  const keyLabels = comboToKeyLabels(combo);
  return joinReactNodes(
    keyLabels.map(({ key, label }) => (
      <span key={key} title={key}>
        {label}
      </span>
    )),
    "+"
  );
}

export function menuSection(
  sectionName: string,
  ...items: (JSX.Element | undefined | false | null)[]
): JSX.Element[] {
  const filteredItems = items.filter(
    (it): it is JSX.Element => !!it && !it.props.hidden
  );
  if (filteredItems.length === 0) {
    return [];
  }
  filteredItems.push(
    <Menu.Divider
      className="hiddenIfLastChild"
      key={`${sectionName}-divider`}
    />
  );
  return filteredItems;
}
