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
  JSXExpressionContainer,
  V8IntrinsicIdentifier,
  AssignmentExpression,
  ReturnStatement,
  JSXNamespacedName,
  JSXIdentifier,
  ImportDeclaration
} from "@babel/types";
import * as babel from "@babel/core";
import * as L from "lodash";
import generate from "@babel/generator";
import { cloneDeepWithHook } from "./cloneDeepWithHook";
import { assert, withoutNils, ensure, assertEq } from "./common";
import {
  PlasmicASTNode,
  PlasmicJsxElement,
  PlasmicTagOrComponent,
  makeCallExpression,
  wrapInJsxExprContainer
} from "./plasmic-ast";
import {
  CodeVersion,
  helperObject,
  isJsxElementOrFragment,
  memberExpressionMatch,
  makeMemberExpression,
  isCallIgnoreArguments,
  isCallWithoutArguments,
  tryExtractPropertyNameOfMemberExpression
} from "./plasmic-parser";
import {
  nodesDeepEqualIgnoreComments,
  code,
  formatted,
  tagName,
  compactCode,
  isAttribute,
  getAttrName
} from "./utils";
import { first, cloneDeep, replace } from "lodash";

const mkJsxFragment = (children: JsxChildType[]) => {
  return babel.types.jsxFragment(
    babel.types.jsxOpeningFragment(),
    babel.types.jsxClosingFragment(),
    // Remove unnecessary {}
    children.map(child =>
      child.type === "JSXExpressionContainer" &&
      child.expression.type === "JSXElement"
        ? child.expression
        : child
    )
  );
};

const getRawNamedAttrs = (jsxElement: JSXElement) => {
  const attrs = new Map<string, JSXAttribute>();
  for (const attr of jsxElement.openingElement.attributes) {
    if (attr.type !== "JSXAttribute") {
      continue;
    }
    assert(L.isString(attr.name.name));
    attrs.set(attr.name.name, attr);
  }
  return attrs;
};

const findParsedNamedAttrs = (node: PlasmicTagOrComponent, name: string) => {
  for (const attr of node.jsxElement.attrs) {
    if (!L.isArray(attr)) {
      continue;
    }
    if (attr[0] === name) {
      return attr[1];
    }
  }
  return undefined;
};

const mergedTag = (
  newNode: PlasmicTagOrComponent,
  editedNode: PlasmicTagOrComponent,
  baseNode: PlasmicTagOrComponent
) => {
  const baseTag = baseNode.jsxElement.rawNode.openingElement.name;
  const editedTag = editedNode.jsxElement.rawNode.openingElement.name;
  const newTag = newNode.jsxElement.rawNode.openingElement.name;
  const baseTagCode = code(baseTag);
  const editedTagCode = code(editedTag);
  if (baseTagCode === editedTagCode) {
    return newTag;
  }
  // User edited the tag. Always use the edited version, even when it conflict
  // with the new version.
  return editedTag;
};

const wrapAsJsxAttrValue = (
  rawValue:
    | Expression
    | JSXEmptyExpression
    | JSXExpressionContainer
    | JSXSpreadChild
    | JSXFragment
    | JSXText
    | undefined
) => {
  if (!rawValue) {
    return undefined;
  }
  if (rawValue.type === "JSXText" || rawValue.type === "JSXSpreadChild") {
    // Either newVersion or editedVersion was wrapped in a fragment.
    // We wrap too.
    mkJsxFragment([rawValue]);
  } else if (
    babel.types.isExpression(rawValue) ||
    babel.types.isJSXEmptyExpression(rawValue)
  ) {
    return babel.types.jsxExpressionContainer(rawValue);
  } else {
    return rawValue;
  }
};

const mergeAttributeValue = (
  attrName: string,
  newNode: PlasmicTagOrComponent,
  editedNode: PlasmicTagOrComponent,
  baseNode: PlasmicTagOrComponent,
  codeVersions: CodeVersions
) => {
  const parsedNewAttrValue = findParsedNamedAttrs(newNode, attrName);
  const parsedEditedAttrValue = findParsedNamedAttrs(editedNode, attrName);
  const parsedBaseAttrValue = findParsedNamedAttrs(baseNode, attrName);
  // These two must not be undefined (i.e. not found)
  assert(parsedNewAttrValue !== undefined);
  assert(parsedEditedAttrValue !== undefined);
  let mergedAttrValue:
    | Expression
    | JSXEmptyExpression
    | JSXExpressionContainer
    | JSXSpreadChild
    | JSXFragment
    | JSXText
    | undefined = undefined;
  if (!parsedNewAttrValue) {
    if (parsedEditedAttrValue) {
      mergedAttrValue = serializePlasmicASTNode(
        parsedEditedAttrValue,
        codeVersions
      );
    } else {
      mergedAttrValue = undefined;
    }
  } else {
    if (!parsedEditedAttrValue) {
      mergedAttrValue = serializePlasmicASTNode(
        parsedNewAttrValue,
        codeVersions
      );
    } else {
      // do merge, really!
      const asArray = (node: PlasmicASTNode | null | undefined) =>
        !node ? [] : node.type === "jsx-fragment" ? node.children : [node];
      const mergedNodes = mergeNodes(
        asArray(parsedNewAttrValue),
        asArray(parsedEditedAttrValue),
        asArray(parsedBaseAttrValue),
        codeVersions
      );
      // If edited forced wrapping single node with JSXFragment, so do we
      // if the result is a single element.
      const editedForcedFragment =
        parsedEditedAttrValue.type === "jsx-fragment" &&
        parsedEditedAttrValue.children.length === 1;
      mergedAttrValue =
        mergedNodes.length > 1
          ? mkJsxFragment(mergedNodes)
          : mergedNodes.length === 1
          ? editedForcedFragment
            ? mkJsxFragment(mergedNodes)
            : mergedNodes[0]
          : babel.types.jsxEmptyExpression();
    }
  }
  return wrapAsJsxAttrValue(mergedAttrValue);
};

