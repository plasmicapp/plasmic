import * as parser from "@babel/parser";
import traverse, { Node, NodePath } from "@babel/traverse";
import {
  JSXElement,
  JSXAttribute,
  JSXSpreadAttribute,
  Comment,
  Expression,
  JSXEmptyExpression,
  StringLiteral,
  JSXText,
  TSNonNullExpression,
  MemberExpression,
  JSXSpreadChild,
  JSXFragment,
  V8IntrinsicIdentifier,
  JSXExpressionContainer,
} from "@babel/types";
import * as babel from "@babel/core";
import * as L from "lodash";
import generate from "@babel/generator";
import { cloneDeepWithHook } from "./cloneDeepWithHook";
import { assert, withoutNils, ensure } from "./common";
import {
  PlasmicASTNode,
  PlasmicJsxElement,
  PlasmicTagOrComponent,
  PlasmicArgRef,
} from "./plasmic-ast";
import { formatted, code } from "./utils";

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

const attrToString = (attr: JSXAttribute, input: string) => {
  return {
    name: attr.name.name,
    value: getSource(attr.value, input),
  };
};

const tryGetNodeIdFromAttr = (
  attr: JSXAttribute | JSXSpreadAttribute,
  input: string
) => {
  if (attr.type === "JSXAttribute") {
    const { name, value } = attrToString(attr, input);
    if (name === "className") {
      const m = value?.match(/^\s*{\s*rh\.cls(.+)\(/);
      if (m) {
        return m[1];
      }
    }
  } else {
    // spread
    const code =
      attr.start && attr.end
        ? input.substring(attr.start, attr.end)
        : undefined;
    const m = code?.match(/^\s*{\s*\.\.\.rh\.props(.+)\(/);
    if (m) {
      return m[1];
    }
  }
  return undefined;
};

const parseJsxElement = (
  n: JSXElement,
  plasmicId: string,
  input: string
): PlasmicJsxElement => {
  const attrs = new Array<[string, PlasmicASTNode | null] | string>();
  const children: Array<PlasmicASTNode> = [];
  traverse(n, {
    noScope: true,
    JSXAttribute: function (path) {
      if (path.parent === n.openingElement) {
        const name = path.node.name.name;
        ensure(L.isString(name));
        attrs.push([
          name as string,
          path.node.value === null
            ? null
            : parseJSXExpressionOrContainer(path.node.value, input),
        ]);
        path.skip();
      }
    },
    JSXSpreadAttribute: function (path) {
      if (path.parent === n.openingElement) {
        attrs.push(ensure(getSource(path.node, input)));
        path.skip();
      }
    },
    JSXElement: function (path) {
      if (path.parent === n) {
        children.push(parseJSXExpressionOrContainer(path.node, input));
        path.skip();
      }
    },
    JSXExpressionContainer: function (path) {
      if (path.parent === n) {
        children.push(parseJSXExpressionOrContainer(path.node, input));
        path.skip();
      }
    },
    JSXText: function (path) {
      if (path.parent === n) {
        const text = getSource(path.node, input);
        if (text !== undefined && !/^\s*$/.test(text)) {
          children.push({ type: "text", rawNode: path.node, value: text });
        }
        path.skip();
      }
    },
  });
  return {
    attrs,
    children,
    rawNode: n,
    nameInId: plasmicId,
  };
};

const tryParseAsPlasmicJsxElement = (
  jsx: JSXElement,
  input: string
): PlasmicJsxElement | undefined => {
  for (const attr of jsx.openingElement.attributes) {
    const nodeId = tryGetNodeIdFromAttr(attr, input);
    if (nodeId) {
      return parseJsxElement(jsx, nodeId, input);
    }
  }
  return undefined;
};

export const isInHtmlContext = <T extends Node>(path: NodePath<T>) => {
  const parent = path.parent;
  return parent.type === "JSXElement" || parent.type === "JSXFragment";
};

const parseJSXExpressionOrContainer = (
  n: Expression | JSXEmptyExpression | JSXExpressionContainer,
  input: string
): PlasmicASTNode => {
  if (n.type === "JSXEmptyExpression") {
    return {
      type: "opaque",
      rawNode: n,
      value: ensure(getSource(n, input)),
    };
  }
  const expr = n.type === "JSXExpressionContainer" ? n.expression : n;
  if (expr.type === "StringLiteral") {
    return {
      type: "string-lit",
      value: expr.value,
      rawNode: n as StringLiteral | JSXExpressionContainer,
    };
  }
  if (expr.type === "CallExpression") {
    const callee = getSource(expr.callee, input);
    const m = callee?.match(/^rh\.condStr(.+)$/);
    if (m) {
      return { type: "cond-str-call", plasmicId: ensure(m[1]), rawNode: n };
    }
  }
  // Parsing default nodes of slot is complicated since there is no clear
  // boundary between multiple default nodes. For example, for the following
  // generated code,
  //    args.XXX ||
  //      <>
  //       <div className={rh.clsDefault0()}></div>
  //       {rh.showDefault1() && <div {...rh.propsDefault1()}></div>}
  //       {rh.showDefault2() && <div {...rh.propsDefault2()}></div>}
  //      </>
  // the code may be edited as below, which will make the boundary difficult
  // to detect.
  //    myGuard() && args.XXX ||
  //      <>
  //       <div>
  //         { shouldShowDefault0 ? <div className={rh.clsDefault0()}></div> : null}
  //       </div>
  //       <div>
  //         {rh.showDefault1() && <div {...rh.propsDefault1()}></div>}
  //         {rh.showDefault2() && <div {...rh.propsDefault2()}></div>}
  //       </div>
  //      </>
  // We need to apply some constraints.
  //  - it must starts with "(( args.XXX", literally.
  //  - one can only edit attributes of the element. This means one cannot
  //    modify the structure of the defaultNodes, except for wrapping it in
  //    an expression if it was not or unwrap it.
  //
  // In the future, we could support user annotated boundary using comment.
  // The comment works as below
  //    args.XXX ||
  //      <>
  //       { // plasmicId=default0
  //       <div>
  //         { shouldShowDefault0 ? <div className={rh.clsDefault0()}></div> : null}
  //       </div>
  //       }
  //       <div>
  //         {rh.showDefault1() && <div {...rh.propsDefault1()}></div>}
  //         {rh.showDefault2() && <div {...rh.propsDefault2()}></div>}
  //       </div>
  //      </>
  const rawExpr = getSource(expr, input);
  const m = rawExpr?.match(/^\(*\s*args\.([^\)\s]*)/);
  if (m) {
    const jsxNodes: PlasmicTagOrComponent[] = [];
    traverse(n, {
      noScope: true,
      JSXElement: function (path) {
        const inHtmlContext = isInHtmlContext(path);
        const maybeWrappedJsxElement = tryParseAsPlasmicJsxElement(
          path.node,
          input
        );
        if (maybeWrappedJsxElement) {
          // We don't allow any wrapping for defaultNode.
          assert(maybeWrappedJsxElement.rawNode === path.node);
          // find the boundary node, which is the first ancestor whose
          // parent is JSXElement or JSXFragment
          const rawNode = inHtmlContext
            ? path.node
            : path.findParent(isInHtmlContext)?.node || n;

          jsxNodes.push({
            type: "tag-or-component",
            jsxElement: maybeWrappedJsxElement,
            rawNode:
              rawNode.type === "JSXExpressionContainer"
                ? rawNode
                : // Should be JSXElement
                  (assert(rawNode.type === "JSXElement"),
                  rawNode as JSXElement),
          });

          path.skip();
        }
      },
    });
    return { type: "arg", argName: m[1], jsxNodes, rawNode: n };
  }
  // Need to handle this case specially since traverse doesn't visit n itself.
  if (n.type === "JSXElement") {
    const jsxElement = tryParseAsPlasmicJsxElement(n, input);
    if (jsxElement) {
      return { type: "tag-or-component", jsxElement, rawNode: n };
    }
  }
  let jsxElement: PlasmicJsxElement | undefined = undefined;
  traverse(n, {
    noScope: true,
    JSXElement: function (path) {
      const parent = path.parent;
      const inHtmlContext =
        parent.type === "JSXElement" || parent.type === "JSXFragment";
      jsxElement = tryParseAsPlasmicJsxElement(path.node, input);
      if (jsxElement) {
        path.stop();
      }
    },
  });
  return jsxElement
    ? { type: "tag-or-component", jsxElement, rawNode: n }
    : {
        type: "opaque",
        rawNode: n,
        value: ensure(getSource(n, input)),
      };
};

export const parseFromJsxExpression = (input: string) => {
  const ast = parser.parseExpression(input, {
    strictMode: false,
    plugins: ["jsx", "typescript"],
  });
  return parseJSXExpressionOrContainer(ast, input);
};

// Given an AST, collect all JSX nodes into r, which index the nodes by
// nameInId.
const findTagOrComponents = (
  node: PlasmicASTNode | null,
  r: Map<string, PlasmicTagOrComponent>
) => {
  if (!node) {
    return;
  }
  if (node.type === "tag-or-component") {
    r.set(node.jsxElement.nameInId, node);
    node.jsxElement.attrs.forEach((attr) => {
      if (L.isString(attr)) {
        return;
      }
      findTagOrComponents(attr[1], r);
    });
    node.jsxElement.children.forEach((c) => {
      findTagOrComponents(c, r);
    });
  } else if (node.type === "arg") {
    node.jsxNodes.forEach((n) => findTagOrComponents(n, r));
  }
};

export const makeShowCallCallee = (nameInId: string) =>
  `${helperObject}.show${nameInId}`;

export const makeShowCall = (nameInId: string) =>
  `${makeShowCallCallee(nameInId)}()`;

export const calleeMatch = (
  callee: Expression | V8IntrinsicIdentifier | JSXEmptyExpression,
  object: string,
  member: string
) => {
  if (callee.type !== "MemberExpression") {
    return false;
  }
  return (
    callee.object.type === "Identifier" &&
    callee.object.name === object &&
    callee.property.type === "Identifier" &&
    callee.property.name === member
  );
};

export const memberExpressionMatch = (
  node: Node,
  object: string,
  member: string
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
) => {
  if (call.type !== "CallExpression") {
    return false;
  }
  return calleeMatch(call.callee, object, member);
};

export class CodeVersion {
  // keyed by nameInId, which could be uuid, or name
  tagOrComponents = new Map<string, PlasmicTagOrComponent>();
  // keyed by uuid
  tagOrComponentsByUuid = new Map<string, PlasmicTagOrComponent>();
  uuidToNameInId = new Map<string, string>();
  // The node of the jsx tree.
  root: PlasmicASTNode;

  constructor(
    input: string,
    // A map from nameInId to uuid
    readonly nameInIdToUuid: Map<string, string>,
    rootExpr?: Expression
  ) {
    if (rootExpr) {
      this.root = parseJSXExpressionOrContainer(rootExpr, input);
    } else {
      this.root = parseFromJsxExpression(input);
    }
    findTagOrComponents(this.root, this.tagOrComponents);
    this.tagOrComponents.forEach((n, nameInId) =>
      this.tagOrComponentsByUuid.set(
        ensure(this.nameInIdToUuid.get(nameInId)),
        n
      )
    );
    this.nameInIdToUuid.forEach((uuid, nameInId) => {
      this.uuidToNameInId.set(uuid, nameInId);
    });
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
      uuid: ensure(this.nameInIdToUuid.get(node.jsxElement.nameInId)),
    };
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
          calleeMatch(
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
      (attr) =>
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
  hasPropsIdSpreador(node: PlasmicTagOrComponent) {
    const matchingAttr = node.jsxElement.rawNode.openingElement.attributes.find(
      (attr) =>
        attr.type === "JSXSpreadAttribute" &&
        isCallIgnoreArguments(
          attr.argument,
          helperObject,
          `props${node.jsxElement.nameInId}`
        )
    );

    return !!matchingAttr;
  }
}
