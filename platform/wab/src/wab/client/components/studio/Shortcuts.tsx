import styles from "@/wab/client/components/studio/Shortcuts.module.scss";
import {
  FREE_CONTAINER_ICON,
  HORIZ_STACK_ICON,
  TEXT_ICON,
  VERT_STACK_ICON,
} from "@/wab/client/icons";
import { mkNoActionShortcuts, Shortcut } from "@/wab/client/shortcuts/shortcut";
import {
  CHROME_SHORTCUT_GROUP,
  EDIT_SHORTCUT_GROUP,
  MISC_SHORTCUT_GROUP,
  SELECTION_SHORTCUT_GROUP,
  TOOLS_SHORTCUT_GROUP,
  VIEW_SHORTCUT_GROUP,
} from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { SearchOutlined } from "@ant-design/icons";
import { Input, Tag } from "antd";
import cn from "classnames";
import L from "lodash";
import { observer } from "mobx-react";
import React, { useState } from "react";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaRegHandRock,
} from "react-icons/fa";
import { Modal } from "src/wab/client/components/widgets/Modal";

export const ShortcutsModal = observer(
  ({ children }: { children: React.ReactNode }) => {
    const studioCtx = useStudioCtx();
    const open = studioCtx.isShortcutsModalOpen();
    const [searchQuery, setSearchQuery] = useState("");

    return (
      <>
        {children}
        <Modal
          title="Keyboard Shortcuts"
          centered
          bodyStyle={{ padding: 0 }}
          footer={null}
          open={open}
          onCancel={studioCtx.closeShortcutsModal}
        >
          <div className={styles.scrollableShortcuts}>
            <Input
              addonBefore={<SearchOutlined />}
              placeholder="Search shortcuts here..."
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {SHORTCUT_SECTIONS.map((section, i) => (
              <ShortcutSection
                key={i}
                section={section}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </Modal>
      </>
    );
  }
);

interface ShortcutSection {
  title: string;
  chunks: ShortcutChunk[];
}

interface ShortcutChunk {
  shortcuts: Shortcut[];
  title?: string;
}

function ShortcutSection(props: {
  section: ShortcutSection;
  searchQuery?: string;
}) {
  const { searchQuery } = props;

  const filteredChunks: ShortcutChunk[] = searchQuery
    ? props.section.chunks.map((chunk) => ({
        ...chunk,
        shortcuts: chunk.shortcuts.filter((shortcut) =>
          shortcut.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
    : [...props.section.chunks];

  const isSectionShowing = filteredChunks.some(
    (chunk) => chunk.shortcuts.length > 0
  );

  if (!isSectionShowing) {
    return null;
  }

  return (
    <div className="mb-xlg">
      <h2>{props.section.title}</h2>
      {filteredChunks.map((chunk, i) => (
        <>
          {chunk.shortcuts.length ? (
            <div className="pv-sm" key={i}>
              {chunk.title && <h3 className="dimfg">{chunk.title}</h3>}
              {chunk.shortcuts.map((s, _i) => (
                <ShortcutRow shortcut={s} key={_i} />
              ))}
            </div>
          ) : null}
        </>
      ))}
    </div>
  );
}

function ShortcutRow(props: { shortcut: Shortcut }) {
  const { shortcut } = props;
  const icon = shortcutIcon(shortcut);
  return (
    <div className={cn(styles.shortcutRow, "mb-sm pb-sm pt-sm")}>
      <div className="flex justify-between">
        <div className="flex-fill mr-sm flex flex-vcenter">
          {icon && <span className="mr-sm no-line-height">{icon}</span>}
          {shortcut.description}
        </div>
        <div className="flex flex-no-shrink flex-vcenter gap-xsm">
          <ShortcutCombo combo={shortcut.combos} />
          {shortcut.context && (
            <div className="dimfg ml-sm">{shortcut.context}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function shortcutIcon(shortcut: Shortcut) {
  switch (shortcut.action) {
    case "RECT":
      return FREE_CONTAINER_ICON;
    case "HORIZ_STACK":
      return HORIZ_STACK_ICON;
    case "VERT_STACK":
      return VERT_STACK_ICON;
    case "TEXT":
      return TEXT_ICON;
    default:
      return null;
  }
}

export function OneShortcutCombo(props: { combo: string }) {
  const combo = props.combo;
  const keyLabels = comboToKeyLabels(combo);
  return (
    <div className="nowrap inline-block shortcut-combo">
      {keyLabels.map(({ key, label }) => (
        <Tag
          key={key}
          className="m0 b-dashed-lightener2 fg"
          style={{ background: "transparent" }}
          title={key}
        >
          <code>{label}</code>
        </Tag>
      ))}
    </div>
  );
}

function ShortcutCombo(props: { combo: string | string[] }) {
  const combos = L.isArray(props.combo) ? props.combo : [props.combo];
  return (
    <>
      {combos.map((combo, i) => (
        <OneShortcutCombo combo={combo} key={i} />
      ))}
    </>
  );
}

function renderKey(key: string) {
  switch (key) {
    case "command":
      return "⌘";
    case "enter":
      return "↵";
    case "option":
      return "⌥";
    case "drag":
      return <FaRegHandRock />;
    case "left":
      return <FaArrowLeft />;
    case "right":
      return <FaArrowRight />;
    case "up":
      return <FaArrowUp />;
    case "down":
      return <FaArrowDown />;
  }
  if (key.length === 1 && key.toUpperCase() !== key.toLowerCase()) {
    // Capitalize single characters
    return key.toUpperCase();
  }
  return key;
}

export function comboToKeyLabels(combo: string) {
  const keys: string[] = [];
  if (combo === "+") {
    keys.push(combo);
  } else {
    // Split the combo by +. We cannot use string.split since we need to deal
    // with consecutive plus sign.
    let curItem = "";
    for (let i = 0; i < combo.length; i++) {
      if (curItem.length > 0 && combo.charAt(i) === "+") {
        keys.push(curItem);
        curItem = "";
      } else {
        curItem += combo.charAt(i);
      }
    }
    if (curItem.length > 0) {
      keys.push(curItem);
    }
  }

  return keys.map((k) => ({ label: renderKey(k), key: k }));
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Tools",
    chunks: [
      {
        shortcuts: TOOLS_SHORTCUT_GROUP.shortcuts,
      },
      {
        title: "While in drawing mode with any of the above:",
        shortcuts: mkNoActionShortcuts(
          {
            combos: "drag",
            description: "Draw the new layer",
          },
          {
            combos: "ctrl+drag",
            description:
              "Draw a free-floating node, even into an auto-layout container",
          },
          {
            combos: "alt+drag",
            description: "Draw from center",
          },
          {
            combos: "shift+drag",
            description: "Draw proportionally",
          },
          {
            combos: "click",
            description: "Create with default size",
          },
          {
            combos: "alt+click",
            description: "Create and wrap around the target node",
          }
        ),
      },
    ],
  },
  {
    title: "Cursor",
    chunks: [
      {
        shortcuts: mkNoActionShortcuts(
          {
            combos: "space+drag",
            description: "Pan the canvas",
          },
          {
            combos: "middle-button+drag",
            description: "Pan the canvas",
          },
          {
            combos: "ctrl+scroll",
            description: "Zoom in and out",
          },
          {
            combos: "double-click",
            context: "on text layers",
            description: "Edit text",
          },
          {
            combos: "double-click",
            context: "on components",
            description: "Edit component",
          },
          {
            combos: "double-click",
            context: "on selection borders",
            description: "Auto-size",
          },
          {
            combos: "alt+hover",
            description: "Measure distance between components",
          },
          {
            combos: "alt+shift+hover",
            description: "Measure distance to cursor",
          },
          {
            combos: "ctrl+click",
            description: "Inline edit component / Edit text",
          },
          {
            combos: "ctrl+alt+click",
            description: "Go to component",
          }
        ),
      },
      {
        title: "While resizing:",
        shortcuts: mkNoActionShortcuts(
          {
            combos: "alt+drag",
            description: "Resize from center",
          },
          {
            combos: "shift+drag",
            description: "Resize from proportionally",
          }
        ),
      },
    ],
  },
  ...[
    VIEW_SHORTCUT_GROUP,
    CHROME_SHORTCUT_GROUP,
    EDIT_SHORTCUT_GROUP,
    SELECTION_SHORTCUT_GROUP,
    MISC_SHORTCUT_GROUP,
  ].map((group) => ({
    title: group.name,
    chunks: [{ shortcuts: group.shortcuts }],
  })),
];
