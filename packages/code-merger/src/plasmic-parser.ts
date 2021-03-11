import * as babel from "@babel/core";
import * as parser from "@babel/parser";
import traverse, { Node } from "@babel/traverse";
import {
  CallExpression,
  Expression,
  JSXAttribute,
  JSXElement,
  JSXEmptyExpression,
  JSXExpressionContainer,
  JSXFragment,
  JSXSpreadAttribute,
  JSXSpreadChild,
} from "@babel/types";
import * as L from "lodash";
import { cloneDeepWithHook } from "./cloneDeepWithHook";
import { assert, ensure } from "./common";
import {
  PlasmicASTNode,
  PlasmicJsxElement,
  PlasmicTagOrComponent,
} from "./plasmic-ast";
import { getAttrName, isAttribute } from "./utils";

export const helperObject = "rh";

const tryGetNodeIdFromAttr = (attr: JSXAttribute | JSXSpreadAttribute) => {
  if (attr.type === "JSXAttribute") {
    if (isAttribute(attr, "className") && attr.value) {
      let nodeId: string | undefined = undefined;
      traverse(attr.value, {
        noScope: true,
        CallExpression: function (path) {
          const member = tryExtractPropertyNameOfMemberExpression(
            path.node.callee,
            helperObject
          );
          const m = member?.match(/^cls(.+)$/);
          if (m) {
            nodeId = m[1];
            path.stop();
          }
        },
      });
      return nodeId;
    }
  } else {
    // spread
    if (
      attr.argument.type === "CallExpression" &&
      attr.argument.callee.type === "MemberExpression"
    ) {
      const member = tryExtractPropertyNameOfMemberExpression(
        attr.argument.callee,
        helperObject
      );
      const m = member?.match(/^props(.+)$/);
      if (m) {
        return m[1];
      }
    }
  }
  return undefined;
};

const parseJsxElement = (
  n: JSXElement,
  plasmicId: string,
  parent: Node | undefined
): PlasmicJsxElement => {
  const attrs: Array<
    [string, PlasmicASTNode | null] | PlasmicASTNode
  > = n.openingElement.attributes.map((attr) => {
    if (attr.type === "JSXAttribute") {
      const name = getAttrName(attr);
      assert(L.isString(name));
      return [
        name,
        attr.value === null ? null : parseNode(attr.value, attr, false),
      ];
    } else {
      // spreador
      return parseNode(attr.argument, attr, false);
    }
  });
  const children = parseChildren(n);
  return {
    attrs,
    children,
    rawNode: n,
    rawParent: parent,
    nameInId: plasmicId,
  };
};

const tryParseAsPlasmicJsxElement = (
  jsx: JSXElement,
  parent: Node | undefined
): PlasmicJsxElement | undefined => {
  let nodeId: string | undefined = undefined;
  for (const attr of jsx.openingElement.attributes) {
    const curNodeId = tryGetNodeIdFromAttr(attr);
    if (curNodeId) {
      if (nodeId) {
        // The id in className and spreador must match.
        assert(nodeId === curNodeId);
      }
      nodeId = curNodeId;
    }
  }
  return nodeId ? parseJsxElement(jsx, nodeId, parent) : undefined;
};

export const isJsxElementOrFragment = (n: Node) => {
  return n.type === "JSXElement" || n.type === "JSXFragment";
};

const parseChildren = (n: JSXFragment | JSXElement): PlasmicASTNode[] => {
  const nodesList: PlasmicASTNode[] = [];
  n.children.forEach((child) => {
    if (child.type === "JSXText") {
      const text = child.value;
      if (text !== undefined) {
        const trimmed = text.trim();
        if (trimmed) {
          nodesList.push({ type: "text", rawNode: child, value: trimmed });
        }
      }
    } else {
      nodesList.push(parseNode(child, n, true));
    }
  });
  return nodesList;
};

