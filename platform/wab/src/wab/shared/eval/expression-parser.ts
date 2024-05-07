import {
  Expr,
  isKnownCustomCode,
  isKnownExpr,
  isKnownFunctionExpr,
  isKnownObjectPath,
  isKnownTemplatedString,
  ObjectPath,
  TemplatedString,
} from "@/wab/classes";
import { arrayEq, unexpected, xUnion } from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import { asCode, isRealCodeExpr } from "@/wab/exprs";
import { ENABLED_GLOBALS } from "@/wab/shared/eval";
import {
  isBlockScope,
  isScope,
  isValidJavaScriptCode,
  parseJsCode,
  writeJs,
} from "@/wab/shared/parser-utils";
import { validJsIdentifierRegex } from "@/wab/shared/utils/regex-valid-js-identifier";
import { ancestor as traverse } from "acorn-walk";
import type * as ast from "estree";

const DOLLAR_VARS = ["$ctx", "$props", "$queries", "$state", "$steps"] as const;

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
export function parseCodeExpression(code: string): ParsedExprInfo {
  if (!isValidJavaScriptCode(code) && isValidJavaScriptCode(`(${code})`)) {
    code = `(${code})`;
  }
  type WithLocals<T extends ast.Node> = T & {
    locals?: Record<string, boolean>;
  };

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
          if (elt) declarePattern(elt, parent);
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
      if (node.handler == null || node.handler.param === null) return;
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
    if (name === "undefined") return;
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
    } else if (!ENABLED_GLOBALS.has(name)) {
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
  const newCode = writeJs(ast);

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
  if (!isValidJavaScriptCode(code) && isValidJavaScriptCode(`(${code})`)) {
    code = `(${code})`;
  }
  const ast = parseCode(code);
  const oldParts = [oldObject, ...oldKey.split(".")];
  const newParts = [newObject, ...newKey.split(".")];

  traverse(ast, {
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
  if (!isValidJavaScriptCode(code) && isValidJavaScriptCode(`(${code})`)) {
    code = `(${code})`;
  }
  const ast = parseCode(code);

  traverse(ast, {
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
        if (typeof s === "number" || !s.match(validJsIdentifierRegex)) {
          return `[${JSON.stringify(s)}]`;
        }
        return `.${s}`;
      })
      .join("") || ""
  );
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

function parseCode(code: string) {
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

export function exprUsesCtxOrFreeVars(expr: Expr) {
  const info = parseExpr(expr);
  return info.usesDollarVars.$ctx || info.usedFreeVars.size > 0;
}

export function exprUsesDollarVars(expr: Expr) {
  const info = parseExpr(expr);
  return Object.entries(info.usesDollarVars).some(([_, used]) => used);
}