const serializeNamedAttribute = (
  attrName: JSXIdentifier | JSXNamespacedName,
  rawValue: PlasmicASTNode | null | undefined,
  codeVersions: CodeVersions
) => {
  const attrValue = rawValue
    ? serializePlasmicASTNode(rawValue, codeVersions)
    : undefined;
  return babel.types.jsxAttribute(attrName, wrapAsJsxAttrValue(attrValue));
};

const serializeJsxSpreadAttribute = (
  editedAttr: PlasmicASTNode,
  newNodeHasPropsWithIdSpreador: boolean,
  nodeId: string,
  codeVersions: CodeVersions
) => {
  if (
    !newNodeHasPropsWithIdSpreador &&
    isCallWithoutArguments(editedAttr.rawNode, helperObject, `props${nodeId}`)
  ) {
    // delete the id spreador, if deleted from new version
    return undefined;
  }
  const attrValue = serializePlasmicASTNode(editedAttr, codeVersions);
  if (!attrValue || attrValue.type === "JSXEmptyExpression") {
    return undefined;
  }
  assert(attrValue.type !== "JSXText");
  assert(attrValue.type !== "JSXSpreadChild");
  if (babel.types.isExpression(attrValue)) {
    return babel.types.jsxSpreadAttribute(attrValue);
  } else if (attrValue.type === "JSXExpressionContainer") {
    return attrValue.expression.type === "JSXEmptyExpression"
      ? undefined
      : babel.types.jsxSpreadAttribute(attrValue.expression);
  }
};