const parseNode = (
  n:
    | Expression
    | JSXEmptyExpression
    | JSXExpressionContainer
    | JSXSpreadChild
    | JSXFragment,
  parent: Node | undefined,
  forceFragmentAsOneNode: boolean
): PlasmicASTNode => {
  let node: PlasmicASTNode | null = null;
  if (n.type === "JSXExpressionContainer") {
    // Always unwrap the expression container
    node = parseNode(n.expression, n, forceFragmentAsOneNode);
  } else if (n.type === "JSXSpreadChild") {
    node = parseAsOneNode(n.expression, n);
  } else if (n.type === "JSXFragment") {
    node = forceFragmentAsOneNode
      ? parseAsOneNode(n, parent)
      : {
          type: "jsx-fragment",
          children: parseChildren(n),
          rawNode: n,
        };
  } else {
    node = parseAsOneNode(n, parent);
  }
  node.rawNode = n;
  return node;
};

const parseAsOneNode = (
  n: Expression | JSXEmptyExpression | JSXFragment,
  parent: Node | undefined
): PlasmicASTNode => {
  if (n.type === "JSXEmptyExpression") {
    return {
      type: "opaque",
      rawNode: n,
    };
  }

  if (n.type === "StringLiteral") {
    return {
      type: "string-lit",
      value: n.value,
      rawNode: n,
    };
  }
  if (n.type === "CallExpression") {
    const callee = tryExtractPropertyNameOfMemberExpression(
      n.callee,
      helperObject
    );
    const m = callee?.match(/^childStr(.+)$/);
    if (m) {
      return { type: "child-str-call", plasmicId: ensure(m[1]), rawNode: n };
    }
  }

  // Need to handle this case specially since traverse doesn't visit n itself.
  if (n.type === "JSXElement") {
    const jsxElement = tryParseAsPlasmicJsxElement(n, parent);
    if (jsxElement) {
      return {
        type: "tag-or-component",
        jsxElement,
        rawNode: n,
        secondaryNodes: [],
      };
    }
  }
  const jsxElements: PlasmicJsxElement[] = [];
  traverse(n, {
    noScope: true,
    JSXElement: function (path) {
      const jsxElement = tryParseAsPlasmicJsxElement(path.node, path.parent);
      if (jsxElement) {
        jsxElements.push(jsxElement);
        path.skip();
      }
    },
  });
  return jsxElements.length > 0
    ? {
        type: "tag-or-component",
        jsxElement: jsxElements[0],
        rawNode: n,
        secondaryNodes: jsxElements.slice(1).map((elt) => ({
          type: "tag-or-component",
          jsxElement: elt,
          rawNode:
            elt.rawParent && elt.rawParent.type === "LogicalExpression"
              ? elt.rawParent
              : elt.rawNode,
          secondaryNodes: [],
        })),
      }
    : {
        type: "opaque",
        rawNode: n,
      };
};

export const parseJSXExpressionOrContainerAsNodeList = (expr: Expression) => {};

export const parseFromJsxExpression = (input: string) => {
  const ast = parser.parseExpression(input, {
    strictMode: false,
    plugins: ["jsx", "typescript"],
  });
  return parseNode(ast, undefined, true);
};

// Given an AST, collect all JSX nodes into r, which index the nodes by
// nameInId.
const findNodes = (
  node: PlasmicASTNode | null,
  tags: Map<string, PlasmicTagOrComponent>,
  secondaryTags: Map<string, PlasmicTagOrComponent>
) => {
  if (!node) {
    return;
  }
  if (node.type === "tag-or-component") {
    tags.set(node.jsxElement.nameInId, node);
    node.jsxElement.attrs.forEach((attr) => {
      if (!L.isArray(attr)) {
        findNodes(attr, tags, secondaryTags);
      } else {
        findNodes(attr[1], tags, secondaryTags);
      }
    });
    node.jsxElement.children.forEach((c) => {
      findNodes(c, tags, secondaryTags);
    });
    node.secondaryNodes.forEach((c) => findNodes(c, tags, secondaryTags));
    node.secondaryNodes.forEach((c) =>
      secondaryTags.set(c.jsxElement.nameInId, c)
    );
  } else if (node.type === "jsx-fragment") {
    node.children.forEach((child) => findNodes(child, tags, secondaryTags));
  }
};

