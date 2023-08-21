import { Tree, TreeDataNode, TreeProps } from "antd";
import React, { Key, useState } from "react";
import { Registerable, registerComponentHelper } from "./utils";
import { DirectoryTreeProps } from "antd/es/tree";

function useMunged(props: TreeProps) {
  const [autoExpandParent, setAutoExpandParent] = useState(
    props.autoExpandParent
  );
  const munged = { ...props, autoExpandParent };
  if (!props.expandedKeys) {
    delete munged["expandedKeys"];
  }
  // Currently, when you pass in defaultExpandAll, Tree internally adds *all* nodes to be expandedKeys, including leaf
  // nodes. If autoExpandParent is set, then this means it's impossible to collapse any part of the tree! Ideally, the
  // initial expandedKeys will be just parent nodes. But for now, we just do this. It's not nice because if you do
  // expect autoExpandParent behavior, it won't be there at this point. But it's a quick fix for now for the more
  // glaring issue, and what is done in the controlled demo on https://ant.design/components/tree.
  munged.onExpand = (expandedKeys, info) => {
    props.onExpand?.(expandedKeys, info);
    setAutoExpandParent(false);
  };
  return munged;
}

export function AntdTree(props: TreeProps) {
  const munged = useMunged(props);
  return <Tree {...munged} />;
}

// AntdTree.__plasmicFormFieldMeta = {
//   valueProp: "checkedKeys",
//   onChangePropName: "onChange",
// };

export function AntdDirectoryTree(props: DirectoryTreeProps) {
  const munged = useMunged(props);
  return <Tree.DirectoryTree {...munged} />;
}

export interface CheckedDetails<
  TreeDataType extends TreeDataNode = TreeDataNode
> {
  halfCheckedKeys: Key[];
  checkedNodesPositions?: {
    node: TreeDataType;
    pos: string;
  }[];
}

const treeHelpers_ = {
  states: {
    selectedKeys: {
      onChangeArgsToValue: ((selectedKeys, _info) => {
        return selectedKeys;
      }) as TreeProps["onSelect"],
    },
    selectedNodes: {
      onChangeArgsToValue: ((_selectedKeys, info) => {
        return info.selectedNodes;
      }) as TreeProps["onSelect"],
    },
    expandedKeys: {
      onChangeArgsToValue: ((expandedKeys, _info) => {
        return expandedKeys;
      }) as TreeProps["onExpand"],
    },
    checkedKeys: {
      onChangeArgsToValue: ((checkedKeys, _info) => {
        return checkedKeys;
      }) as TreeProps["onCheck"],
    },
    checkedNodes: {
      onChangeArgsToValue: ((_checkedKeys, info) => {
        return info.checkedNodes;
      }) as TreeProps["onCheck"],
    },
    checkedDetails: {
      onChangeArgsToValue: ((_checkedKeys, info) => {
        return {
          checkedNodesPositions: info.checkedNodesPositions,
          halfCheckedKeys: info.halfCheckedKeys,
        };
      }) as TreeProps["onCheck"],
    },
  },
} as const;

// Work around inability to ts-ignore:
// src/registerTree.tsx:40:14 - error TS4023: Exported variable 'treeHelpers' has or is using name 'CheckInfo' from external module "/.../public-packages/plasmicpkgs/antd5/node_modules/rc-tree/lib/Tree" but cannot be named.
export const treeHelpers = treeHelpers_ as any;

export const treeData: TreeDataNode[] = [
  {
    title: "Node 0",
    key: "0",
    children: [
      {
        title: "Node 0-0",
        key: "0-0",
        children: [
          {
            title: "Node 0-0-0",
            key: "0-0-0",
            disableCheckbox: true,
          },
          {
            title: "Node 0-0-1",
            key: "0-0-1",
            disabled: true,
          },
          {
            title: "Node 0-0-2",
            key: "0-0-2",
          },
        ],
      },
      {
        title: "Node 0-1",
        key: "0-1",
        children: [
          {
            title: "Node 0-1-0",
            key: "0-1-0",
          },
          {
            title: "Node 0-1-1",
            key: "0-1-1",
          },
        ],
      },
    ],
  },
];