const mergeAttributes = (
  newNode: PlasmicTagOrComponent,
  editedNode: PlasmicTagOrComponent,
  baseNode: PlasmicTagOrComponent,
  codeVersions: CodeVersions
) => {
  const { newVersion, editedVersion } = codeVersions;
  assert(editedNode.jsxElement.nameInId === newNode.jsxElement.nameInId);
  assert(editedNode.jsxElement.nameInId === baseNode.jsxElement.nameInId);

  const newNodePropsWithIdSpreador = newVersion.tryGetPropsIdSpreador(newNode);
  const editedHasPropsWithIdSpreador = editedVersion.hasPropsIdSpreador(
    editedNode
  );

  const newNamedAttrs = getRawNamedAttrs(newNode.jsxElement.rawNode);
  const editedNamedAttrs = getRawNamedAttrs(editedNode.jsxElement.rawNode);
  const baseNamedAttrs = getRawNamedAttrs(baseNode.jsxElement.rawNode);

  const conflictResolution = (
    name: string,
    baseAttr: JSXAttribute | undefined,
    editedAttr: JSXAttribute,
    newAttr: JSXAttribute
  ) => {
    // If attribute match, then emit either version is ok. Emitting it at the
    // place where the edited version emitted at is probably safer, and less
    // disturbing.
    if (nodesDeepEqualIgnoreComments(editedAttr, newAttr)) {
      return "emit-edited";
    }
    if (!baseAttr) {
      // We don't know how to handle the conflict. Merge them and let developer
      // handle it.
      return "emit-merged";
    }
    if (nodesDeepEqualIgnoreComments(baseAttr, editedAttr)) {
      // User didn't edit it. Emit the new version.
      return "emit-new";
    }
    if (
      name.startsWith("on") ||
      (name === "value" &&
        tagName(newNode.jsxElement.rawNode) === "PlasmicSlot") ||
      nodesDeepEqualIgnoreComments(baseAttr, newAttr)
    ) {
      // Plasmic doesn't change it. Emit the edited version then.
      return "emit-edited";
    }
    // Both Plasmic and developer edited it. Emit both.
    return "emit-merged";
  };

  const emitAttrInEditedNode = (attrName: string) => {
    const editedAttr = ensure(editedNamedAttrs.get(attrName));
    const newAttr = newNamedAttrs.get(attrName);
    const baseAttr = baseNamedAttrs.get(attrName);
    if (newAttr) {
      const res = conflictResolution(attrName, baseAttr, editedAttr, newAttr);
      if (res === "emit-new") {
        // We emit the newAttr in place to minimize diff.
        return newAttr;
      } else if (res === "emit-merged") {
        const value = mergeAttributeValue(
          attrName,
          newNode,
          editedNode,
          baseNode,
          codeVersions
        );
        return babel.types.jsxAttribute(newAttr.name, value);
      }
      assert(res === "emit-edited");
      return editedAttr;
    } else if (!baseAttr) {
      // user added attribute in edited version. Emit the edited attribute
      // without any transformation.
      return serializeNamedAttribute(
        editedAttr.name,
        findParsedNamedAttrs(editedNode, attrName),
        codeVersions
      );
    } else {
      // Attribute deleted in new version. However, user may have modified it.
      // Delete it only if there is no modification; otherwise, keep it for user
      // to fix the compilation failure.
      return nodesDeepEqualIgnoreComments(baseAttr, editedAttr)
        ? undefined
        : serializeNamedAttribute(
            editedAttr.name,
            findParsedNamedAttrs(editedNode, attrName),
            codeVersions
          );
    }
  };

  const mergedAttrs: Array<JSXAttribute | JSXSpreadAttribute> = [];

  newNamedAttrs.forEach((attr, name) => {
    const editedAttr = editedNamedAttrs.get(name);
    const baseAttr = baseNamedAttrs.get(name);
    if (!baseAttr && !editedAttr) {
      // newly added attribute in new version
      mergedAttrs.push(
        serializeNamedAttribute(
          attr.name,
          findParsedNamedAttrs(newNode, name),
          codeVersions
        )
      );
    }
  });

  for (const attrInEditedNode of editedNode.jsxElement.attrs) {
    if (L.isArray(attrInEditedNode)) {
      const toEmit = emitAttrInEditedNode(attrInEditedNode[0]);
      if (toEmit) {
        mergedAttrs.push(toEmit);
      }
    } else {
      const serializedSpreador = serializeJsxSpreadAttribute(
        attrInEditedNode,
        !!newNodePropsWithIdSpreador,
        newNode.jsxElement.nameInId,
        codeVersions
      );
      if (serializedSpreador) {
        mergedAttrs.push(serializedSpreador);
      }
    }
  }
  let classNameAt = mergedAttrs.findIndex(attr =>
    isAttribute(attr, "className")
  );
  // insert className if missing in edited version, mostly to support old code.
  if (classNameAt === -1) {
    const newClassNameAttr = newNamedAttrs.get("className");
    if (newClassNameAttr) {
      mergedAttrs.splice(0, 0, newClassNameAttr);
      classNameAt = 0;
    }
  }
  if (newNodePropsWithIdSpreador && !editedHasPropsWithIdSpreador) {
    // insert the new spreador right after className if any, always
    const insertSpreadorAt = classNameAt === -1 ? 0 : classNameAt + 1;
    mergedAttrs.splice(insertSpreadorAt, 0, newNodePropsWithIdSpreador);
  }

  return mergedAttrs;
};

type JsxChildType =
  | JSXText
  | JSXExpressionContainer
  | JSXSpreadChild
  | JSXElement
  | JSXFragment;

interface PerfectMatch {
  type: "perfect";
  index: number;
}

interface TypeMatch {
  type: "type";
  index: number;
}

interface NoMatch {
  type: "none";
}

type MatchResult = PerfectMatch | TypeMatch | NoMatch;

const findMatch = (
  nodes: PlasmicASTNode[],
  start: number,
  n: PlasmicASTNode
): MatchResult => {
  let matchingTypeAt = -1;
  if (n.type === "text" || n.type === "string-lit") {
    for (let i = start; i < nodes.length; i++) {
      const ni = nodes[i];
      if (ni.type === "text" || ni.type === "string-lit") {
        if (ni.value === n.value) {
          return { type: "perfect", index: i };
        }
        if (matchingTypeAt === -1) {
          matchingTypeAt = i;
        }
      }
    }
  } else if (n.type === "child-str-call") {
    for (let i = start; i < nodes.length; i++) {
      const ni = nodes[i];
      if (ni.type === "child-str-call") {
        return { type: "perfect", index: i };
      }
      if (matchingTypeAt === -1) {
        matchingTypeAt = i;
      }
    }
  } else if (n.type === "tag-or-component") {
    for (let i = start; i < nodes.length; i++) {
      const ni = nodes[i];
      if (
        ni.type === "tag-or-component" &&
        ni.jsxElement.nameInId === n.jsxElement.nameInId
      ) {
        return { type: "perfect", index: i };
      }
      if (matchingTypeAt === -1) {
        matchingTypeAt = i;
      }
    }
  }
  return matchingTypeAt !== -1
    ? { type: "type", index: matchingTypeAt }
    : { type: "none" };
};