export const makeShowCallCallee = (nameInId: string) =>
  `${helperObject}.show${nameInId}`;

export const makeShowCall = (nameInId: string) =>
  `${makeShowCallCallee(nameInId)}()`;

export const tryExtractPropertyNameOfMemberExpression = (
  callee: Node,
  object: string
) => {
  if (callee.type !== "MemberExpression") {
    return undefined;
  }
  if (
    callee.object.type === "Identifier" &&
    callee.object.name === object &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name as string;
  }
  return undefined;
};

export const memberExpressionMatch = (
  node: Node,
  object: string,
  member?: string
) => {
  if (node.type !== "MemberExpression") {
    return false;
  }
  return (
    node.object.type === "Identifier" &&
    node.object.name === object &&
    node.property.type === "Identifier" &&
    node.property.name === member
  );
};

export const makeMemberExpression = (object: string, member: string) => {
  return babel.types.memberExpression(
    babel.types.identifier(object),
    babel.types.identifier(member)
  );
};

export const isCallIgnoreArguments = (
  call: Node,
  object: string,
  member: string
): call is CallExpression => {
  if (call.type !== "CallExpression") {
    return false;
  }
  return memberExpressionMatch(call.callee, object, member);
};

export const isCallWithoutArguments = (
  call: Node,
  object: string,
  member: string
) => {
  return (
    isCallIgnoreArguments(call, object, member) && call.arguments.length === 0
  );
};

export class CodeVersion {
  // keyed by nameInId, which could be uuid, or name
  allTagOrComponents = new Map<string, PlasmicTagOrComponent>();
  // keyed by nameInId, which could be uuid, or name
  secondaryTagsOrComponents = new Map<string, PlasmicTagOrComponent>();
  // keyed by uuid
  tagOrComponentsByUuid = new Map<string, PlasmicTagOrComponent>();
  uuidToNameInId = new Map<string, string>();
  // The node of the jsx tree.
  root: PlasmicASTNode;

  private slotArgNameToUuid = new Map<string, string>();
  private uuidToSlotArgName = new Map<string, string>();

  constructor(
    rootExpr: string | Expression,
    // A map from nameInId to uuid
    readonly nameInIdToUuid: Map<string, string>
  ) {
    if (L.isString(rootExpr)) {
      this.root = parseFromJsxExpression(rootExpr);
    } else {
      this.root = parseNode(rootExpr, undefined, true);
    }
    findNodes(
      this.root,
      this.allTagOrComponents,
      this.secondaryTagsOrComponents
    );
    this.allTagOrComponents.forEach((n, nameInId) =>
      this.tagOrComponentsByUuid.set(
        ensure(this.nameInIdToUuid.get(nameInId)),
        n
      )
    );
    this.nameInIdToUuid.forEach((uuid, nameInId) => {
      this.uuidToNameInId.set(uuid, nameInId);
      if (nameInId.startsWith("$slot")) {
        const argName = L.lowerFirst(nameInId.substr(5));
        this.slotArgNameToUuid.set(argName, uuid);
        this.uuidToSlotArgName.set(uuid, argName);
      }
    });
  }

