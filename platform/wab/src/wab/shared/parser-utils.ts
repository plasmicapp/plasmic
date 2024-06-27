import { assertNever, jsonClone, last, withoutNils } from "@/wab/shared/common";
import type AcornTypes from "acorn";
import { full as astTraversal } from "acorn-walk";
import { generate } from "escodegen";
import type * as ast from "estree";

declare module "acorn" {
  function parse(input: string, options: AcornTypes.Options): ast.Program;
}

declare module "acorn-walk" {
  function ancestor(node: ast.Program, visitors: Visitors): void;
  function full(node: ast.Node, callback: (node: ast.Node) => void): void;
  type Visitors = {
    [k in ast.Node["type"]]?: (
      node: ast.Node & { type: k },
      parents: ast.Node[]
    ) => void;
  } & {
    [k: string]: (node: any, parents: ast.Node[]) => void;
  };
}

import { parse } from "acorn";

export function parseJsCode(code: string) {
  return parse(code, {
    ecmaVersion: "latest",
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
  });
}

export function writeJs(ast: ast.Program, opts?: { indentLevel?: number }) {
  return generate(ast, {
    format: {
      indent: {
        style: "  ",
        adjustMultilineComment: true,
        ...(opts?.indentLevel ? { base: opts.indentLevel } : {}),
      },
      quotes: "double",
    },
  });
}

function hasAwaitExpression(ast: ast.Program): boolean {
  let hasAwait = false;
  astTraversal(ast, (node) => {
    if (node.type === "AwaitExpression") {
      hasAwait = true;
    }
  });
  return hasAwait;
}

export function maybeConvertToIife(code: string) {
  if (!isValidJavaScriptCode(code)) {
    return code;
  }
  if (
    isValidJavaScriptCode(`(
    ${code}
  )`)
  ) {
    // No need to convert to IIFE, as the code is already a valid expression
    return code;
  }

  try {
    const ast = parseJsCode(code);

    addImplicitReturnToAst(ast);

    const functionSignature = hasAwaitExpression(ast) ? "async ()" : "()";

    return `(${functionSignature} => {
${writeJs(ast, { indentLevel: 1 })}
})()`;
  } catch (err) {
    console.log("Error: ", err);
    return code;
  }
}

export function isValidJavaScriptCode(
  code: string,
  opts?: { throwIfInvalid?: boolean }
) {
  try {
    // Use AsyncFunction instead of Function to support `await`
    const AsyncFunction = async function x() {}.constructor as typeof Function;
    // Do not evaluate it!!! Running this function would be a huge security vulnerability as it runs on the server.
    const _neverCallThisFunction = new AsyncFunction(code);
    return true;
  } catch (error) {
    if (opts?.throwIfInvalid) {
      throw error;
    }
    return false;
  }
}

export type ScopeNode =
  | ast.Program
  | ast.FunctionDeclaration
  | ast.FunctionExpression
  | ast.ArrowFunctionExpression;
export function isScope(node: ast.Node): node is ScopeNode {
  return (
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "Program"
  );
}

export type BlockScopeNode =
  | ScopeNode
  | ast.BlockStatement
  | ast.SwitchStatement;
export function isBlockScope(node: ast.Node): node is BlockScopeNode {
  // The body of switch statement is a block.
  return (
    node.type === "BlockStatement" ||
    node.type === "SwitchStatement" ||
    isScope(node)
  );
}

type ReturnableStatement =
  | ast.IfStatement
  | ast.TryStatement
  | ast.WhileStatement
  | ast.DoWhileStatement
  | ast.ForStatement
  | ast.ForInStatement
  | ast.ForOfStatement
  | ast.BlockStatement;

const returnableStatements = new Set([
  "IfStatement",
  "TryStatement",
  "WhileStatement",
  "DoWhileStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "BlockStatement",
] as ast.Node["type"][]);

function isReturnableStatement(
  stmt: ast.Program["body"][number]
): stmt is ReturnableStatement {
  return returnableStatements.has(stmt.type);
}

type ConvertibleToExpression =
  | ast.ExpressionStatement
  | ast.ClassDeclaration
  | ast.FunctionDeclaration;

const convertibleToExprStmts = new Set([
  "ExpressionStatement",
  "ClassDeclaration",
  "FunctionDeclaration",
] as ast.Node["type"][]);

function canConvertToExpression(
  stmt: ast.Program["body"][number]
): stmt is ConvertibleToExpression {
  return convertibleToExprStmts.has(stmt.type);
}

function convertToExpression(stmt: ConvertibleToExpression): ast.Expression {
  switch (stmt.type) {
    case "ExpressionStatement":
      return stmt.expression;
    case "ClassDeclaration":
      return {
        ...stmt,
        type: "ClassExpression",
      };
    case "FunctionDeclaration":
      return {
        ...stmt,
        type: "FunctionExpression",
      };
    default:
      assertNever(stmt);
  }
}

