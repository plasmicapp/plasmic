import * as parser from "@babel/parser";
import traverse, { Node, NodePath } from "@babel/traverse";
import {
  JSXElement,
  JSXAttribute,
  JSXSpreadAttribute,
  Expression,
  JSXEmptyExpression,
  StringLiteral,
  V8IntrinsicIdentifier,
  JSXExpressionContainer,
  CallExpression,
  JSXSpreadChild,
  JSXFragment,
  JSXText
} from "@babel/types";
import * as babel from "@babel/core";
import * as L from "lodash";
import { assert, ensure } from "./common";
import {
  PlasmicASTNode,
  PlasmicJsxElement,
  PlasmicTagOrComponent,
  PlasmicArgRef,
  PlasmicJSXFragment
} from "./plasmic-ast";

export const helperObject = "rh";

export const getSource = (n: Node | null, input: string) => {
  if (!n) {
    return undefined;
  }
  if (n.start === null || n.end === null) {
    return undefined;
  }
  return input.substring(n.start, n.end);
};

const tryGetNodeIdFromAttr = (attr: JSXAttribute | JSXSpreadAttribute) => {
  if (attr.type === "JSXAttribute") {
    if (attr.name.name === "className" && attr.value) {
      let nodeId: string | undefined = undefined;
      traverse(attr.value, {
        noScope: true,
        CallExpression: function(path) {
          const member = tryExtractPropertyNameOfMemberExpression(
            path.node.callee,
            helperObject
          );
          const m = member?.match(/^cls(.+)$/);
          if (m) {
            nodeId = m[1];
            path.stop();
          }
        }
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
  input: string
): PlasmicJsxElement => {
  const attrs: Array<
    [string, PlasmicASTNode | null] | string
  > = n.openingElement.attributes.map(attr => {
    if (attr.type === "JSXAttribute") {
      const name = attr.name.name;
      assert(L.isString(name));
      return [
        name as string,
        attr.value === null ? null : parseNode(attr.value, input)
      ];
    } else {
      // spreador
      return ensure(getSource(attr, input));
    }
  });
  const children = parseChildren(n, input);
  return {
    attrs,
    children,
    rawNode: n,
    nameInId: plasmicId
  };
};

const tryParseAsPlasmicJsxElement = (
  jsx: JSXElement,
  input: string
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
  return nodeId ? parseJsxElement(jsx, nodeId, input) : undefined;
};

export const isInHtmlContext = <T extends Node>(path: NodePath<T>) => {
  const parent = path.parent;
  return parent.type === "JSXElement" || parent.type === "JSXFragment";
};

const parseChildren = (
  n: JSXFragment | JSXElement,
  input: string
): PlasmicASTNode[] => {
  const nodesList: PlasmicASTNode[] = [];
  n.children.forEach(child => {
    if (child.type === "JSXText") {
      const text = getSource(child, input);
      if (text !== undefined) {
        const trimmed = text.trim();
        if (trimmed) {
          nodesList.push({ type: "text", rawNode: child, value: trimmed });
        }
      }
    } else {
      nodesList.push(parseNode(child, input));
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
  input: string
): PlasmicASTNode => {
  let node: PlasmicASTNode | null = null;
  if (n.type === "JSXExpressionContainer") {
    // Always unwrap the expression container
    node = parseNode(n.expression, input);
  } else if (n.type === "JSXSpreadChild") {
    node = parseAsOneNode(n.expression, input);
  } else if (n.type === "JSXFragment") {
    node = {
      type: "jsx-fragment",
      children: parseChildren(n, input),
      rawNode: n
    };
  } else {
    node = parseAsOneNode(n, input);
  }
  node.rawNode = n;
  return node;
};

const parseAsOneNode = (
  n: Expression | JSXEmptyExpression,
  input: string
): PlasmicASTNode => {
  if (n.type === "JSXEmptyExpression") {
    return {
      type: "opaque",
      rawNode: n
    };
  }

  if (n.type === "StringLiteral") {
    return {
      type: "string-lit",
      value: n.value,
      rawNode: n
    };
  }
  if (n.type === "CallExpression") {
    const callee = getSource(n.callee, input);
    const m = callee?.match(/^rh\.childStr(.+)$/);
    if (m) {
      return { type: "child-str-call", plasmicId: ensure(m[1]), rawNode: n };
    }
  }

  const rawExpr = getSource(n, input);
  const m = rawExpr?.match(/^\(*\s*args\.([^\)\s]*)/);
  if (m) {
    const jsxNodes: PlasmicTagOrComponent[] = [];
    traverse(n, {
      noScope: true,
      JSXFragment: function(path) {
        // In the new version of code, multiple default nodes are wrapped in a
        // fragment, with which, we have clear boundaries between defaultNodes.
        path.node.children.forEach(c => {
          if (c.type === "JSXElement" || c.type === "JSXExpressionContainer") {
            const parsedChild = parseNode(c, input);
            if (parsedChild && parsedChild.type === "tag-or-component") {
              jsxNodes.push(parsedChild);
            }
          }
        });
        path.stop();
      },
      JSXElement: function(path) {
        // To be conservative, JSX element's boundary stays at the element
        // itself. This means we may over-generate the rh.showXXX helpers after
        // each merge. But at least it is not lossy. The new version of code
        // won't have this problem since we always wrap default node(s) in a
        // fragment.
        const maybeWrappedJsxElement = tryParseAsPlasmicJsxElement(
          path.node,
          input
        );
        if (maybeWrappedJsxElement) {
          jsxNodes.push({
            type: "tag-or-component",
            jsxElement: maybeWrappedJsxElement,
            rawNode: path.node,
            sound: true
          });

          path.skip();
        }
      }
    });
    return { type: "arg", argName: m[1], jsxNodes, rawNode: n };
  }
  // Need to handle this case specially since traverse doesn't visit n itself.
  if (n.type === "JSXElement") {
    const jsxElement = tryParseAsPlasmicJsxElement(n, input);
    if (jsxElement) {
      return { type: "tag-or-component", jsxElement, rawNode: n, sound: true };
    }
  }
  const jsxElements: PlasmicJsxElement[] = [];
  traverse(n, {
    noScope: true,
    JSXElement: function(path) {
      const jsxElement = tryParseAsPlasmicJsxElement(path.node, input);
      if (jsxElement) {
        jsxElements.push(jsxElement);
        path.skip();
      }
    }
  });
  return jsxElements.length > 0
    ? {
        type: "tag-or-component",
        jsxElement: jsxElements[0],
        rawNode: n,
        sound: jsxElements.length === 1
      }
    : {
        type: "opaque",
        rawNode: n
      };
};

export const parseJSXExpressionOrContainerAsNodeList = (expr: Expression) => {};

export const parseFromJsxExpression = (input: string) => {
  const ast = parser.parseExpression(input, {
    strictMode: false,
    plugins: ["jsx", "typescript"]
  });
  return parseNode(ast, input);
};

// Given an AST, collect all JSX nodes into r, which index the nodes by
// nameInId.
const findNodes = (
  node: PlasmicASTNode | null,
  tags: Map<string, PlasmicTagOrComponent>,
  args: Map<string, PlasmicArgRef>
) => {
  if (!node) {
    return;
  }
  if (node.type === "tag-or-component") {
    tags.set(node.jsxElement.nameInId, node);
    node.jsxElement.attrs.forEach(attr => {
      if (L.isString(attr)) {
        return;
      }
      findNodes(attr[1], tags, args);
    });
    node.jsxElement.children.forEach(c => {
      findNodes(c, tags, args);
    });
  } else if (node.type === "arg") {
    args.set(node.argName, node);
    node.jsxNodes.forEach(n => findNodes(n, tags, args));
  } else if (node.type === "jsx-fragment") {
    node.children.forEach(child => findNodes(child, tags, args));
  }
};

export const makeShowCallCallee = (nameInId: string) =>
  `${helperObject}.show${nameInId}`;

export const makeShowCall = (nameInId: string) =>
  `${makeShowCallCallee(nameInId)}()`;

export const tryExtractPropertyNameOfMemberExpression = (
  callee: Expression | V8IntrinsicIdentifier | JSXEmptyExpression,
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
  tagOrComponents = new Map<string, PlasmicTagOrComponent>();
  // keyed by uuid
  tagOrComponentsByUuid = new Map<string, PlasmicTagOrComponent>();
  uuidToNameInId = new Map<string, string>();
  // The node of the jsx tree.
  root: PlasmicASTNode;

  private argNameToNode = new Map<string, PlasmicArgRef>();
  private slotArgNameToUuid = new Map<string, string>();
  private uuidToSlotArgName = new Map<string, string>();

  constructor(
    readonly input: string,
    // A map from nameInId to uuid
    readonly nameInIdToUuid: Map<string, string>,
    rootExpr?: Expression
  ) {
    if (rootExpr) {
      this.root = parseNode(rootExpr, input);
    } else {
      this.root = parseFromJsxExpression(input);
    }
    findNodes(this.root, this.tagOrComponents, this.argNameToNode);
    this.tagOrComponents.forEach((n, nameInId) =>
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

  getUuid(nameInId: string) {
    return ensure(this.nameInIdToUuid.get(nameInId));
  }

  // Find a tagOrComponent node whose nameInId matches, or uuid matches.
  // nameInId has higher priority.
  findNode(id: { nameInId: string; uuid: string }) {
    const node = this.tagOrComponents.get(id.nameInId);
    if (node) {
      return node;
    }
    return this.tagOrComponentsByUuid.get(id.uuid);
  }

  getId(node: PlasmicTagOrComponent) {
    return {
      nameInId: node.jsxElement.nameInId,
      uuid: ensure(this.nameInIdToUuid.get(node.jsxElement.nameInId))
    };
  }

  tryGetSlotArgUuid(argName: string) {
    return this.slotArgNameToUuid.get(argName);
  }

  // uuid for an arg could be missing since we only record uuid for slot arg
  // only. It could also be missing in historical version.
  findSlotArgNode(argName: string, uuid: string | undefined) {
    // Try matching by name first
    const node = this.argNameToNode.get(argName);
    if (node) {
      return node;
    }
    if (!uuid) {
      return undefined;
    }
    // Match by UUID
    const argNameByUuid = this.uuidToSlotArgName.get(uuid);
    if (argNameByUuid) {
      return this.argNameToNode.get(argNameByUuid);
    }
    return undefined;
  }

  hasShowFuncCall(node: PlasmicTagOrComponent) {
    if (node.rawNode === node.jsxElement.rawNode) {
      return false;
    }
    let found = false;
    traverse(node.rawNode, {
      noScope: true,
      CallExpression: function(path) {
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
      JSXElement: function(path) {
        if (path.node === node.jsxElement.rawNode) {
          path.skip();
        }
      }
    });
    return found;
  }

  hasClassNameIdAttr(node: PlasmicTagOrComponent) {
    const matchingAttr = node.jsxElement.rawNode.openingElement.attributes.find(
      attr =>
        attr.type === "JSXAttribute" &&
        attr.name.name === "className" &&
        attr.value?.type === "JSXExpressionContainer" &&
        isCallIgnoreArguments(
          attr.value.expression,
          helperObject,
          `cls${node.jsxElement.nameInId}`
        )
    );

    return !!matchingAttr;
  }

  tryGetPropsIdSpreador(node: PlasmicTagOrComponent) {
    const matchingAttr = node.jsxElement.rawNode.openingElement.attributes.find(
      attr =>
        attr.type === "JSXSpreadAttribute" &&
        isCallIgnoreArguments(
          attr.argument,
          helperObject,
          `props${node.jsxElement.nameInId}`
        )
    );

    return matchingAttr;
  }

  hasPropsIdSpreador(node: PlasmicTagOrComponent) {
    return !!this.tryGetPropsIdSpreador(node);
  }
}