const mergeNodes = (
  newNodes: PlasmicASTNode[],
  editedNodes: PlasmicASTNode[],
  baseNodes: PlasmicASTNode[],
  codeVersions: CodeVersions
) => {
  let nextInsertStartAt = 0;
  const insertEditedNodeIntoNew = (
    editedChild: PlasmicASTNode,
    prevEditedChild: PlasmicASTNode | undefined
  ) => {
    if (!prevEditedChild) {
      merged.splice(0, 0, editedChild);
      nextInsertStartAt = 1;
    } else {
      const prevMatch = findMatch(merged, nextInsertStartAt, prevEditedChild);
      if (prevMatch.type === "perfect" || prevMatch.type === "type") {
        // previous node matches merged[prevMatch]. insert current node at
        // prevMatch + 1.
        merged.splice(prevMatch.index + 1, 0, editedChild);
        nextInsertStartAt = prevMatch.index + 2;
      } else {
        merged.splice(nextInsertStartAt, 0, editedChild);
        nextInsertStartAt += 1;
      }
    }
  };

  // remove tag node from new nodes list when there is no perfect match.
  const merged = newNodes.filter(newNode => {
    if (newNode.type === "tag-or-component") {
      const matchInEditedVersion = findMatch(editedNodes, 0, newNode);
      const matchInBaseVersion = findMatch(baseNodes, 0, newNode);
      if (
        matchInBaseVersion.type === "perfect" &&
        matchInEditedVersion.type !== "perfect"
      ) {
        return false;
      }
    }
    return true;
  });

  editedNodes.forEach((editedChild, i) => {
    if (editedChild.type === "text" || editedChild.type === "string-lit") {
      const matchInNewVersion = findMatch(
        merged,
        nextInsertStartAt,
        editedChild
      );
      if (matchInNewVersion.type === "perfect") {
        // skip text node if it matches some text in new version. But make sure
        // subsequent nodes are inserted after the match.
        nextInsertStartAt = matchInNewVersion.index + 1;
        return;
      }
      const matchInBaseVersion = findMatch(baseNodes, 0, editedChild);
      if (matchInBaseVersion.type === "perfect") {
        // skip text node if it matches some text in base version
        return;
      }
      insertEditedNodeIntoNew(editedChild, editedNodes[i - 1]);
    } else if (editedChild.type === "opaque") {
      insertEditedNodeIntoNew(editedChild, editedNodes[i - 1]);
    }
  });

  return withoutNils(
    merged.map(c => {
      if (c.type === "opaque") {
        return c.rawNode as JsxChildType;
      }
      const n = serializeNonOpaquePlasmicASTNode(c, codeVersions);
      if (!n) {
        return undefined;
      }
      if (babel.types.isExpression(n)) {
        // need to wrap in expression container
        return n.type !== "JSXElement" && n.type !== "JSXFragment"
          ? babel.types.jsxExpressionContainer(n)
          : n;
      }
      return n;
    })
  );
};

const mergedChildren = (
  newNode: PlasmicTagOrComponent,
  editedNode: PlasmicTagOrComponent,
  baseNode: PlasmicTagOrComponent,
  codeVersions: CodeVersions
): Array<JsxChildType> => {
  return mergeNodes(
    newNode.jsxElement.children,
    editedNode.jsxElement.children,
    baseNode.jsxElement.children,
    codeVersions
  );
};

const makeJsxElementWithShowCall = (jsxElement: JSXElement, nodeId: string) =>
  babel.types.logicalExpression(
    "&&",
    makeCallExpression(helperObject, `show${nodeId}`),
    jsxElement
  );