function registerTreeHelper({
  loader,
  component,
  name,
  displayName,
  importName,
  checkableDefaultValue,
  expandActionDefaultValue,
}: {
  loader: Registerable | undefined;
  component: typeof AntdTree;
  name: string;
  displayName: string;
  importName: string;
  checkableDefaultValue: boolean;
  expandActionDefaultValue: string | boolean;
}) {
  registerComponentHelper(loader, component, {
    name: name,
    displayName: displayName,
    props: {
      treeData: {
        type: "array",
        defaultValue: treeData,
      },
      checkable: {
        type: "boolean",
        defaultValue: checkableDefaultValue,
      },
      selectable: {
        type: "boolean",
        defaultValueHint: true,
      },
      checkedKeys: {
        type: "array",
        editOnly: true,
        uncontrolledProp: "defaultCheckedKeys",
        description: "List of checked keys.",
        hidden: (ps) => !ps.checkable,
      },
      selectedKeys: {
        type: "array",
        editOnly: true,
        uncontrolledProp: "defaultSelectedKeys",
        description: "List of selected keys.",
        hidden: (ps) => !(ps.selectable ?? true),
        advanced: true,
      },
      expandedKeys: {
        type: "array",
        editOnly: true,
        uncontrolledProp: "defaultExpandedKeys",
        description: "List of expanded keys.",
        // hidden: (ps) => !ps.expa,
        advanced: true,
      },
      disabled: {
        type: "boolean",
        defaultValueHint: false,
      },
      showLine: {
        type: "boolean",
        defaultValueHint: false,
      },
      defaultExpandAll: {
        type: "boolean",
        description:
          "Whether to automatically expand all nodes at initialization",
        defaultValueHint: false,
        defaultValue: true,
      },
      autoExpandParent: {
        type: "boolean",
        description: "Whether to automatically expand a parent node",
        defaultValue: true,
        advanced: true,
      },
      defaultExpandParent: {
        type: "boolean",
        description:
          "Whether to automatically expand a parent node at initialization",
        defaultValueHint: false,
        advanced: true,
      },
      expandAction: {
        type: "choice",
        options: [
          {
            label: "None",
            value: false,
          },
          {
            label: "Click",
            value: "click",
          },
          {
            label: "Double click",
            value: "doubleClick",
          },
        ],
        defaultValueHint: expandActionDefaultValue,
      },
      multiple: {
        type: "boolean",
        defaultValueHint: false,
        description: "Whether to allow multiple selection",
        advanced: true,
      },
      titleRender: {
        type: "slot",
        hidePlaceholder: true,
        renderPropParams: ["node"],
      },
      // draggable: {
      //   type: "boolean",
      //   defaultValueHint: false,
      //   advanced: true,
      // },
      // allowDrop: {
      //   type: "boolean",
      //   defaultValueHint: false,
      //   advanced: true,
      //   description: "Whether to allow dropping on the node",
      // },
      onSelect: {
        type: "eventHandler",
        argTypes: [
          { name: "selectedKeys", type: { type: "array" } },
          {
            name: "selectedNodes",
            type: { type: "array" },
          },
        ],
      },
      onCheck: {
        type: "eventHandler",
        argTypes: [
          { name: "checkedKeys", type: { type: "array" } },
          {
            name: "checkDetails",
            type: { type: "object" },
          },
        ],
      },
      onExpand: {
        type: "eventHandler",
        argTypes: [
          { name: "expandedKeys", type: { type: "array" } },
          {
            name: "expandDetails",
            type: { type: "object" },
          },
        ],
      },
    },
    states: {
      checkedKeys: {
        type: "writable",
        valueProp: "checkedKeys",
        onChangeProp: "onCheck",
        variableType: "array",
        initVal: [],
        ...treeHelpers_.states.checkedKeys,
      },
      checkedNodes: {
        type: "readonly",
        onChangeProp: "onCheck",
        variableType: "array",
        initVal: [],
        ...treeHelpers_.states.checkedNodes,
      },
      checkedDetails: {
        type: "readonly",
        onChangeProp: "onCheck",
        variableType: "object",
        initVal: {
          checkedNodesPositions: [],
          halfCheckedKeys: [],
        } as CheckedDetails,
        ...treeHelpers_.states.checkedDetails,
      },
      selectedKeys: {
        type: "writable",
        valueProp: "selectedKeys",
        onChangeProp: "onSelect",
        variableType: "array",
        initVal: [],
        ...treeHelpers_.states.selectedKeys,
      },
      selectedNodes: {
        type: "readonly",
        onChangeProp: "onSelect",
        variableType: "array",
        initVal: [],
        ...treeHelpers_.states.selectedNodes,
      },
      expandedKeys: {
        type: "writable",
        valueProp: "expandedKeys",
        onChangeProp: "onExpand",
        variableType: "array",
        initVal: [],
        ...treeHelpers_.states.expandedKeys,
      },
    },
    componentHelpers: {
      helpers: treeHelpers_,
      importName: "treeHelpers",
      importPath: "@plasmicpkgs/antd5/skinny/registerTree",
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerTree",
    importName: importName,
  });
}

export function registerTree(loader?: Registerable) {
  registerTreeHelper({
    loader,
    component: AntdTree,
    name: "plasmic-antd5-tree",
    displayName: "Tree",
    importName: "AntdTree",
    checkableDefaultValue: true,
    expandActionDefaultValue: false,
  });
}

export function registerDirectoryTree(loader?: Registerable) {
  registerTreeHelper({
    loader,
    component: AntdDirectoryTree,
    name: "plasmic-antd5-directory-tree",
    displayName: "Directory Tree",
    importName: "AntdDirectoryTree",
    checkableDefaultValue: false,
    expandActionDefaultValue: "click",
  });
}