// Based on https://github.com/miraks/babel-plugin-implicit-return/blob/master/src/index.js
function addImplicitReturnToAst(ast: ast.Program) {
  const { body } = ast;
  let lastNonEmptyStmt = -1;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    if (body[i].type !== "EmptyStatement") {
      lastNonEmptyStmt = i;
      break;
    }
  }

  if (lastNonEmptyStmt === -1) {
    return;
  }

  const lastStmt = body[lastNonEmptyStmt];

  if (canConvertToExpression(lastStmt)) {
    if (lastStmt.type === "ExpressionStatement") {
      body.splice(lastNonEmptyStmt);
    }
    body.push({
      type: "ReturnStatement",
      argument: convertToExpression(lastStmt),
    });
    return;
  }

  // A few more special cases below

  if (lastStmt.type === "VariableDeclaration") {
    const genReturnValueFromPattern = (
      pattern: ast.Pattern
    ): ast.Expression | null => {
      switch (pattern.type) {
        case "Identifier":
          return jsonClone(pattern) as typeof pattern;
        case "AssignmentPattern":
          return genReturnValueFromPattern(pattern.left);
        case "RestElement":
          return genReturnValueFromPattern(pattern.argument);
        // For array parrent and object pattern declarations, return the last
        // declared variable
        case "ArrayPattern": {
          const elts = withoutNils(pattern.elements);
          return elts.length > 0 ? genReturnValueFromPattern(last(elts)) : null;
        }
        case "ObjectPattern": {
          if (pattern.properties.length === 0) {
            return null;
          }
          const lastProp = last(pattern.properties);
          return genReturnValueFromPattern(
            lastProp.type === "Property" ? lastProp.value : lastProp.argument
          );
        }
        default:
          return null;
      }
    };

    const lastVar = genReturnValueFromPattern(last(lastStmt.declarations).id);
    if (lastVar) {
      // Return the last thing declared
      body.push({
        type: "ReturnStatement",
        argument: genReturnValueFromPattern(last(lastStmt.declarations).id),
      });
    }
    return;
  }

  if (isReturnableStatement(lastStmt)) {
    let hasLoop = false;
    const plasmicReturnIdentifier = "__plasmic_ret";

    function* getCompletionRecords(
      stmt: ast.Statement
    ): Generator<ast.Statement> {
      if (isReturnableStatement(stmt)) {
        switch (stmt.type) {
          case "BlockStatement":
            for (let i = stmt.body.length - 1; i >= 0; i -= 1) {
              if (stmt.body[i].type !== "EmptyStatement") {
                yield* getCompletionRecords(stmt.body[i]);
                return;
              }
            }
            return;
          case "IfStatement":
            yield* getCompletionRecords(stmt.consequent);
            if (stmt.alternate) {
              yield* getCompletionRecords(stmt.alternate);
            }
            return;
          case "TryStatement":
            yield* getCompletionRecords(stmt.block);
            if (stmt.handler) {
              yield* getCompletionRecords(stmt.handler.body);
            }
            return;
          case "ForInStatement":
          case "ForStatement":
          case "ForOfStatement":
          case "WhileStatement":
          case "DoWhileStatement":
            hasLoop = true;
            yield* getCompletionRecords(stmt.body);
            return;
          default:
            assertNever(stmt);
        }
      } else {
        yield stmt;
      }
    }

    const leaves = [...getCompletionRecords(lastStmt)];
    if (hasLoop) {
      body.unshift({
        type: "VariableDeclaration",
        declarations: [
          {
            type: "VariableDeclarator",
            id: {
              type: "Identifier",
              name: plasmicReturnIdentifier,
            },
            init: {
              type: "Identifier",
              name: "undefined",
            },
          },
        ],
        kind: "let",
      });
      body.push({
        type: "ReturnStatement",
        argument: {
          type: "Identifier",
          name: plasmicReturnIdentifier,
        },
      });
    }
    leaves.forEach((stmt) => {
      if (!canConvertToExpression(stmt)) {
        return;
      }
      const stmtClone = jsonClone(stmt) as typeof stmt;

      const newStmt: ast.ExpressionStatement | ast.ReturnStatement = hasLoop
        ? {
            type: "ExpressionStatement",
            expression: {
              type: "AssignmentExpression",
              operator: "=",
              left: {
                type: "Identifier",
                name: plasmicReturnIdentifier,
              },
              right: convertToExpression(stmtClone),
            },
          }
        : {
            type: "ReturnStatement",
            argument: convertToExpression(stmtClone),
          };

      [...Object.keys(stmt)].forEach((key) => {
        delete stmt[key];
      });
      Object.assign(stmt, newStmt);
    });
  }
}
