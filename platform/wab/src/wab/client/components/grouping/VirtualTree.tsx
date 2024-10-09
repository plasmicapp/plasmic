import { Matcher } from "@/wab/client/components/view-common";
import { ListSpace } from "@/wab/client/components/widgets/ListStack";
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
    toggleExpand: () => void;
  };
}

export interface VirtualTreeRef {
  expandAll: () => void;
  collapseAll: () => void;
}

type Key = string;

type RenderElement<T> = React.FunctionComponent<RenderElementProps<T>>;

interface LinearTreeNode<T> {
  value: T;
  key: Key;
  level: number;
  parentKey?: Key;
  isOpen: boolean;
  canOpen: boolean;
}

interface TreeRowData<T> {
  treeData: {
    matcher: Matcher;
    nodes: LinearTreeNode<T>[];
    renderElement: RenderElement<T>;
    toggleExpand: (key: Key) => void;
  };
}

interface VirtualTreeProps<T> {
  rootNodes: T[];
  query?: string;
  getNodeKey: (node: T) => Key;
  getNodeChildren: (node: T) => T[];
  getNodeSearchText: (node: T) => string;
  getNodeHeight: (node: T) => number;
  renderElement: RenderElement<T>;
}

export const VirtualTree = React.forwardRef(function <T>(
  props: VirtualTreeProps<T>,
  ref: React.ForwardedRef<VirtualTreeRef>
) {
  const {
    rootNodes,
    query,
    getNodeKey,
    getNodeChildren,
    getNodeSearchText,
    getNodeHeight,
    renderElement,
  } = props;

  const listRef = React.useRef<VariableSizeList>(null);

  const { nodeData, nodeKey, nodeHeights, expandAll, collapseAll } =
    useTreeData(
      rootNodes,
      query,
      renderElement,
      getNodeKey,
      getNodeChildren,
      getNodeSearchText,
      getNodeHeight
    );

  React.useImperativeHandle(
    ref,
    () => ({
      expandAll,
      collapseAll,
    }),
    [expandAll, collapseAll]
  );

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
  }, [JSON.stringify(nodeHeights)]);

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
}) as <T>(
  props: VirtualTreeProps<T> & React.RefAttributes<VirtualTreeRef>
) => React.JSX.Element;

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
        toggleExpand={data.treeData.toggleExpand}
        renderElement={data.treeData.renderElement}
      />
    );
  },
  areEqual
);

interface TreeNodeRowProps<T> {
  style?: React.CSSProperties;
  nodeKey: Key;
  value: T;
  level: number;
  parentKey?: Key;
  isOpen: boolean;
  canOpen: boolean;
  matcher: Matcher;
  toggleExpand: (key: Key) => void;
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
    renderElement,
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
      toggleExpand: () => toggleExpand(nodeKey),
    };
  }, [matcher, level, canOpen, isOpen, toggleExpand]);
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

function useTreeData<T>(
  nodes: T[],
  query: string = "",
  renderElement: RenderElement<T>,
  getNodeKey: (node: T) => Key,
  getNodeChildren: (node: T) => T[],
  getNodeSearchText: (node: T) => string,
  getNodeHeight: (node: T) => number
) {
  const matcher = React.useMemo(() => {
    return new Matcher(query?.trim() ?? "");
  }, [query]);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<Key>>(new Set());
  const toggleExpand = React.useCallback(
    (key: Key) => {
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

  // In case we delete the last children of a opened node,
  // we need to remove the node from the expanded nodes set.
  React.useEffect(() => {
    const fixedExpandedNodes = new Set<Key>(expandedNodes);
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
      },
    }),
    [visibleNodes, matcher, toggleExpand]
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

  return {
    nodeData,
    nodeKey,
    nodeHeights,
    expandAll,
    collapseAll,
  };
}

function buildVisibleNodes<T>(
  rootNodes: T[],
  matcher: Matcher,
  expandedNodes: Set<Key>,
  getNodeKey: (node: T) => Key,
  getNodeChildren: (node: T) => T[],
  getNodeSearchText: (node: T) => string
): LinearTreeNode<T>[] {
  const visibleNodes: LinearTreeNode<T>[] = [];
  const hasQuery = matcher.hasQuery();

  const pushVisibleNodes = (
    node: T,
    parentKey: Key | undefined,
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