  renameJsxTree(targetCodeVersion: CodeVersion) {
    const revisedNameInIdToUuid = new Map<string, string>(
      targetCodeVersion.nameInIdToUuid
    );
    const renamedJsx = cloneDeepWithHook(this.root.rawNode, (n: Node) => {
      const helperMember = tryExtractPropertyNameOfMemberExpression(
        n,
        helperObject
      );
      if (helperMember) {
        const eventHandlers = [
          "onMouseUp",
          "onMouseDown",
          "onFocus",
          "onBlur",
          "onMouseEnter",
          "onMouseLeave",
        ];
        const regEx = new RegExp(
          `^(cls|props|show|childStr|${eventHandlers.join("|")})(.+)$`
        );
        const m = helperMember.match(regEx);
        if (m) {
          const prefix = m[1];
          const nameInId = m[2];
          const curUuid = ensure(this.nameInIdToUuid.get(nameInId));
          const newNameInId = targetCodeVersion.findMatchingNameInId({
            nameInId,
            uuid: curUuid,
          });
          if (!newNameInId) {
            // node has been deleted in targetCodeVersion. Fine to keep the name,
            // but need to add this id into the new map.
            revisedNameInIdToUuid.set(nameInId, curUuid);
          } else {
            return makeMemberExpression(
              helperObject,
              `${prefix}${newNameInId}`
            );
          }
        }
        return undefined;
      }
      const argName = tryExtractPropertyNameOfMemberExpression(n, "args");
      if (argName) {
        const newSlotArgName = targetCodeVersion.findMatchingSlotArgName(
          argName,
          this.tryGetSlotArgUuid(argName)
        );
        if (!newSlotArgName) {
          // Either non slot args, or the arg has been deleted. Keep the name
        } else {
          return makeMemberExpression("args", newSlotArgName);
        }
      }

      return undefined;
    });
    assert(babel.types.isExpression(renamedJsx));
    return new CodeVersion(renamedJsx, revisedNameInIdToUuid);
  }

  findMatchingNameInId(id: { nameInId: string; uuid: string }) {
    const uuid = this.nameInIdToUuid.get(id.nameInId);
    if (uuid) {
      // nameInId exists - keep the id!
      return id.nameInId;
    }
    // nameInId doesn't exist. Match by uuid
    return this.uuidToNameInId.get(id.uuid);
  }

  findMatchingSlotArgName(argName: string, uuid: string | undefined) {
    const slotUuid = this.slotArgNameToUuid.get(argName);
    if (slotUuid) {
      // argName exists - keep the name
      return argName;
    }
    if (!uuid) {
      return undefined;
    }
    // Match by UUID
    return this.uuidToSlotArgName.get(uuid);
  }

  // Find a tagOrComponent node whose nameInId matches, or uuid matches.
  // nameInId has higher priority.
  findTagOrComponent(nameInId: string) {
    return this.allTagOrComponents.get(nameInId);
  }

  tryGetSlotArgUuid(argName: string) {
    return this.slotArgNameToUuid.get(argName);
  }

  hasShowFuncCall(node: PlasmicTagOrComponent) {
    if (node.rawNode === node.jsxElement.rawNode) {
      return false;
    }
    let found = false;
    traverse(node.rawNode, {
      noScope: true,
      CallExpression: function (path) {
        if (
          memberExpressionMatch(
            path.node.callee,
            helperObject,
            `show${node.jsxElement.nameInId}`
          )
        ) {
          found = true;
          path.stop();
        }
      },
      JSXElement: function (path) {
        if (path.node === node.jsxElement.rawNode) {
          path.skip();
        }
      },
    });
    return found;
  }

  hasClassNameIdAttr(node: PlasmicTagOrComponent) {
    const matchingAttr = node.jsxElement.rawNode.openingElement.attributes.find(
      (attr) => {
        if (!isAttribute(attr, "className")) {
          return false;
        }
        let found = false;
        traverse(attr, {
          noScope: true,
          MemberExpression: function (path) {
            found =
              found ||
              memberExpressionMatch(
                path.node,
                helperObject,
                `cls${node.jsxElement.nameInId}`
              );
            if (found) {
              path.stop();
            }
          },
        });
        return found;
      }
    );

    return !!matchingAttr;
  }

  tryGetPropsIdSpreador(node: PlasmicTagOrComponent) {
    const matchingAttr = node.jsxElement.rawNode.openingElement.attributes.find(
      (attr) => {
        if (attr.type !== "JSXSpreadAttribute") {
          return false;
        }
        let found = false;
        traverse(attr, {
          noScope: true,
          MemberExpression: function (path) {
            found =
              found ||
              memberExpressionMatch(
                path.node,
                helperObject,
                `props${node.jsxElement.nameInId}`
              );
            if (found) {
              path.stop();
            }
          },
        });
        return found;
      }
    );

    return matchingAttr;
  }

  hasPropsIdSpreador(node: PlasmicTagOrComponent) {
    return !!this.tryGetPropsIdSpreador(node);
  }
}
