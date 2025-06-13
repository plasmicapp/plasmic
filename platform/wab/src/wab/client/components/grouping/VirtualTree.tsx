import { Matcher } from "@/wab/client/components/view-common";
import { ListSpace } from "@/wab/client/components/widgets/ListStack";
import { mod } from "@/wab/shared/common";
import * as React from "react";
import { VariableSizeList, areEqual } from "react-window";

export interface RenderElementProps<T> {
  value: T;
  /** Tree state for the rendered component */
  treeState: {
    matcher: Matcher;
    level: number;
    canOpen: boolean;
    isOpen: boolean;
    isSelected?: boolean;
    nodeAction?: NodeAction<T>;
    toggleExpand: () => void;
  };
}

type NodeKey = string;

type RenderElement<T> = React.FunctionComponent<RenderElementProps<T>>;

type SelectDirection = 1 | -1;

type NodeAction<T> = (node: T) => Promise<void>;

export interface LinearTreeNode<T> {
  value: T;
  key: NodeKey;
  level: number;
  parentKey?: NodeKey;
  isOpen: boolean;
  canOpen: boolean;
}

interface TreeRowData<T> {
  treeData: {
    matcher: Matcher;
    nodes: LinearTreeNode<T>[];
    renderElement: RenderElement<T>;
    selectedIndex?: number;
    nodeAction?: NodeAction<T>;
    toggleExpand: (key: NodeKey) => void;
  };
}

interface VirtualTreeProps<T> {
  rootNodes: T[];
  renderElement: RenderElement<T>;
  nodeData: TreeRowData<T>;
  nodeKey: (index: number, data: TreeRowData<T>) => string;
  nodeHeights: number[];
  expandAll: () => void;
  collapseAll: () => void;
}

export const VirtualTree = React.forwardRef(function <T>(
  props: VirtualTreeProps<T>
) {
  const { nodeData, nodeKey, nodeHeights } = props;

  const listRef = React.useRef<VariableSizeList>(null);

  const getItemSize = React.useMemo(() => {
    return (index: number) => {
      return nodeHeights[index];
    };
  }, [JSON.stringify(nodeHeights)]);
  React.useEffect(() => {
    if (listRef.current) {
      // When the sizes of the items in the list change, we need to reset
      // the cached state of the virtual list
      listRef.current.resetAfterIndex(0);
    }
  }, [JSON.stringify(nodeHeights), nodeData?.treeData.selectedIndex]);

  return (
    <ListSpace space={5000}>
      {({ height }) =>
        height > 0 && (
          <VariableSizeList
            ref={listRef}
            width={"100%"}
            height={height}
            itemCount={nodeData.treeData.nodes.length}
            itemSize={getItemSize}
            overscanCount={2}
            itemData={nodeData}
            itemKey={nodeKey}
          >
            {Row}
          </VariableSizeList>
        )
      }
    </ListSpace>
  );
}) as <T>(props: VirtualTreeProps<T>) => React.JSX.Element;

const genericMemo: <T>(
  component: T,
  propsAreEqual?: (
    prevProps: React.PropsWithChildren<T>,
    nextProps: React.PropsWithChildren<T>
  ) => boolean
) => T = React.memo;

const Row = genericMemo(
  <T,>({
    style,
    index,
    data,
  }: {
    style?: React.CSSProperties;
    index: number;
    data: TreeRowData<T>;
  }) => {
    const node = data.treeData.nodes[index];
    const isSelected = data.treeData.selectedIndex === index;
    return (
      <TreeNodeRow
        key={node.key}
        style={style}
        nodeKey={node.key}
        value={node.value}
        level={node.level}
        parentKey={node.parentKey}
        canOpen={node.canOpen}
        isOpen={node.isOpen}
        matcher={data.treeData.matcher}
        isSelected={isSelected}
        toggleExpand={data.treeData.toggleExpand}
        nodeAction={data.treeData.nodeAction}
        renderElement={data.treeData.renderElement}
      />
    );
  },
  areEqual
);

interface TreeNodeRowProps<T> {
  style?: React.CSSProperties;
  nodeKey: NodeKey;
  value: T;
  level: number;
  parentKey?: NodeKey;
  isOpen: boolean;
  canOpen: boolean;
  matcher: Matcher;
  isSelected?: boolean;
  nodeAction?: NodeAction<T>;
  toggleExpand: (key: NodeKey) => void;
  renderElement: RenderElement<T>;
}