const serializeTagOrComponent = (
  newNode: PlasmicTagOrComponent,
  codeVersions: CodeVersions
): Expression | JSXExpressionContainer | undefined => {
  const { newVersion, editedVersion, baseVersion } = codeVersions;

  // find node with same id in edited version.
  const editedNode = editedVersion.findTagOrComponent(
    newNode.jsxElement.nameInId
  );
  const baseNode = baseVersion.findTagOrComponent(newNode.jsxElement.nameInId);
  if (editedNode) {
    // the node must exist in base version.
    assert(!!baseNode);
    const editedNodeJsxElementClone = babel.types.cloneDeep(
      editedNode.jsxElement.rawNode
    );

    editedNodeJsxElementClone.openingElement.name = mergedTag(
      newNode,
      editedNode,
      baseNode
    );
    if (editedNodeJsxElementClone.closingElement) {
      editedNodeJsxElementClone.closingElement.name =
        editedNodeJsxElementClone.openingElement.name;
    }

    editedNodeJsxElementClone.openingElement.attributes = mergeAttributes(
      newNode,
      editedNode,
      baseNode,
      codeVersions
    );

    editedNodeJsxElementClone.children = mergedChildren(
      newNode,
      editedNode,
      baseNode,
      codeVersions
    );
    if (
      !editedNodeJsxElementClone.closingElement &&
      editedNodeJsxElementClone.children.length > 0
    ) {
      editedNodeJsxElementClone.closingElement = babel.types.jsxClosingElement(
        editedNodeJsxElementClone.openingElement.name
      );
      editedNodeJsxElementClone.openingElement.selfClosing = false;
    }

    const secondaryNodes = new Map<Node, Node | undefined>(
      editedNode.secondaryNodes.map(n => {
        const newSecondaryNode = newVersion.findTagOrComponent(
          n.jsxElement.nameInId
        );
        if (!newSecondaryNode) {
          return [n.rawNode, undefined];
        }
        const rawReplacement = serializePlasmicASTNode(
          newSecondaryNode,
          codeVersions
        );
        return [n.rawNode, rawReplacement];
      })
    );

    const newNodeCallShowFunc = newVersion.hasShowFuncCall(newNode);
    const editedNodeCallShowFunc = editedVersion.hasShowFuncCall(editedNode);

    const editedNodeClone = cloneDeepWithHook(editedNode.rawNode, (n: Node) => {
      if (n === editedNode.jsxElement.rawNode) {
        if (newNodeCallShowFunc && !editedNodeCallShowFunc) {
          // add the show call
          const expr = makeJsxElementWithShowCall(
            editedNodeJsxElementClone,
            editedNode.jsxElement.nameInId
          );
          // add an expression container if the parent is JSXElement or Fragment
          return editedNode.jsxElement.rawParent &&
            isJsxElementOrFragment(editedNode.jsxElement.rawParent)
            ? wrapInJsxExprContainer(expr)
            : expr;
        }
        return editedNodeJsxElementClone;
      }

      if (secondaryNodes.has(n)) {
        const replacement = secondaryNodes.get(n);
        // If deleted, an empty fragment instead
        return replacement || mkJsxFragment([]);
      }
      return undefined;
    });

    if (editedNodeCallShowFunc && !newNodeCallShowFunc) {
      traverse(editedNodeClone, {
        noScope: true,
        CallExpression: function(path) {
          if (
            isCallIgnoreArguments(
              path.node,
              helperObject,
              `show${editedNode.jsxElement.nameInId}`
            )
          ) {
            path.replaceWithSourceString("true");
          }
        }
      });
    }
    return editedNodeClone;
  }
  // check if the node has been deleted.
  if (baseNode) {
    // If so, don't output anything
    return undefined;
  }
  // This is new node. Just output self.
  const childrenReplacement = new Map<Node, Node>();
  newNode.jsxElement.children.forEach(child => {
    // Plasmic never emit opaque node.
    assert(child.type !== "opaque");
    const childReplacement = serializeNonOpaquePlasmicASTNode(
      child,
      codeVersions
    );
    if (childReplacement) {
      if (babel.types.isExpression(childReplacement)) {
        // need to wrap in expression container
        const maybeWrapped =
          childReplacement.type !== "JSXElement" &&
          childReplacement.type !== "JSXFragment"
            ? babel.types.jsxExpressionContainer(childReplacement)
            : childReplacement;
        childrenReplacement.set(child.rawNode, maybeWrapped);
      } else {
        childrenReplacement.set(child.rawNode, childReplacement);
      }
    }
  });
  // Attribute replacement
  const attrsReplacement = new Map<Node, Node>();
  newNode.jsxElement.attrs.forEach(attr => {
    if (L.isArray(attr)) {
      const [key, value] = attr;
      // className is an opaque attribute!
      if (value && value.type !== "opaque") {
        const attrReplacement = serializeNonOpaquePlasmicASTNode(
          value,
          codeVersions
        );
        if (attrReplacement) {
          if (attrReplacement.type !== "JSXExpressionContainer") {
            assert(attrReplacement.type !== "JSXText");
            attrsReplacement.set(
              value.rawNode,
              babel.types.jsxExpressionContainer(attrReplacement)
            );
          } else {
            attrsReplacement.set(value.rawNode, attrReplacement);
          }
        }
      }
    }
  });
  return cloneDeepWithHook(
    newNode.rawNode,
    (n: Node) => childrenReplacement.get(n) || attrsReplacement.get(n)
  );
};

const serializeNonOpaquePlasmicASTNode = (
  newNode: PlasmicASTNode,
  codeVersions: CodeVersions
): Expression | JSXExpressionContainer | JSXText | JSXFragment | undefined => {
  assert(newNode.type !== "opaque");
  if (newNode.type === "child-str-call") {
    // Just output the new version
    return newNode.rawNode;
  } else if (newNode.type === "string-lit") {
    // Just output the new version
    return newNode.rawNode;
  } else if (newNode.type === "text") {
    // Just output the new version
    return newNode.rawNode;
  } else if (newNode.type === "jsx-fragment") {
    return babel.types.jsxFragment(
      babel.types.jsxOpeningFragment(),
      babel.types.jsxClosingFragment(),
      withoutNils(
        newNode.children.map(child => {
          const newRawNode = serializePlasmicASTNode(child, codeVersions);
          if (!newRawNode) {
            return undefined;
          }
          if (
            babel.types.isExpression(newRawNode) ||
            babel.types.isJSXEmptyExpression(newRawNode)
          ) {
            return babel.types.jsxExpressionContainer(newRawNode);
          }
          return newRawNode;
        })
      )
    );
  } else {
    assert(newNode.type === "tag-or-component");
    return serializeTagOrComponent(newNode, codeVersions);
  }
};

