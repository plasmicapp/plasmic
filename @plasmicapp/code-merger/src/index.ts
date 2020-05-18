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
  ImportDeclaration,
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
  wrapInJsxExprContainer,
  PlasmicArgRef,
} from "./plasmic-ast";
import {
  CodeVersion,
  helperObject,
  isInHtmlContext,
  calleeMatch,
  memberExpressionMatch,
  makeMemberExpression,
} from "./plasmic-parser";
import { nodesDeepEqualIgnoreComments, code } from "./utils";
import { first } from "lodash";

const getNamedAttrs = (jsxElement: JSXElement) => {
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

const findAttrValueNode = (name: string, jsxElement: PlasmicJsxElement) => {
  for (const attr of jsxElement.attrs) {
    if (L.isString(attr)) {
      continue;
    }
    if (attr[0] === name) {
      return attr[1];
    }
  }
  return undefined;
};

const mergeAttributes = (
  newNode: PlasmicTagOrComponent,
  editedNode: PlasmicTagOrComponent,
  baseNode: PlasmicTagOrComponent,
  newVersion: CodeVersion,
  editedVersion: CodeVersion,
  baseVersion: CodeVersion
) => {
  const editedNodeId = editedNode.jsxElement.nameInId;
  const newNodeId = newNode.jsxElement.nameInId;

  const newNodeHasClassNameAttr = newVersion.hasClassNameIdAttr(newNode);
  const newNodeHasPropsWithIdSpreador = newVersion.hasPropsIdSpreador(newNode);
  // Only one of newNodeHasClassNameAttr and newNodeHasPropsWithIdSpreador is
  // true
  assert(newNodeHasPropsWithIdSpreador !== newNodeHasClassNameAttr);
  const newNamedAttrs = getNamedAttrs(newNode.jsxElement.rawNode);
  const editedNamedAttrs = getNamedAttrs(editedNode.jsxElement.rawNode);
  const baseNamedAttrs = getNamedAttrs(baseNode.jsxElement.rawNode);

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
      // We don't know how to handle the conflict. Emit both and let developer
      // handle it.
      return "emit-both";
    }
    if (nodesDeepEqualIgnoreComments(baseAttr, editedAttr)) {
      // User didn't edit it. Emit the new version.
      return "emit-new";
    }
    if (
      name.startsWith("on") ||
      nodesDeepEqualIgnoreComments(baseAttr, newAttr)
    ) {
      // Plasmic doesn't change it. Emit the edited version then.
      // Note that we specialize "onXXX" to account of id change.
      return "emit-edited";
    }
    // Both Plasmic and developer edited it. Emit both.
    // TODO: for event handler, maybe emit edited version, but replace the
    // identifier?
    return "emit-both";
  };

  // Return new attributes in newNode to be inserted.
  const newAttrsBeforeIdNode = () => {
    const newAttrs: Array<JSXAttribute> = [];
    newNamedAttrs.forEach((attr, name) => {
      if (name === "className") {
        // skip the id attribute
        return;
      }
      const editedAttr = editedNamedAttrs.get(name);
      const baseAttr = baseNamedAttrs.get(name);
      if (editedAttr) {
        const res = conflictResolution(name, baseAttr, editedAttr, attr);
        if (res === "emit-both" || res === "emit-new") {
          newAttrs.push(attr);
        }
      } else if (!baseAttr) {
        // newly added attribute in new version
        const attrValueNode = ensure(
          findAttrValueNode(name, newNode.jsxElement)
        );
        assert(attrValueNode.rawNode.type === "JSXExpressionContainer");
        const mergedNewValue = ensure(
          serializePlasmicASTNode(
            attrValueNode,
            newVersion,
            editedVersion,
            baseVersion
          )
        );
        assert(mergedNewValue.type === "JSXExpressionContainer");
        newAttrs.push(babel.types.jsxAttribute(attr.name, mergedNewValue));
      } else {
        // developer deleted the attribute. Keep it deleted - this is likely
        // due to developer doing some refactoring of the component.
        // TODO: only keep it deleted if there is no change to to the attribute
      }
    });
    return newAttrs;
  };

  const emitAttrInEditedNode = (name: string, editedAttr: JSXAttribute) => {
    const newAttr = newNamedAttrs.get(name);
    const baseAttr = baseNamedAttrs.get(name);
    if (newAttr) {
      const res = conflictResolution(name, baseAttr, editedAttr, newAttr);
      if (!(res === "emit-both" || res === "emit-edited")) {
        return undefined;
      }
      // Upgrade id in edited version for event handler
      if (name.startsWith("on") && editedNodeId !== newNodeId) {
        const eventNameInId = name.substring(2);
        return cloneDeepWithHook(editedAttr, (n: Node) => {
          if (
            memberExpressionMatch(
              n,
              helperObject,
              `on${editedNodeId}${eventNameInId}`
            )
          ) {
            return makeMemberExpression(
              helperObject,
              `on${newNodeId}${eventNameInId}`
            );
          }
          return undefined;
        });
      }
      return editedAttr;
    } else if (!baseAttr) {
      // user added attribute in edited version. Emit the edited attribute
      // without any transformation.
      return editedAttr;
    } else {
      // Attribute deleted in new version. However, user may have modified it.
      // For now, just delete it.
      // TODO: if user has modified it, leave it but add some comment; if user
      // has not modified it, delete it.
      return undefined;
    }
  };

  const mergedAttrs: Array<
    JSXAttribute | JSXSpreadAttribute
  > = newAttrsBeforeIdNode();

  for (const attrInEditedNode of editedNode.jsxElement.rawNode.openingElement
    .attributes) {
    if (attrInEditedNode.type === "JSXSpreadAttribute") {
      const arg = attrInEditedNode.argument;
      if (
        arg.type === "CallExpression" &&
        calleeMatch(arg.callee, helperObject, `props${editedNodeId}`)
      ) {
        assert(arg.callee.type === "MemberExpression");
        if (newNodeHasPropsWithIdSpreador) {
          // Keep the id as props but using new node id.
          mergedAttrs.push(
            cloneDeepWithHook(attrInEditedNode, (n) => {
              if (n === arg.callee) {
                const cloned = babel.types.clone(arg.callee);
                (cloned as MemberExpression).property.name = `props${newNodeId}`;
                return cloned;
              }
              return undefined;
            })
          );
        } else {
          const newAttr = babel.types.jsxAttribute(
            babel.types.jsxIdentifier("className"),
            babel.types.jsxExpressionContainer(
              makeCallExpression(helperObject, `cls${newNodeId}`)
            )
          );
          if (arg.arguments.length === 0) {
            // Downgrade to "className={rh.clsXXX()}".
            mergedAttrs.push(newAttr);
          } else {
            // insert "className={rh.clsXXX()}" - the old "rh.propsXXX" call
            // should lead to compilation failrue for developer to fix.
            mergedAttrs.push(newAttr, attrInEditedNode);
          }
        }
      } else {
        mergedAttrs.push(attrInEditedNode);
      }
      continue;
    }
    const attrName =
      attrInEditedNode.name.type === "JSXIdentifier"
        ? attrInEditedNode.name.name
        : attrInEditedNode.name.name.name;
    if (
      attrName === "className" &&
      attrInEditedNode.value?.type === "JSXExpressionContainer"
    ) {
      const expr = attrInEditedNode.value.expression;
      if (
        expr.type === "CallExpression" &&
        calleeMatch(expr.callee, helperObject, `cls${editedNodeId}`)
      ) {
        assert(expr.callee.type === "MemberExpression");
        if (newNodeHasPropsWithIdSpreador) {
          // Upgrade to {...propsXXX()}.
          const newAttr = babel.types.jsxSpreadAttribute(
            makeCallExpression(helperObject, `props${newNodeId}`)
          );
          mergedAttrs.push(newAttr);
        } else {
          // Keep it as className, but using the new id.
          const newAttr = babel.types.jsxAttribute(
            babel.types.jsxIdentifier("className"),
            babel.types.jsxExpressionContainer(
              makeCallExpression(helperObject, `cls${newNodeId}`)
            )
          );
          mergedAttrs.push(newAttr);
        }
        continue;
      }
    }
    const toEmit = emitAttrInEditedNode(attrName, attrInEditedNode);
    if (toEmit) {
      mergedAttrs.push(toEmit);
    }
  }
  return mergedAttrs;
};