const TreeNodeRow = <T,>(props: TreeNodeRowProps<T>) => {
  const {
    style,
    nodeKey,
    value,
    level,
    canOpen,
    isOpen,
    matcher,
    toggleExpand,
    nodeAction,
    renderElement,
    isSelected,
  } = props;
  const onClickHandle = React.useMemo(() => {
    return () => toggleExpand(nodeKey);
  }, [nodeKey, toggleExpand]);
  const treeState = React.useMemo(() => {
    return {
      matcher,
      level,
      canOpen: canOpen,
      isOpen: isOpen,
      isSelected,
      nodeAction,
      toggleExpand: () => toggleExpand(nodeKey),
    };
  }, [matcher, level, canOpen, isOpen, isSelected, nodeAction, toggleExpand]);
  return (
    <li
      className="flex"
      key={nodeKey}
      style={style}
      onClick={canOpen ? onClickHandle : undefined}
    >
      {renderElement({
        value,
        treeState,
      })}
    </li>
  );
};

interface UseTreeDataProps<T> {
  nodes: T[];
  query: string;
  renderElement: RenderElement<T>;
  getNodeKey: (node: T) => NodeKey;
  getNodeChildren: (node: T) => T[];
  getNodeSearchText: (node: T) => string;
  getNodeHeight: (node: T) => number;
  nodeAction?: NodeAction<T>;
  isNodeSelectable?: (node: T) => boolean;
  defaultOpenKeys?: "all" | NodeKey[];
}

interface UseTreeData<T> {
  nodeData: TreeRowData<T>;
  nodeKey: (index: number, data: TreeRowData<T>) => string;
  nodeHeights: number[];
  selectedIndex?: number;
  expandAll: () => void;
  collapseAll: () => void;
  selectNextRow: (direction: SelectDirection) => void;
}

export function useTreeData<T>({
  nodes,
  query = "",
  renderElement,
  getNodeKey,
  getNodeChildren,
  getNodeSearchText,
  getNodeHeight,
  nodeAction,
  isNodeSelectable,
  defaultOpenKeys,
}: UseTreeDataProps<T>): UseTreeData<T> {
  const matcher = React.useMemo(() => {
    return new Matcher(query?.trim() ?? "");
  }, [query]);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<NodeKey>>(
    new Set(
      defaultOpenKeys === "all"
        ? getAllNodeKeys(nodes, getNodeKey, getNodeChildren)
        : defaultOpenKeys ?? []
    )
  );
  const toggleExpand = React.useCallback(
    (key: NodeKey) => {
      setExpandedNodes((set) => {
        if (set.has(key)) {
          set.delete(key);
        } else {
          set.add(key);
        }
        return new Set(set);
      });
    },
    [setExpandedNodes]
  );

  const visibleNodes = React.useMemo<LinearTreeNode<T>[]>(
    () =>
      buildVisibleNodes(
        nodes,
        matcher,
        expandedNodes,
        getNodeKey,
        getNodeChildren,
        getNodeSearchText
      ),
    [
      nodes,
      matcher,
      expandedNodes,
      getNodeKey,
      getNodeChildren,
      getNodeSearchText,
    ]
  );

  const [selectedIndex, setSelectedIndex] = React.useState<number>();

  // Reset selectionIndex when visibleNodes change
  React.useEffect(() => {
    setSelectedIndex((prev) => {
      // if we already have a valid selection, keep it
      if (
        prev !== undefined &&
        prev < visibleNodes.length &&
        isNodeSelectable?.(visibleNodes[prev].value)
      ) {
        return prev;
      }
      // otherwise pick the first selectable node
      const first = visibleNodes.findIndex((n) => isNodeSelectable?.(n.value));
      return first >= 0 ? first : undefined;
    });
  }, [visibleNodes]);

  // In case we delete the last children of a opened node,
  // we need to remove the node from the expanded nodes set.
  React.useEffect(() => {
    const fixedExpandedNodes = new Set<NodeKey>(expandedNodes);
    visibleNodes.forEach((node) => {
      if (
        getNodeChildren(node.value).length === 0 &&
        expandedNodes.has(node.key)
      ) {
        fixedExpandedNodes.delete(node.key);
      }
    });
    if (fixedExpandedNodes.size !== expandedNodes.size) {
      setExpandedNodes(fixedExpandedNodes);
    }
  }, [visibleNodes, expandedNodes]);

  const nodeData: TreeRowData<T> = React.useMemo(
    () => ({
      treeData: {
        nodes: visibleNodes,
        matcher,
        renderElement,
        toggleExpand,
        selectedIndex,
        nodeAction,
      },
    }),
    [visibleNodes, matcher, toggleExpand, selectedIndex]
  );
  const nodeKey = React.useCallback(
    (index: number, data: TreeRowData<T>) => data.treeData.nodes[index].key,
    []
  );
  const expandAll = React.useCallback(() => {
    setExpandedNodes(
      new Set(getAllNodeKeys(nodes, getNodeKey, getNodeChildren))
    );
  }, [nodes, setExpandedNodes, getNodeKey, getNodeChildren]);
  const collapseAll = React.useCallback(() => {
    setExpandedNodes(new Set());
  }, [setExpandedNodes]);
  const nodeHeights: number[] = React.useMemo(
    () => visibleNodes.map((node) => getNodeHeight(node.value)),
    [visibleNodes]
  );

  const selectNextRow = React.useCallback(
    (direction: SelectDirection) => {
      setSelectedIndex((current) => {
        const selectable = visibleNodes
          .map((n, i) => ({ node: n.value, idx: i }))
          .filter(({ node }) => isNodeSelectable?.(node));

        if (selectable.length === 0) {
          return undefined;
        }
        // If no selection, jump to the first one
        if (current === undefined) {
          return selectable[0].idx;
        }

        const pos = selectable.findIndex(({ idx }) => idx === current);
        const nextPos = mod(pos + direction, selectable.length);
        return selectable[nextPos].idx;
      });
    },
    [visibleNodes, isNodeSelectable]
  );

  return {
    nodeData,
    nodeKey,
    nodeHeights,
    expandAll,
    selectedIndex,
    collapseAll,
    selectNextRow,
  };
}