interface CodeVersions {
  newVersion: CodeVersion;
  editedVersion: CodeVersion;
  baseVersion: CodeVersion;
}

const serializePlasmicASTNode = (
  newNode: PlasmicASTNode,
  codeVersions: CodeVersions
):
  | Expression
  | JSXEmptyExpression
  | JSXExpressionContainer
  | JSXSpreadChild
  | JSXFragment
  | JSXText
  | undefined => {
  if (newNode.type === "opaque") {
    return newNode.rawNode;
  }
  return serializeNonOpaquePlasmicASTNode(newNode, codeVersions);
};

export const renameAndSerializePlasmicASTNode = (
  newNode: PlasmicASTNode,
  codeVersions: CodeVersions
):
  | Expression
  | JSXEmptyExpression
  | JSXExpressionContainer
  | JSXSpreadChild
  | JSXFragment
  | JSXText
  | undefined => {
  if (newNode.type === "opaque") {
    return newNode.rawNode;
  }
  return serializeNonOpaquePlasmicASTNode(newNode, {
    baseVersion: codeVersions.baseVersion.renameJsxTree(
      codeVersions.newVersion
    ),
    editedVersion: codeVersions.editedVersion.renameJsxTree(
      codeVersions.newVersion
    ),
    newVersion: codeVersions.newVersion
  });
};

export class ComponentSkeletonModel {
  constructor(
    readonly uuid: string,
    readonly nameInIdToUuid: Map<string, string>,
    readonly fileContent: string
  ) {}

  toJSON() {
    return {
      uuid: this.uuid,
      nameInIdToUuid: [...this.nameInIdToUuid.entries()],
      fileContent: this.fileContent
    };
  }

  static fromJsObject(jsObj: any) {
    return new ComponentSkeletonModel(
      jsObj.uuid,
      new Map<string, string>(jsObj.nameInIdToUuid as Array<[string, string]>),
      jsObj.fileContent
    );
  }
}

export class ProjectSyncMetadataModel {
  constructor(readonly components: ComponentSkeletonModel[]) {}

  toJSON() {
    return this.components;
  }

  static fromJson(json: string) {
    const j = JSON.parse(json);
    assert(L.isArray(j));
    return new ProjectSyncMetadataModel(
      j.map(item => ComponentSkeletonModel.fromJsObject(item))
    );
  }
}

export const makeCachedProjectSyncDataProvider = (
  rawProvider: ProjectSyncDataProviderType
): ProjectSyncDataProviderType => {
  type Entry = {
    projectId: string;
    revision: number;
    model: ProjectSyncMetadataModel;
  };
  const cache: Array<Entry> = [];
  return async (projectId: string, revision: number) => {
    const cached = cache.find(
      ent => ent.projectId === projectId && ent.revision === revision
    );
    if (cached) {
      return cached.model;
    }
    const model = await rawProvider(projectId, revision);
    cache.push({ projectId, revision, model });
    return model;
  };
};

export type ProjectSyncDataProviderType = (
  projectId: string,
  revision: number
) => Promise<ProjectSyncMetadataModel>;

interface PlasmicComponentSkeletonFile {
  jsx: Expression;
  file: babel.types.File;
  revision: number;
  identifyingComment: Comment;
}

interface VersionedJsx {
  jsx: Expression;
  revision: number;
  identifyingComment: Comment;
}

const tryExtractPlasmicJsxExpression = (
  node: AssignmentExpression | ReturnStatement
): VersionedJsx | undefined => {
  for (const c of node.leadingComments || []) {
    const m = c.value.match(/^\s*plasmic-managed-jsx\/(\d+)\s*$/);
    if (m) {
      if (node.type === "AssignmentExpression") {
        return { jsx: node.right, identifyingComment: c, revision: +m[1] };
      } else {
        return {
          jsx: ensure(node.argument),
          identifyingComment: c,
          revision: +m[1]
        };
      }
    }
  }
  return undefined;
};

const tryParseComponentSkeletonFile = (
  fileContent: string
): PlasmicComponentSkeletonFile | undefined => {
  const file = parser.parse(fileContent, {
    strictMode: true,
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });
  let jsx: VersionedJsx | undefined = undefined;
  traverse(file, {
    noScope: true,
    AssignmentExpression: function(path) {
      jsx = tryExtractPlasmicJsxExpression(path.node);
      if (jsx) {
        path.stop();
      }
    },
    ReturnStatement: function(path) {
      jsx = tryExtractPlasmicJsxExpression(path.node);
      if (jsx) {
        path.stop();
      }
    }
  });
  // typescript treat jsx as never type... why?
  jsx = jsx as VersionedJsx | undefined;
  return jsx ? { ...jsx, file } : undefined;
};

