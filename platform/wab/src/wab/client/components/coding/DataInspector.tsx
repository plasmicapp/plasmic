import { renderInspector } from "@/wab/client/components/coding/CodePreview";
import type { FullCodeEditor } from "@/wab/client/components/coding/FullCodeEditor";
import { maybeShowContextMenu } from "@/wab/client/components/ContextMenu";
import { Menu } from "antd";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { InspectorNodeParams, ObjectLabel } from "react-inspector";

/**
 * Extends InspectorNodeParams with internal react-inspector TreeNode props
 * like `path`, which are spread but not included in the public type.
 */
type InspectorNodeProps = InspectorNodeParams & {
  path?: string;
};

/**
 * A data inspector tree where right-clicking any node shows a context menu
 * to insert or copy its access path.
 */
export function DataInspector({
  data,
  editorRef,
  emptyMessage = "No data available",
}: {
  data: Record<string, any>;
  editorRef?: React.RefObject<FullCodeEditor | null>;
  emptyMessage?: string;
}) {
  return (
    <div
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        const nodeEl = target.closest(
          "[data-insert-path]"
        ) as HTMLElement | null;
        if (nodeEl?.dataset.insertPath) {
          const insertPath = nodeEl.dataset.insertPath;
          const editor = editorRef?.current;
          maybeShowContextMenu(
            e.nativeEvent,
            <Menu onClick={(info) => info.domEvent.stopPropagation()}>
              {editor && (
                <Menu.Item
                  key="insert"
                  onClick={() => editor.insertAtCursor(insertPath)}
                >
                  Insert in code editor
                </Menu.Item>
              )}
              <Menu.Item
                key="copy"
                onClick={() => navigator.clipboard.writeText(insertPath)}
              >
                Copy JS path
              </Menu.Item>
            </Menu>
          );
        }
      }}
    >
      <ErrorBoundary fallback={<div className="dimfg">{emptyMessage}</div>}>
        {renderInspector(data, {
          expandLevel: 1,
          nodeRenderer: (nodeProps: InspectorNodeProps) => {
            const {
              depth,
              name,
              data: nodeData,
              isNonenumerable,
              path,
              expanded,
            } = nodeProps;
            // Convert react-inspector path "$.foo.0.bar" to "foo[0].bar"
            const insertPath =
              path?.replace(/^\$\.?/, "").replace(/\.(\d+)/g, "[$1]") || "";
            const label =
              depth === 0 ? (
                <span>
                  {expanded
                    ? "Right-click to insert or copy a path."
                    : "Expand to browse available data"}
                </span>
              ) : (
                <ObjectLabel
                  name={name}
                  data={nodeData}
                  isNonenumerable={isNonenumerable}
                />
              );
            return <span data-insert-path={insertPath}>{label}</span>;
          },
        })}
      </ErrorBoundary>
    </div>
  );
}