type JsxChildType =
  | JSXText
  | JSXExpressionContainer
  | JSXSpreadChild
  | JSXElement
  | JSXFragment;

const mergedChildren = (
  newNode: PlasmicTagOrComponent,
  editedNode: PlasmicTagOrComponent,
  baseNode: PlasmicTagOrComponent,
  newVersion: CodeVersion,
  editedVersion: CodeVersion,
  baseVersion: CodeVersion
): Array<JsxChildType> => {
  // Just emit children from new node while preserving edits to named
  // JSXElement.
  //
  // Edit to text should probably be reflected in Plasmic, i.e. it is ok
  // to not support auto-merging of user editing "Hello" to "Hello World".
  //
  // TODO: support better merging of children?
  return withoutNils(
    newNode.jsxElement.children.map((c) => {
      if (c.type === "opaque") {
        return c.rawNode as JsxChildType;
      }
      const n = serializeNonOpaquePlasmicASTNode(
        c,
        newVersion,
        editedVersion,
        baseVersion
      );
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

const makeJsxElementWithShowCall = (jsxElement: JSXElement, nodeId: string) =>
  babel.types.logicalExpression(
    "&&",
    makeCallExpression(helperObject, `show${nodeId}`),
    jsxElement
  );

const mergeShowFunc = (
  newNode: PlasmicTagOrComponent,
  editedNode: PlasmicTagOrComponent,
  newVersion: CodeVersion,
  editedVersion: CodeVersion,
  editedNodeClone: Expression | JSXExpressionContainer
) => {
  const editedNodeId = editedNode.jsxElement.nameInId;
  const newNodeId = newNode.jsxElement.nameInId;
  const newNodeCallShowFunc = newVersion.hasShowFuncCall(newNode);
  let replacedShowCall = false;
  traverse(editedNodeClone, {
    noScope: true,
    CallExpression: function (path) {
      const call = path.node;
      if (calleeMatch(call.callee, helperObject, `show${editedNodeId}`)) {
        if (newNodeCallShowFunc) {
          assert(call.callee.type === "MemberExpression");
          call.callee.property = babel.types.identifier(`show${newNodeId}`);
        } else {
          path.replaceWithSourceString("true");
        }
        replacedShowCall = true;
        path.skip();
      }
    },
  });
  if (newNodeCallShowFunc && !replacedShowCall) {
    // add the show call, using the new node id!
    if (editedNode.rawNode === editedNode.jsxElement.rawNode) {
      assert(editedNodeClone.type === "JSXElement");
      return makeJsxElementWithShowCall(editedNodeClone, newNodeId);
    } else {
      traverse(editedNodeClone, {
        noScope: true,
        JSXElement: function (path) {
          // We have to use location to identify the node since they point to
          // different AST structure - one point to the editedNode.rawNode, and
          // the other point to editedNodeClone.
          if (path.node.start === editedNode.jsxElement.rawNode.start) {
            const inHtmlContext = isInHtmlContext(path);
            const expr = makeJsxElementWithShowCall(path.node, newNodeId);
            // we are converting JSXElement to an expression. So maybe we need
            // a JSXExpressionContainer.
            path.replaceWith(
              inHtmlContext ? wrapInJsxExprContainer(expr) : expr
            );
            path.stop();
          }
        },
      });
    }
  }
  return editedNodeClone;
};

const serializeTagOrComponent = (
  newNode: PlasmicTagOrComponent,
  newVersion: CodeVersion,
  editedVersion: CodeVersion,
  baseVersion: CodeVersion
): Expression | JSXExpressionContainer | undefined => {
  const nodeId = newVersion.getId(newNode);
  // find node with same id in edited version.
  const editedNode = editedVersion.findNode(nodeId);
  const baseNode = baseVersion.findNode(nodeId);
  if (editedNode) {
    // the node must exist in base versio.
    assert(!!baseNode);
    const editedNodeJsxElementClone = babel.types.cloneDeep(
      editedNode.jsxElement.rawNode
    );

    editedNodeJsxElementClone.openingElement.attributes = mergeAttributes(
      newNode,
      editedNode,
      baseNode,
      newVersion,
      editedVersion,
      baseVersion
    );

    editedNodeJsxElementClone.children = mergedChildren(
      newNode,
      editedNode,
      baseNode,
      newVersion,
      editedVersion,
      baseVersion
    );
    if (
      !editedNodeJsxElementClone.closingElement &&
      editedNodeJsxElementClone.children.length > 0
    ) {
      editedNodeJsxElementClone.closingElement = babel.types.jsxClosingElement(
        editedNodeJsxElementClone.openingElement.name
      );
    }

    const editNodeClone = cloneDeepWithHook(editedNode.rawNode, (n: Node) => {
      if (n === editedNode.jsxElement.rawNode) {
        return editedNodeJsxElementClone;
      }
      return undefined;
    });

    return mergeShowFunc(
      newNode,
      editedNode,
      newVersion,
      editedVersion,
      editNodeClone
    );
  }
  // check if the node has been deleted.
  if (baseNode) {
    // If so, don't output anything
    return undefined;
  }
  // This is new node. Just output self.
  return newNode.rawNode;
};

const serializeNonOpaquePlasmicASTNode = (
  newNode: PlasmicASTNode,
  newVersion: CodeVersion,
  editedVersion: CodeVersion,
  baseVersion: CodeVersion
): Expression | JSXExpressionContainer | JSXText | undefined => {
  assert(newNode.type !== "opaque");
  if (newNode.type === "arg") {
    const nodesToMerged = new Map<Node, Node>();
    newNode.jsxNodes.forEach((n) => {
      const rawMerged = serializeTagOrComponent(
        n,
        newVersion,
        editedVersion,
        baseVersion
      );
      nodesToMerged.set(
        n.rawNode,
        rawMerged ||
          (n.rawNode.type === "JSXExpressionContainer"
            ? babel.types.jsxExpressionContainer(babel.types.nullLiteral())
            : babel.types.nullLiteral())
      );
    });
    return cloneDeepWithHook(newNode.rawNode, (n: Node) =>
      nodesToMerged.get(n)
    );
  } else if (newNode.type === "cond-str-call") {
    // Just output the new version
    return newNode.rawNode;
  } else if (newNode.type === "string-lit") {
    // Just output the new version
    return newNode.rawNode;
  } else if (newNode.type === "text") {
    // Just output the new version
    return newNode.rawNode;
  } else {
    assert(newNode.type === "tag-or-component");
    return serializeTagOrComponent(
      newNode,
      newVersion,
      editedVersion,
      baseVersion
    );
  }
};

export const serializePlasmicASTNode = (
  newNode: PlasmicASTNode,
  newVersion: CodeVersion,
  editedVersion: CodeVersion,
  baseVersion: CodeVersion
): Node | undefined => {
  if (newNode.type === "opaque") {
    return newNode.rawNode;
  }
  return serializeNonOpaquePlasmicASTNode(
    newNode,
    newVersion,
    editedVersion,
    baseVersion
  );
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
      fileContent: this.fileContent,
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
      j.map((item) => ComponentSkeletonModel.fromJsObject(item))
    );
  }
}

export type ProjectSyncDataProviderType = (
  projectId: string,
  revision: number
) => Promise<ProjectSyncMetadataModel>;

export type ProjectSyncDataProviderClosureType = () => Promise<
  ProjectSyncMetadataModel
>;

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
          revision: +m[1],
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
    strictMode: false,
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  let jsx: VersionedJsx | undefined = undefined;
  traverse(file, {
    noScope: true,
    AssignmentExpression: function (path) {
      jsx = tryExtractPlasmicJsxExpression(path.node);
      if (jsx) {
        path.stop();
      }
    },
    ReturnStatement: function (path) {
      jsx = tryExtractPlasmicJsxExpression(path.node);
      if (jsx) {
        path.stop();
      }
    },
  });
  // typescript treat jsx as never type... why?
  jsx = jsx as VersionedJsx | undefined;
  return jsx ? { ...jsx, file } : undefined;
};

type PlasmicImportType =
  | "renderer"
  | "css"
  | "component"
  | "globalVariant"
  | "projectCss"
  | "defaultcss"
  | undefined;

const tryParsePlasmicImportSpec = (node: ImportDeclaration) => {
  const c = ensure(node.trailingComments?.[0]);
  const m = c.value.match(
    /plasmic-import:\s+([\w-]+)(?:\/(component|css|render|globalVariant|projectcss|defaultcss))?/
  );
  if (m) {
    return { id: m[1], type: m[2] as PlasmicImportType };
  }
  return undefined;
};

const mergePlasmicImports = (
  mergedFile: babel.types.File,
  parsedNew: PlasmicComponentSkeletonFile,
  parsedEdited: PlasmicComponentSkeletonFile
) => {
  const newImports = extractPlasmicImports(parsedNew.file);
  const editedImports = extractPlasmicImports(parsedEdited.file);
  const editedImportDecls = new Set(editedImports.map((i) => i.node));

  let firstImport = -1;
  let firstPlasmicImport = -1;
  mergedFile.program.body = mergedFile.program.body.filter((stmt, i) => {
    if (stmt.type === "ImportDeclaration") {
      if (firstImport === -1) {
        firstImport = i;
      }
      if (editedImportDecls.has(stmt) && firstPlasmicImport === -1) {
        firstPlasmicImport = i;
      }
    }
  });
  // TODO: perform the merge!
  const mergedImports: Array<ImportDeclaration> = [];
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
    ImportDeclaration: function (path) {
      const importSpec = tryParsePlasmicImportSpec(path.node);
      if (importSpec) {
        plasmicImports.push({ ...importSpec, node: path.node });
      }
      path.skip();
    },
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

export const mergeFiles = async (
  componentByUuid: Map<string, ComponentInfoForMerge>,
  expectedRevision: number,
  projectSyncDataProvider: ProjectSyncDataProviderClosureType
) => {
  const updateableByComponentUuid = new Map<
    string,
    PlasmicComponentSkeletonFile
  >();
  componentByUuid.forEach((codeVersions, uuid) => {
    const parsedEdited = tryParseComponentSkeletonFile(codeVersions.editedFile);
    if (parsedEdited) {
      assert(parsedEdited.revision === expectedRevision);
      updateableByComponentUuid.set(uuid, parsedEdited);
    }
  });
  if (updateableByComponentUuid.size === 0) {
    // Nothing to update
    return;
  }
  const projectSyncData = await projectSyncDataProvider();
  const mergedFiles: [string, string][] = [
    ...updateableByComponentUuid.entries(),
  ].map(([componentUuid, parsedEdited]) => {
    const baseMetadata = ensure(
      projectSyncData.components.find((c) => c.uuid === componentUuid)
    );
    const parsedBase = ensure(
      tryParseComponentSkeletonFile(baseMetadata.fileContent)
    );
    const baseCodeVersion = new CodeVersion(
      baseMetadata.fileContent,
      baseMetadata.nameInIdToUuid,
      parsedBase.jsx
    );

    // All other metadata
    const component = ensure(componentByUuid.get(componentUuid));
    const editedCodeVersion = new CodeVersion(
      component.editedFile,
      // edited version share the same nameInIdtoUuid mapping
      baseMetadata.nameInIdToUuid,
      parsedEdited.jsx
    );
    const parsedNew = ensure(tryParseComponentSkeletonFile(component.newFile));
    const newCodeVersion = new CodeVersion(
      component.newFile,
      component.newNameInIdToUuid,
      parsedNew.jsx
    );
    const newJsx = serializePlasmicASTNode(
      newCodeVersion.root,
      newCodeVersion,
      editedCodeVersion,
      baseCodeVersion
    );

    // Ideally, we should keep parsedEdited read-only, but, it is not a big deal
    // to modify the comment.
    parsedEdited.identifyingComment.value = ` plasmic-managed-jsx/${parsedNew.revision}`;
    const mergedFile = cloneDeepWithHook(parsedEdited.file, (n: Node) => {
      if (n === parsedEdited.jsx) {
        return newJsx;
      }
      return undefined;
    });
    // mergePlasmicImports(mergedFile, parsedNew, parsedEdited);
    return [componentUuid, code(mergedFile, { retainLines: true })];
  });
  return new Map<string, string>(mergedFiles);
};