export type PlasmicImportType =
  | "renderer"
  | "css"
  | "component"
  | "globalVariant"
  | "projectCss"
  | "defaultcss"
  | "icon"
  | undefined;

export const tryParsePlasmicImportSpec = (node: ImportDeclaration) => {
  const c = node.trailingComments?.[0];
  if (!c) {
    return undefined;
  }
  const m = c.value.match(
    /plasmic-import:\s+([\w-]+)(?:\/(component|css|render|globalVariant|projectcss|defaultcss|icon))?/
  );
  if (m) {
    return { id: m[1], type: m[2] as PlasmicImportType };
  }
  return undefined;
};

const compareImports = (
  import1: PlasmicImportSpec,
  import2: PlasmicImportSpec
) => {
  if (import1.id !== import2.id) {
    return import1.id < import2.id ? -1 : 1;
  }
  if (import1.type !== import2.type) {
    if (import1.type === undefined) {
      return -1;
    }
    if (import2.type === undefined) {
      return 1;
    }
    return import1.type < import2.type ? -1 : 1;
  }
  return 0;
};

// merge slave into master
const mergeImports = (i1: ImportDeclaration, i2: ImportDeclaration) => {
  const cloned = cloneDeep(i1);
  for (const s2 of i2.specifiers) {
    if (s2.type === "ImportDefaultSpecifier") {
      if (
        i1.specifiers.find(
          s1 =>
            s1.type === "ImportDefaultSpecifier" &&
            s1.local.name === s2.local.name
        )
      ) {
        continue;
      }
      cloned.specifiers.push(s2);
    } else if (s2.type === "ImportSpecifier") {
      if (
        i1.specifiers.find(
          s1 =>
            s1.type === "ImportSpecifier" &&
            s1.local.name === s2.local.name &&
            s1.imported.name === s2.imported.name
        )
      ) {
        continue;
      }
      cloned.specifiers.push(s2);
    } else {
      assert(s2.type === "ImportNamespaceSpecifier");
      // Plasmic doesn't generate namespace import statement.
      cloned.specifiers.push(s2);
    }
  }
  return cloned;
};

const mergePlasmicImports = (
  mergedFile: babel.types.File,
  parsedNew: PlasmicComponentSkeletonFile,
  parsedEdited: PlasmicComponentSkeletonFile
) => {
  const newImports = extractPlasmicImports(parsedNew.file);
  const editedImports = extractPlasmicImports(parsedEdited.file);

  let firstImport = -1;
  let firstPlasmicImport = -1;
  // Remove all imports that is being merged.
  mergedFile.program.body = mergedFile.program.body.filter((stmt, i) => {
    if (stmt.type === "ImportDeclaration") {
      if (firstImport === -1) {
        firstImport = i;
      }
      if (tryParsePlasmicImportSpec(stmt)) {
        if (firstPlasmicImport === -1) {
          firstPlasmicImport = i;
        }
        return false;
      }
    }
    return true;
  });
  // Remove leadingComments - babel parser assign each comment to two nodes.
  // One as a trailing comment of the node before the comment, and one as a
  // leading comment of the node after the comment. We remove the
  // leadingComments so that we don't generate the comments twice (one from
  // editedImports, and one from newImports).
  [...editedImports, ...newImports].forEach(
    importDecl => (importDecl.node.leadingComments = null)
  );
  const mergedImports: Array<ImportDeclaration> = [];
  for (const editedImport of editedImports) {
    const newImportAt = newImports.findIndex(
      newImport => compareImports(editedImport, newImport) === 0
    );
    if (newImportAt !== -1) {
      const newImport = newImports[newImportAt];
      newImports.splice(newImportAt, 1);
      mergedImports.push(mergeImports(editedImport.node, newImport.node));
    } else {
      mergedImports.push(editedImport.node);
    }
  }
  mergedImports.push(...newImports.map(x => x.node));
  const insertMergedImportsAt =
    firstPlasmicImport > -1
      ? firstPlasmicImport
      : firstImport > -1
      ? firstImport
      : 0;
  mergedFile.program.body.splice(insertMergedImportsAt, 0, ...mergedImports);
};

interface PlasmicImportSpec {
  id: string;
  type: PlasmicImportType;
  node: ImportDeclaration;
}

const extractPlasmicImports = (file: babel.types.File) => {
  const plasmicImports: Array<PlasmicImportSpec> = [];
  traverse(file, {
    ImportDeclaration: function(path) {
      const importSpec = tryParsePlasmicImportSpec(path.node);
      if (importSpec) {
        plasmicImports.push({ ...importSpec, node: path.node });
      }
      path.skip();
    }
  });
  return plasmicImports;
};

export type ComponentInfoForMerge = {
  // edited version of the code, i.e. the entire file.
  editedFile: string;
  newFile: string;
  // map for newCode
  newNameInIdToUuid: Map<string, string>;
};

export class WarningInfo {
  private _rawWarnings: string[] = [];
  private _secondaryNodes: PlasmicTagOrComponent[] = [];

