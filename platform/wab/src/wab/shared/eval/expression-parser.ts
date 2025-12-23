import {
  jsLiteral,
  makeShortProjectId,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  arrayEq,
  filterFalsy,
  unexpected,
  xDifference,
  xUnion,
} from "@/wab/shared/common";
import {
  asCode,
  isCodeWrappedWithParens,
  isRealCodeExpr,
} from "@/wab/shared/core/exprs";
import {
  findDepNameByShortProjectId,
  findShortProjectIdByDepName,
} from "@/wab/shared/core/site-data-tokens";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ENABLED_GLOBALS } from "@/wab/shared/eval";
import {
  CustomCode,
  Expr,
  ObjectPath,
  Site,
  TemplatedString,
  isKnownCustomCode,
  isKnownExpr,
  isKnownFunctionExpr,
  isKnownObjectPath,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
import {
  isBlockScope,
  isScope,
  parseJsCode,
  wrapJavaScriptCodeInParens,
  writeJs,
} from "@/wab/shared/parser-utils";
import { isValidJsIdentifier } from "@/wab/shared/utils/regex-js-identifier";
import { Visitors, ancestor as traverse } from "acorn-walk";
import type * as ast from "estree";

const DOLLAR_VARS = [
  "$ctx",
  "$props",
  "$queries",
  "$state",
  "$steps",
  "$dataTokens",
  "$$",
] as const;

export type DollarVar = (typeof DOLLAR_VARS)[number];

function isDollarVar(name: any): name is DollarVar {
  return name && DOLLAR_VARS.includes(name);
}

export class EvaluationError extends Error {
  constructor(msg?: string) {
    super(msg);
  }
}

export type ParsedExprInfo = {
  /**
   * Whether dollar vars are used; e.g. if an expression is `$ctx + $props.foo`
   * this should contain {$ctx: true, $props: true}.
   */
  usesDollarVars: Record<DollarVar, boolean>;
  /**
   * Whether unknown dollar var keys are used; e.g. if an expression is
   * `$ctx + $state[$props.bar]` this should contain {$state: true}.
   */
  usesUnknownDollarVarKeys: Record<DollarVar, boolean>;
  /**
   * Used dollar var keys; e.g. if an expression uses $ctx.foo and $state.bar
   * this should contain {$ctx: "foo", $state: "bar"}.
   */
  usedDollarVarKeys: Record<DollarVar, Set<string>>;
  /**
   * Used free variables (not included in dollar vars), usually coming from
   * dataReps.
   */
  usedFreeVars: Set<string>;
};

export function emptyParsedExprInfo(): ParsedExprInfo {
  return {
    usesDollarVars: Object.fromEntries(
      DOLLAR_VARS.map((key) => [key, false])
    ) as Record<DollarVar, boolean>,
    usesUnknownDollarVarKeys: Object.fromEntries(
      DOLLAR_VARS.map((key) => [key, false])
    ) as Record<DollarVar, boolean>,
    usedDollarVarKeys: Object.fromEntries(
      DOLLAR_VARS.map((key) => [key, new Set<string>()])
    ) as Record<DollarVar, Set<string>>,
    usedFreeVars: new Set<string>(),
  };
}

/**
 * Receives a member expression like `a.b`, `a["b"]`, `a[b]`. Returns property
 * key if it's possible to get it without evaluating expressions (e.g. returns
 * returns "b" if given expression is `a.b` or `a["b"]`) or undefined if it's
 * not possible to get it without performing evaluations (e.g. returns
 * undefined if given expression is `a[b]`).
 */
function getMemberExpressionKey(
  node: ast.MemberExpression
): string | undefined {
  if (!node.computed && node.property.type === "Identifier") {
    // This is an expression like `obj.name`.
    return node.property.name;
  } else if (
    node.computed &&
    node.property.type === "Literal" &&
    (typeof node.property.value === "string" ||
      typeof node.property.value === "number")
  ) {
    // This is an expression like `obj["value"]`.
    return `${node.property.value}`;
  }

  // Expression might be acessing `obj[variable]`. Since we don't want to
  // evaluate `variable`, we just acknowledge that it is using an unknown
  // prop, returning undefined.
  return undefined;
}

/**
 * Given a member expression like $state.a["b"][c] this function returns
 * it parsed as: `["$state", "a", "b", undefined]` (note `c` is undefined
 * because it's an unknown variable).
 */
function parseMemberExpression(
  node: ast.MemberExpression
): Array<string | undefined> {
  const right = getMemberExpressionKey(node);
  if (node.object.type === "Identifier") {
    return [node.object.name, right];
  } else if (node.object.type === "MemberExpression") {
    return [...parseMemberExpression(node.object), right];
  } else {
    return [undefined, right];
  }
}

/**
 * This function parses a code expression to find usages of `$ctx`, `$props`
 * and `$state`. At the moment it supports usages such as `$props.name` and
 * `$props["string"]`. Usages like `const { destructured } = $props` are not
 * supported.
 *
 * It returns a ParsedExprInfo. See its docstring for more information.
 */

interface ParseCodeExpressionOptions {
  // Ignore values in ENABLED_GLOBALS
  disableGlobals?: string[];
}

export function parseCodeExpression(
  code: string,
  options?: ParseCodeExpressionOptions
): ParsedExprInfo {
  code = wrapJavaScriptCodeInParens(code);

  type WithLocals<T extends ast.Node> = T & {
    locals?: Record<string, boolean>;
  };

  const enabledGlobals = options?.disableGlobals
    ? xDifference(ENABLED_GLOBALS, options.disableGlobals)
    : ENABLED_GLOBALS;

  // Based on https://github.com/ForbesLindesay/acorn-globals/blob/master/index.js
  const ast: WithLocals<ast.Program> = parseCode(code);
  const info = emptyParsedExprInfo();

  const declaresArguments = (node: ast.Node) =>
    node.type === "FunctionExpression" || node.type === "FunctionDeclaration";

  const declareFunction = (node: WithLocals<ast.Function>) => {
    node.locals = node.locals ?? {};
    node.params.forEach((child) => {
      declarePattern(child, node);
    });
    if (node.type !== "ArrowFunctionExpression" && node.id) {
      node.locals[node.id.name] = true;
    }
  };
  const declareClass = (node: WithLocals<ast.Class>) => {
    node.locals = node.locals ?? {};
    if (node.id) {
      node.locals[node.id.name] = true;
    }
  };
  const declarePattern = (node: ast.Pattern, parent: WithLocals<ast.Node>) => {
    switch (node.type) {
      case "Identifier":
        parent.locals = parent.locals ?? {};
        parent.locals[node.name] = true;
        break;
      case "ObjectPattern":
        node.properties.forEach((prop) => {
          declarePattern(
            prop.type === "Property" ? prop.value : prop.argument,
            parent
          );
        });
        break;
      case "ArrayPattern":
        node.elements.forEach((elt) => {
          if (elt) {
            declarePattern(elt, parent);
          }
        });
        break;
      case "RestElement":
        declarePattern(node.argument, parent);
        break;
      case "AssignmentPattern":
        declarePattern(node.left, parent);
        break;
      default:
        unexpected(node.type);
    }
  };
  const declareModuleSpecifier = (node) => {
    ast.locals = ast.locals || {};
    ast.locals[node.local.name] = true;
  };
  traverse(ast, {
    VariableDeclaration: (node, parents) => {
      let maybeParent: WithLocals<ast.Node> | null = null;
      for (let i = parents.length - 1; i >= 0 && maybeParent === null; i--) {
        if (
          node.kind === "var" ? isScope(parents[i]) : isBlockScope(parents[i])
        ) {
          maybeParent = parents[i];
        }
      }
      if (!maybeParent) {
        return;
      }
      const parent = maybeParent;
      parent.locals = parent.locals || {};
      node.declarations.forEach(function (declaration) {
        declarePattern(declaration.id, parent);
      });
    },
    FunctionDeclaration: (node, parents) => {
      let maybeParent: WithLocals<ast.Node> | null = null;
      for (let i = parents.length - 2; i >= 0 && maybeParent === null; i--) {
        if (isScope(parents[i])) {
          maybeParent = parents[i];
        }
      }
      if (!maybeParent) {
        return;
      }
      const parent = maybeParent;
      parent.locals = parent.locals || {};
      if (node.id) {
        parent.locals[node.id.name] = true;
      }
      declareFunction(node);
    },
    Function: declareFunction,
    ClassDeclaration: (node, parents) => {
      let maybeParent: WithLocals<ast.Node> | null = null;
      for (let i = parents.length - 2; i >= 0 && maybeParent === null; i--) {
        if (isBlockScope(parents[i])) {
          maybeParent = parents[i];
        }
      }
      if (!maybeParent) {
        return;
      }
      const parent = maybeParent;
      parent.locals = parent.locals || {};
      if (node.id) {
        parent.locals[node.id.name] = true;
      }
      declareClass(node);
    },
    Class: declareClass,
    TryStatement: (node) => {
      if (node.handler == null || node.handler.param === null) {
        return;
      }
      const handler: WithLocals<ast.CatchClause> = node.handler;
      handler.locals = handler.locals || {};
      declarePattern(node.handler.param, node.handler);
    },
    ImportDefaultSpecifier: declareModuleSpecifier,
    ImportSpecifier: declareModuleSpecifier,
    ImportNamespaceSpecifier: declareModuleSpecifier,
  });
  const identifier = (
    node: ast.Identifier,
    parents: WithLocals<ast.Node>[]
  ) => {
    const name = node.name;
    if (name === "undefined") {
      return;
    }
    for (const parent of parents) {
      if (name === "arguments" && declaresArguments(parent)) {
        return;
      }
      if (parent.locals && name in parent.locals) {
        return;
      }
    }
    if (isDollarVar(name)) {
      info.usesDollarVars[name] = true;
    } else if (!enabledGlobals.has(name)) {
      info.usedFreeVars.add(name);
    }
  };
  traverse(ast, {
    MemberExpression: (node, parents: WithLocals<ast.Node>[]) => {
      let parts = parseMemberExpression(node);
      const firstUndefinedIdx = parts.findIndex((part) => part === undefined);
      if (firstUndefinedIdx !== -1) {
        parts = parts.slice(0, firstUndefinedIdx);
      }

      if (parts[0]) {
        for (const parent of parents) {
          if (parts[0] === "arguments" && declaresArguments(parent)) {
            return;
          }
          if (parent.locals && parts[0] in parent.locals) {
            return;
          }
        }

        if (isDollarVar(parts[0])) {
          info.usesDollarVars[parts[0]] = true;
          if (parts[1]) {
            if (parts[0] === "$state") {
              info.usedDollarVarKeys[parts[0]].add(parts.slice(1).join("."));
            } else {
              info.usedDollarVarKeys[parts[0]].add(parts[1]);
            }
          } else {
            info.usesUnknownDollarVarKeys[parts[0]] = true;
          }
        } else {
          info.usedFreeVars.add(parts[0]);
        }
      }
    },
    VariablePattern: identifier,
    Identifier: identifier,
    ThisExpression: function (_node, parents) {
      for (let i = 0; i < parents.length; i++) {
        const parent = parents[i];
        if (
          parent.type === "FunctionExpression" ||
          parent.type === "FunctionDeclaration"
        ) {
          return;
        }
        if (
          parent.type === ("PropertyDefinition" as any) &&
          parents[i + 1] === (parent as any).value
        ) {
          return;
        }
      }
      info.usedFreeVars.add("this");
    },
  });

  return info;
}

export function mergeParsedExprInfos(infos: ParsedExprInfo[]): ParsedExprInfo {
  const full = emptyParsedExprInfo();

  infos.forEach((info) => {
    for (const key of DOLLAR_VARS) {
      full.usesDollarVars[key] =
        full.usesDollarVars[key] || info.usesDollarVars[key];
      full.usesUnknownDollarVarKeys[key] =
        full.usesUnknownDollarVarKeys[key] ||
        info.usesUnknownDollarVarKeys[key];
      full.usedDollarVarKeys[key] = xUnion(
        full.usedDollarVarKeys[key],
        info.usedDollarVarKeys[key]
      );
    }
    full.usedFreeVars = xUnion(full.usedFreeVars, info.usedFreeVars);
  });

  return full;
}

function generateCode(ast: ast.Program): string {
  const newCode = writeJs(ast, { semicolons: false });

  // Remove trailing semicolon in case the generator added
  return newCode.endsWith(";") ? newCode.slice(0, -1) : newCode;
}

function mkMemberExpression(parts: string[]): ast.MemberExpression {
  const key = parts[parts.length - 1];
  return {
    type: "MemberExpression",
    object:
      parts.length > 2
        ? mkMemberExpression(parts.slice(0, -1))
        : {
            type: "Identifier",
            name: parts[0],
          },
    optional: false,
    ...(!key.match(/^[A-Za-z_$]/) || !key.match(/^[A-Za-z_0-9$]*$/)
      ? {
          property: {
            type: "Literal",
            value: key,
            raw: JSON.stringify(key),
          },
          computed: true,
        }
      : {
          property: {
            type: "Identifier",
            name: key,
          },
          computed: false,
        }),
  };
}

export function replaceMemberExpression(
  node: ast.MemberExpression,
  newPath: string[]
) {
  const newExpr = mkMemberExpression(newPath);
  node.object = newExpr.object;
  node.property = newExpr.property;
  node.computed = newExpr.computed;
}

/**
 * Parses and returns JS/TS code with occurrences of `oldObject.oldKey`
 * renamed to `newObject.newKey`. Also works in deep objects; e.g. if
 * `oldKey` is "old.deep.key" and `newKey` is "new.key" it will replace
 * `oldObject.old.deep.key` with `newObject.new.key`.
 */
export function renameObjectKey(
  code: string,
  oldObject: string,
  newObject: string,
  oldKey: string,
  newKey: string
): string {
  code = wrapJavaScriptCodeInParens(code);
  const oldParts = [oldObject, ...oldKey.split(".")];
  const newParts = [newObject, ...newKey.split(".")];

  const ast = traverseCode(code, {
    MemberExpression: (node) => {
      const parts = parseMemberExpression(node);
      if (arrayEq(oldParts, parts)) {
        const newMemberExpression = mkMemberExpression(newParts);
        node.object = newMemberExpression.object;
        node.property = newMemberExpression.property;
        node.computed = false;
      }
    },
  });

  return generateCode(ast);
}

/**
 * Parses and returns JS/TS code with occurrences of `varName` renamed to
 * `$props[propName]`. That is used in component extraction.
 */
export function replaceVarWithProp(
  code: string,
  varName: string,
  propName: string
): string {
  code = wrapJavaScriptCodeInParens(code);

  const ast = traverseCode(code, {
    Identifier: (node) => {
      if (node.name === varName) {
        node.name = `$props.${propName}`;
      }
    },
  });

  return generateCode(ast);
}

export function pathToString(path: (string | number)[]) {
  return (
    path
      .map((s, idx) => {
        if (idx == 0) {
          return s;
        }
        if (typeof s === "number" || !isValidJsIdentifier(s)) {
          return `[${JSON.stringify(s)}]`;
        }
        return `.${s}`;
      })
      .join("") || ""
  );
}

export function isPathDataToken(
  path: (string | number | undefined)[]
): path is string[] {
  return typeof path[0] === "string" && path[0].startsWith("$dataTokens_");
}

export function parseObjectPath(obj: ObjectPath): ParsedExprInfo {
  const info = emptyParsedExprInfo();
  if (typeof obj.path[0] === "string") {
    if (isDollarVar(obj.path[0])) {
      info.usesDollarVars[obj.path[0]] = true;
      if (obj.path[0] === "$state") {
        if (obj.path.length >= 2) {
          const toAdd = [obj.path[1].toString()];
          for (let i = 2; i < obj.path.length; i++) {
            toAdd.push(`${toAdd[toAdd.length - 1]}.${obj.path[i].toString()}`);
          }
          toAdd.forEach((key) => info.usedDollarVarKeys[obj.path[0]].add(key));
        }
      } else if (typeof obj.path[1] === "string") {
        info.usedDollarVarKeys[obj.path[0]].add(obj.path[1]);
      }
    } else if (obj.path[0] !== "undefined") {
      info.usedFreeVars.add(obj.path[0]);
    }
  }

  return info;
}

export function parseTemplatedString(expr: TemplatedString): ParsedExprInfo {
  const infos = expr.text.map((part) =>
    isKnownExpr(part) ? parseExpr(part) : emptyParsedExprInfo()
  );
  return mergeParsedExprInfos(infos);
}

export function parseExpr(expr: Expr): ParsedExprInfo {
  if (isKnownCustomCode(expr) && isRealCodeExpr(expr)) {
    return parseCodeExpression(expr.code.slice(1, -1));
  } else if (isKnownObjectPath(expr)) {
    return parseObjectPath(expr);
  } else if (isKnownTemplatedString(expr)) {
    return parseTemplatedString(expr);
  } else if (isKnownFunctionExpr(expr)) {
    return parseCodeExpression(
      asCode(expr, {
        // TODO: get the exact expression context (not needed for now)
        component: null,
        projectFlags: DEVFLAGS,
        inStudio: true,
      }).code
    );
  }
  return emptyParsedExprInfo();
}

export function parseCode(code: string) {
  try {
    let fixedCode = code;
    if (code.startsWith("(") && code.endsWith(";)")) {
      fixedCode = code.slice(1, -1);
    }
    return parseJsCode(fixedCode);
  } catch (error) {
    throw new EvaluationError(`Could not parse code expression: ${code}`);
  }
}

function traverseCode(code: string, visitors: Visitors) {
  const ast = parseCode(code);
  traverse(ast, visitors);
  return ast;
}

export function exprUsesCtxOrFreeVars(expr: Expr) {
  const info = parseExpr(expr);
  return info.usesDollarVars.$ctx || info.usedFreeVars.size > 0;
}

export function exprUsesDollarVars(expr: Expr) {
  const info = parseExpr(expr);
  return Object.entries(info.usesDollarVars).some(([_, used]) => used);
}

export function codeUsesFunction(code: string, fnName: string) {
  const info = parseCodeExpression(code);
  return info.usedDollarVarKeys["$$"]?.has(fnName);
}

/**
 * Checks if code expression uses global objects like 'window' or 'globalThis'
 * that can cause issues during pre-rendering.
 */
export function codeUsesGlobalObjects(code: string): boolean {
  try {
    const info = parseCodeExpression(code, {
      disableGlobals: ["window", "globalThis"],
    });
    return (
      info.usedFreeVars.has("window") || info.usedFreeVars.has("globalThis")
    );
  } catch (error) {
    // Fall back to regex on parse fail
    return /\b(window|globalThis)\b/.test(code);
  }
}

export interface ParsedDataToken {
  identifier: string;
  projectShortId: string;
  tokenName: string;
}

/**
 * Parses a data token identifier with format $dataTokens_<projectShortId>_<tokenName>
 */
export function parseDataTokenIdentifier(
  identifier: string | undefined
): ParsedDataToken | undefined {
  if (!identifier || !identifier.startsWith("$dataTokens_")) {
    return undefined;
  }
  const withoutPrefix = identifier.slice("$dataTokens_".length);
  const parts = withoutPrefix.split("_");

  return parts.length < 2
    ? undefined
    : {
        identifier,
        projectShortId: parts[0],
        tokenName: parts.slice(1).join("_"),
      };
}

type TransforDataTokenFunction = (
  node: ast.MemberExpression | ast.Identifier,
  token: ParsedDataToken,
  nestedProps: string[]
) => void;

/**
 * Helper for transformDataTokens to ensure expr code is only replaced if necessary
 */
export function transformDataTokensInExpr(
  expr: CustomCode,
  visitor: TransforDataTokenFunction
) {
  const newCode = transformDataTokens(expr.code, visitor);

  if (newCode) {
    expr.code = newCode;
  }
}

/**
 * Transforms all data tokens in `code` based on the result of `visitor`.
 *
 * @param code Code with $dataTokens in bundle format, e.g. $dataTokens_12345_tokenName
 * @param visitor Visit the node and mutate as necessary. The parsed data token and nested object keys are passed
 *   as arguments to the visitor (nested keys are ["a", "b"] from $dataTokens_12345_tokenName.a.b)
 * @returns Transformed code
 */
export function transformDataTokens(
  code: string,
  visitor: TransforDataTokenFunction
) {
  if (!code.includes("$dataTokens_")) {
    return undefined;
  }
  code = wrapJavaScriptCodeInParens(code);

  const ast = traverseCode(code, {
    MemberExpression: (node) => {
      const parts = parseMemberExpression(node);
      const parsed = parseDataTokenIdentifier(parts[0]);
      if (!parsed) {
        return;
      }
      // parts[0] is the flat identifier, parts[1..] are nested properties
      const nestedProps = filterFalsy(parts.slice(1));
      visitor(node, parsed, nestedProps);
    },
    Identifier: (node) => {
      // Handle standalone identifiers without nested properties
      const parsed = parseDataTokenIdentifier(node.name);
      if (!parsed) {
        return;
      }
      visitor(node, parsed, []);
    },
  });
  const newCode = generateCode(ast);
  // Re-wrap if original code was wrapped in parens
  return isCodeWrappedWithParens(code) ? `(${newCode})` : newCode;
}

export function extractDataTokenIdentifiersFromCode(code: string): string[] {
  if (!code.includes("$dataTokens_")) {
    return [];
  }
  const identifiers = new Set<string>();
  code = wrapJavaScriptCodeInParens(code);

  traverseCode(code, {
    MemberExpression: (node) => {
      const parts = parseMemberExpression(node);
      if (isPathDataToken(parts)) {
        identifiers.add(parts[0]);
      }
    },
    Identifier: (node) => {
      if (node.name.startsWith("$dataTokens_")) {
        identifiers.add(node.name);
      }
    },
  });
  return Array.from(identifiers);
}

/**
 * Builds a data token identifier $dataTokens_<projectShortId>_<tokenName>
 * Only the token name is included in the identifier, not nested properties.
 */
export function makeDataTokenIdentifier(
  projectShortId: string,
  tokenName: string
): string {
  return `$dataTokens_${projectShortId}_${tokenName}`;
}

/**
 * Replaces a MemberExpression node with an Identifier node.
 *
 * @param node - The MemberExpression node to replace
 * @param identifier - The identifier name to use
 */
function replaceWithIdentifier(
  _node: ast.MemberExpression,
  identifier: string
) {
  const node = _node as any;
  node.type = "Identifier";
  node.name = identifier;
  delete node.object;
  delete node.property;
  delete node.computed;
  delete node.optional;
}

export function replaceWithLiteral(_node: ast.MemberExpression, value: any) {
  const node = _node as any;
  node.type = "Literal";
  node.value = value;
  node.raw = jsLiteral(value);
  delete node.object;
  delete node.property;
  delete node.computed;
  delete node.optional;
}

/**
 * Replaces an Identifier node with a MemberExpression node.
 *
 * @param node - The Identifier node to replace
 * @param path - The member expression path
 */
function replaceIdentifierWithMemberExpr(node: ast.Identifier, path: string[]) {
  if (path.length < 2) {
    return;
  }
  const memberExpr = mkMemberExpression(path);
  Object.assign(node, memberExpr);
}

/**
 * Converts $dataTokens code references from display to bundle format.
 *
 * Display format (what users type):
 *   - Local tokens: $dataTokens.tokenName
 *   - Imported tokens: $dataTokens.depName.tokenName
 *
 * Bundle format (what gets saved - new flat format):
 *   - Local tokens: $dataTokens_12345_tokenName
 *   - Imported tokens: $dataTokens_1T8AH_tokenName
 */
export function transformDataTokensInCode(
  code: string,
  site: Site,
  projectId: string
): string {
  code = wrapJavaScriptCodeInParens(code);
  const shortProjectId = makeShortProjectId(projectId);

  const ast = traverseCode(code, {
    MemberExpression: (node) => {
      const parts = parseMemberExpression(node);
      if (!parts[0] || parts[0] !== "$dataTokens") {
        return;
      }

      if (parts.length === 2) {
        // $dataTokens.tokenName
        const tokenName = parts[1];
        if (!tokenName) {
          return;
        }
        // Check if this is a dep name
        const depShortId = findShortProjectIdByDepName(site, tokenName);
        if (depShortId) {
          // This is a dep namespace reference, not a token - skip
          return;
        }
        // Local token: $dataTokens.tokenName → $dataTokens_12345_tokenName
        replaceWithIdentifier(
          node,
          makeDataTokenIdentifier(shortProjectId, tokenName)
        );
      } else if (parts.length >= 3) {
        // $dataTokens.depName.tokenName.a.b OR $dataTokens.tokenName.a.b
        const secondPart = parts[1];
        if (!secondPart) {
          return;
        }

        const depShortId = findShortProjectIdByDepName(site, secondPart);
        if (depShortId) {
          // It's a dep: $dataTokens.depName.tokenName.a.b → $dataTokens_depId_tokenName.a.b
          const tokenName = parts[2];
          if (!tokenName) {
            return;
          }
          const nestedProps = parts
            .slice(3)
            .filter((p) => p !== undefined) as string[];
          const identifier = makeDataTokenIdentifier(depShortId, tokenName);

          // Replace with identifier + nested properties
          if (nestedProps.length > 0) {
            replaceMemberExpression(node, [identifier, ...nestedProps]);
          } else {
            replaceWithIdentifier(node, identifier);
          }
        } else {
          // It's a local token with nested properties: $dataTokens.tokenName.a.b → $dataTokens_12345_tokenName.a.b
          const tokenName = secondPart;
          const nestedProps = parts
            .slice(2)
            .filter((p) => p !== undefined) as string[];
          const identifier = makeDataTokenIdentifier(shortProjectId, tokenName);

          if (nestedProps.length > 0) {
            replaceMemberExpression(node, [identifier, ...nestedProps]);
          } else {
            replaceWithIdentifier(node, identifier);
          }
        }
      }
    },
  });

  return generateCode(ast);
}

/**
 * Convert $dataTokens references from bundle to display format in code.
 * Inverse of transformDataTokensInCode
 */
export function transformDataTokensToDisplay(
  code: string,
  site: Site,
  currentProjectId: string
): string {
  const shortProjectId = makeShortProjectId(currentProjectId);

  const transformed = transformDataTokens(code, (node, token, nestedProps) => {
    const { tokenName, projectShortId } = token;
    if (node.type === "MemberExpression") {
      if (projectShortId === shortProjectId) {
        // Local: $dataTokens_12345_myToken.a.b → $dataTokens.myToken.a.b
        const displayPath = ["$dataTokens", tokenName, ...nestedProps];
        replaceMemberExpression(node, displayPath);
      } else {
        // Dep: $dataTokens_depId_tokenName.a.b → $dataTokens.depName.tokenName.a.b
        const depName = findDepNameByShortProjectId(site, projectShortId);
        if (depName) {
          const displayPath = [
            "$dataTokens",
            toVarName(depName),
            tokenName,
            ...nestedProps,
          ];
          replaceMemberExpression(node, displayPath);
        }
      }
    } else {
      if (projectShortId === shortProjectId) {
        // Local: $dataTokens_12345_myToken → $dataTokens.myToken
        const displayPath = ["$dataTokens", tokenName];
        replaceIdentifierWithMemberExpr(node, displayPath);
      } else {
        // Dep: $dataTokens_depId_tokenName → $dataTokens.depName.tokenName
        const depName = findDepNameByShortProjectId(site, projectShortId);
        if (depName) {
          const displayPath = ["$dataTokens", toVarName(depName), tokenName];
          replaceIdentifierWithMemberExpr(node, displayPath);
        }
      }
    }
  });
  return transformed ?? code;
}

/**
 * Convert $dataTokens path from bundle to display format.
 * Handles flat identifier with potential nested properties.
 */
export function transformDataTokenPathToDisplay(
  path: (string | number)[],
  site: Site,
  projectId: string
): (string | number)[] {
  if (path.length === 0 || typeof path[0] !== "string") {
    return path;
  }
  const parsed = parseDataTokenIdentifier(path[0]);
  if (!parsed) {
    return path;
  }
  const { projectShortId, tokenName } = parsed;

  const shortProjectId = makeShortProjectId(projectId);
  const nestedProps = path.slice(1); // Preserve nested properties

  if (projectShortId === shortProjectId) {
    // Local: [$dataTokens_12345_myToken, "a", "b"] → [$dataTokens, myToken, "a", "b"]
    return ["$dataTokens", tokenName, ...nestedProps];
  } else {
    // Dep: [$dataTokens_depId_tokenName, "a", "b"] → [$dataTokens, depName, tokenName, "a", "b"]
    const depName = findDepNameByShortProjectId(site, projectShortId);
    if (depName) {
      return ["$dataTokens", toVarName(depName), tokenName, ...nestedProps];
    }
  }
  return path;
}

/**
 * Transform data tokens in a path to display format, then convert the path to string.
 */
export function pathToDisplayString(
  path: (string | number)[],
  site: Site,
  projectId: string
): string {
  return pathToString(transformDataTokenPathToDisplay(path, site, projectId));
}

/**
 * Convert $dataTokens path from display to bundle format.
 * Inverse of transformDataTokenPathToDisplay.
 *
 * @param path - ObjectPath array in display format
 * @param site - Site object to resolve dep names to project IDs
 * @param projectId - The current project's ID for local tokens
 * @returns Path in bundle format with flat identifier + nested properties
 */
export function transformDataTokenPathToBundle(
  path: (string | number)[],
  site: Site,
  projectId: string
): (string | number)[] {
  if (path.length < 2 || path[0] !== "$dataTokens") {
    return path;
  }

  const shortProjectId = makeShortProjectId(projectId);
  const secondPart = path[1] as string;

  // Check if second part is a dep name
  const depShortId = findShortProjectIdByDepName(site, secondPart);

  if (depShortId) {
    // Dep: [$dataTokens, depName, tokenName, "a", "b"] → [$dataTokens_depId_tokenName, "a", "b"]
    if (path.length < 3) {
      return path; // Just namespace, not a token
    }
    const tokenName = path[2] as string;
    const nestedProps = path.slice(3);
    return [makeDataTokenIdentifier(depShortId, tokenName), ...nestedProps];
  } else {
    // Local: [$dataTokens, tokenName, "a", "b"] → [$dataTokens_12345_tokenName, "a", "b"]
    const tokenName = secondPart;
    const nestedProps = path.slice(2);
    return [makeDataTokenIdentifier(shortProjectId, tokenName), ...nestedProps];
  }
}