function buildVisibleNodes<T>(
  rootNodes: T[],
  matcher: Matcher,
  expandedNodes: Set<NodeKey>,
  getNodeKey: (node: T) => NodeKey,
  getNodeChildren: (node: T) => T[],
  getNodeSearchText: (node: T) => string
): LinearTreeNode<T>[] {
  const visibleNodes: LinearTreeNode<T>[] = [];
  const hasQuery = matcher.hasQuery();

  const pushVisibleNodes = (
    node: T,
    parentKey: NodeKey | undefined,
    depth: number,
    addAllChildren: boolean
  ): boolean => {
    const key = getNodeKey(node);
    const children = getNodeChildren(node);
    const searchText = getNodeSearchText(node);
    visibleNodes.push({
      key,
      value: node,
      isOpen: hasQuery || expandedNodes.has(key),
      canOpen: children.length > 0,
      level: depth,
      parentKey: parentKey,
    });
    const matchedText = matcher.matches(searchText);
    let shouldAddNode = !hasQuery || matchedText || addAllChildren;
    if (expandedNodes.has(key) || hasQuery) {
      children.forEach((child) => {
        const pushedChildren = pushVisibleNodes(
          child,
          key,
          depth + 1,
          addAllChildren || matchedText
        );
        shouldAddNode = shouldAddNode || pushedChildren;
      });
    }
    if (!shouldAddNode) {
      visibleNodes.pop();
    }
    return shouldAddNode;
  };

  rootNodes.forEach((node) => pushVisibleNodes(node, undefined, 0, false));
  return visibleNodes;
}

function getAllNodeKeys<T>(
  rootNodes: T[],
  getNodeKey: (node: T) => string,
  getNodeChildren: (node: T) => T[]
): string[] {
  const keys: string[] = [];

  const pushKeys = (node: T) => {
    const children = getNodeChildren(node);
    keys.push(getNodeKey(node));
    children.forEach((child) => pushKeys(child));
  };

  rootNodes.forEach((node) => pushKeys(node));
  return keys;
}