  addRawWarn(msg: string) {
    this._rawWarnings.push(msg);
  }

  setSecondaryNodes(nodes: PlasmicTagOrComponent[]) {
    this._secondaryNodes.push(...nodes);
  }

  rawWarnings() {
    return this._rawWarnings;
  }
  secondaryNodes() {
    return this._secondaryNodes;
  }

  maybeWarn() {
    this._rawWarnings.forEach(m => console.warn(m));
    if (this._secondaryNodes.length > 0) {
      const nodes = this._secondaryNodes
        .map(n => n.jsxElement.nameInId)
        .join("\n\t");
      console.warn(
        `Plasmic perform limited merge to the following nodes since they are secondary nodes.\n${nodes}`
      );
    }
  }
}

export const mergeFiles = async (
  componentByUuid: Map<string, ComponentInfoForMerge>,
  projectId: string,
  projectSyncDataProvider: ProjectSyncDataProviderType,
  preMergeFile?: (
    compId: string,
    baseSrc: string,
    baseNameInIdToUuid: Map<string, string>,
    newSrc: string,
    newNameInIdToUuid: Map<string, string>
  ) => void,
  appendJsxTreeOnMissingBase?: boolean,
  // Output parameter, which is used to collect warning information
  warningInfos?: Map<string, WarningInfo>
) => {
  const updateableByComponentUuid = new Map<
    string,
    PlasmicComponentSkeletonFile
  >();
  componentByUuid.forEach((codeVersions, uuid) => {
    const parsedEdited = tryParseComponentSkeletonFile(codeVersions.editedFile);
    if (parsedEdited) {
      updateableByComponentUuid.set(uuid, parsedEdited);
    }
  });
  if (updateableByComponentUuid.size === 0) {
    // Nothing to update
    return undefined;
  }

  const mergedFiles = new Map<string, string>();

  for (const [componentUuid, parsedEdited] of updateableByComponentUuid) {
    const warnInfo = new WarningInfo();
    warningInfos?.set(componentUuid, warnInfo);
    let baseMetadata: ComponentSkeletonModel | undefined = undefined;
    try {
      const projectSyncData = await projectSyncDataProvider(
        projectId,
        parsedEdited.revision
      );
      baseMetadata = projectSyncData.components.find(
        c => c.uuid === componentUuid
      );
    } catch {
      warnInfo.addRawWarn(
        `missing merging base for ${projectId} at revision ${parsedEdited.revision}`
      );
    }
    const component = ensure(componentByUuid.get(componentUuid));
    const parsedNew = ensure(tryParseComponentSkeletonFile(component.newFile));

    if (!baseMetadata) {
      if (appendJsxTreeOnMissingBase) {
        mergedFiles.set(
          componentUuid,
          formatted(`${component.editedFile}

          // Please perform merge with the following JSX manually.
           \`// plasmic-managed-jsx/${parsedNew.revision}
  return (${code(parsedNew.jsx).trimEnd()});\``)
        );
        continue;
      } else {
        throw new Error(
          `Cannot perform three way merge due to missing base version. For Plasmic CLI users, please add '--append-jsx-on-missing-base' so that you can perform merging by yourselves.`
        );
      }
    }

    if (preMergeFile) {
      preMergeFile(
        componentUuid,
        baseMetadata.fileContent,
        baseMetadata.nameInIdToUuid,
        component.newFile,
        component.newNameInIdToUuid
      );
    }
    const parsedBase = ensure(
      tryParseComponentSkeletonFile(baseMetadata.fileContent)
    );
    const newCodeVersion = new CodeVersion(
      parsedNew.jsx,
      component.newNameInIdToUuid
    );
    const baseCodeVersion = new CodeVersion(
      parsedBase.jsx,
      baseMetadata.nameInIdToUuid
    );

    // All other metadata
    const editedCodeVersion = new CodeVersion(
      parsedEdited.jsx,
      // edited version share the same nameInIdtoUuid mapping
      baseMetadata.nameInIdToUuid
    );
    warnInfo.setSecondaryNodes([
      ...editedCodeVersion.secondaryTagsOrComponents.values()
    ]);

    const newJsx = renameAndSerializePlasmicASTNode(newCodeVersion.root, {
      newVersion: newCodeVersion,
      editedVersion: editedCodeVersion,
      baseVersion: baseCodeVersion
    });

    // Ideally, we should keep parsedEdited read-only, but, it is not a big deal
    // to modify the comment.
    parsedEdited.identifyingComment.value = ` plasmic-managed-jsx/${parsedNew.revision}`;
    const mergedFile = cloneDeepWithHook(parsedEdited.file, (n: Node) => {
      if (n === parsedEdited.jsx) {
        return newJsx;
      }
      return undefined;
    });
    mergePlasmicImports(mergedFile, parsedNew, parsedEdited);
    const mergedCode = code(mergedFile, { retainLines: true });
    mergedFiles.set(componentUuid, formatted(mergedCode));
  }
  return mergedFiles;
};
