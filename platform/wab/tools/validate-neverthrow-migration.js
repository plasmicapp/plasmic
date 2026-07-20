#!/usr/bin/env node
/**
 * validate-neverthrow-migration.js
 *
 * AST validator for the ts-failable -> neverthrow migration. Unlike grep, it
 * understands scope and expression shape, so it distinguishes real leftovers
 * and hazards from lookalikes.
 *
 * Two classes of findings:
 *   ERROR  a definite migration defect (build/runtime bug or un-migrated API)
 *   WARN   something a human should eyeball (often a documented lookalike)
 *
 * Checks:
 *   [completeness] import from "ts-failable"
 *   [completeness] IFailable / FailablePromise / FailableArgParams / FailableAsyncArg types
 *   [completeness] bare failable(...) / failableAsync(...) builder calls
 *   [completeness] x.result.isError               (ts-failable boxed accessor)
 *   [completeness] x.result.value / x.result.error (WARN: connectionTest-style lookalikes)
 *   [completeness] x.match({ success, failure })  (object form; neverthrow is positional)
 *   [completeness] .mapError(...)                 (neverthrow spells it mapErr)
 *   [completeness] mapMultiple(...) / mapM(...)   (neverthrow: Result.combine)
 *   [completeness] bare success(...) / failure(...) identifier calls (WARN: lookalikes)
 *   [safety]       neverthrow err()/ok() call whose name is locally shadowed (runtime bug)
 *   [safety]       any neverthrow import shadowed by a local binding      (WARN: eslint no-shadow)
 *   [safety]       yield / yield* outside a generator function            (SyntaxError at load)
 *   [safety]       safeTry(function*(){...}) with no yield                (require-yield / should be plain fn)
 *
 * Usage:
 *   node tools/validate-neverthrow-migration.js <file-or-dir> [...]
 *   node tools/validate-neverthrow-migration.js            # defaults to git-changed *.ts/*.tsx vs origin/master
 *
 * Exit code is 1 if any ERROR-level finding is reported, else 0.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const vm = require("vm");

let ts;
try {
  ts = require("typescript");
} catch {
  // Fall back to the nearest node_modules if run from an odd cwd.
  ts = require(require.resolve("typescript", {
    paths: [process.cwd(), path.join(process.cwd(), "platform/wab")],
  }));
}

const FAILABLE_TYPES = new Set([
  "IFailable",
  "FailablePromise",
  "FailableArgParams",
  "FailableAsyncArg",
]);
const NEVERTHROW_VALUE_FNS = new Set(["err", "ok", "errAsync", "okAsync"]);
const BOXED_ACCESSORS = new Set(["isError", "value", "error"]);

/** @typedef {{file:string, line:number, col:number, severity:"ERROR"|"WARN", category:string, message:string}} Finding */

function collectFiles(inputs) {
  const out = [];
  const isTsFile = (f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f);
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (/node_modules|\/gen(\/|$)|\.git/.test(p)) {
        return;
      }
      for (const e of fs.readdirSync(p)) {
        walk(path.join(p, e));
      }
    } else if (isTsFile(p)) {
      out.push(p);
    }
  };
  for (const inp of inputs) {
    if (fs.existsSync(inp)) {
      walk(inp);
    }
  }
  return [...new Set(out)];
}

function gitChangedFiles() {
  try {
    const base = cp
      .execSync("git merge-base origin/master HEAD", { encoding: "utf8" })
      .trim();
    const raw = cp.execSync(`git diff --name-only ${base} HEAD`, {
      encoding: "utf8",
    });
    const root = cp
      .execSync("git rev-parse --show-toplevel", { encoding: "utf8" })
      .trim();
    return raw
      .split("\n")
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f))
      .map((f) => path.join(root, f))
      .filter((f) => fs.existsSync(f));
  } catch {
    return [];
  }
}

function pos(sf, node) {
  const { line, character } = sf.getLineAndCharacterOfPosition(
    node.getStart(sf)
  );
  return { line: line + 1, col: character + 1 };
}

function hasYieldDescendant(node) {
  let found = false;
  const visit = (n) => {
    if (found) {
      return;
    }
    // Do not descend into a nested function - its yields belong to it.
    if (
      n !== node &&
      (ts.isFunctionDeclaration(n) ||
        ts.isFunctionExpression(n) ||
        ts.isMethodDeclaration(n))
    ) {
      return;
    }
    if (ts.isYieldExpression(n)) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

/** Names imported from "neverthrow" in this file. */
function neverthrowImports(sf) {
  const names = new Set();
  for (const st of sf.statements) {
    if (
      ts.isImportDeclaration(st) &&
      ts.isStringLiteral(st.moduleSpecifier) &&
      st.moduleSpecifier.text === "neverthrow"
    ) {
      const nb = st.importClause && st.importClause.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          names.add(el.name.text);
        }
      }
    }
  }
  return names;
}

/** Scope-aware shadow analysis for neverthrow-imported names. */
function checkShadows(sf, imported, findings) {
  if (imported.size === 0) {
    return;
  }

  const bindingsIntroducedBy = (node) => {
    const names = [];
    const addName = (bn) => {
      if (!bn) {
        return;
      }
      if (ts.isIdentifier(bn)) {
        names.push(bn.text);
      } else if (
        ts.isObjectBindingPattern(bn) ||
        ts.isArrayBindingPattern(bn)
      ) {
        for (const el of bn.elements) {
          if (el && el.name) {
            addName(el.name);
          }
        }
      }
    };
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessor(node) ||
      ts.isSetAccessor(node)
    ) {
      for (const p of node.parameters) {
        addName(p.name);
      }
      if (node.name && ts.isIdentifier(node.name)) {
        names.push(node.name.text);
      }
    }
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      addName(node.variableDeclaration.name);
    }
    return names;
  };

  const scopes = [new Set()]; // index 0 = module scope (the import lives here)
  const shadowedAt = (name) => {
    for (let i = scopes.length - 1; i >= 1; i--) {
      if (scopes[i].has(name)) {
        return true;
      }
    }
    return false;
  };

  const visit = (node) => {
    // hoist var/let/const + function/class declarations into current scope
    if (ts.isVariableDeclaration(node) && node.name) {
      const cur = scopes[scopes.length - 1];
      const add = (bn) => {
        if (ts.isIdentifier(bn)) {
          cur.add(bn.text);
        } else if (
          ts.isObjectBindingPattern(bn) ||
          ts.isArrayBindingPattern(bn)
        ) {
          for (const el of bn.elements) {
            if (el && el.name) {
              add(el.name);
            }
          }
        }
      };
      add(node.name);
    }
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name
    ) {
      scopes[scopes.length - 1].add(node.name.text);
    }

    // reference to an imported name?
    if (
      ts.isIdentifier(node) &&
      imported.has(node.text) &&
      shadowedAt(node.text)
    ) {
      // skip the binding occurrences and property names / import specifiers
      const p = node.parent;
      const isDeclName =
        (ts.isParameter(p) && p.name === node) ||
        (ts.isBindingElement(p) && p.name === node) ||
        (ts.isVariableDeclaration(p) && p.name === node) ||
        (ts.isPropertyAccessExpression(p) && p.name === node) ||
        ts.isImportSpecifier(p) ||
        (ts.isPropertyAssignment(p) && p.name === node);
      if (!isDeclName) {
        const isCallee =
          p &&
          ts.isCallExpression(p) &&
          p.expression === node &&
          NEVERTHROW_VALUE_FNS.has(node.text);
        findings.push({
          node,
          severity: isCallee ? "ERROR" : "WARN",
          category: "shadow",
          message: isCallee
            ? `neverthrow '${node.text}()' is shadowed by a local binding - this call does NOT construct a Result`
            : `local binding shadows the neverthrow import '${node.text}' (eslint no-shadow)`,
        });
      }
    }

    const opensScope =
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessor(node) ||
      ts.isSetAccessor(node) ||
      ts.isCatchClause(node) ||
      ts.isBlock(node) ||
      ts.isForStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isForInStatement(node);

    if (opensScope) {
      scopes.push(new Set(bindingsIntroducedBy(node)));
      ts.forEachChild(node, visit);
      scopes.pop();
    } else {
      ts.forEachChild(node, visit);
    }
  };
  visit(sf);
}

/** Syntactic / expression-shape checks. */
function checkSyntactic(sf, findings) {
  const add = (node, severity, category, message) =>
    findings.push({ node, severity, category, message });

  const visit = (node) => {
    // import from "ts-failable"
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === "ts-failable"
    ) {
      add(node, "ERROR", "residual-import", `import from "ts-failable"`);
    }

    // failable-family type references (IFailable<...>, etc.)
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      if (FAILABLE_TYPES.has(node.typeName.text)) {
        add(
          node,
          "ERROR",
          "residual-type",
          `ts-failable type '${node.typeName.text}'`
        );
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      // bare failable(...) / failableAsync(...)
      if (ts.isIdentifier(callee) && /^failable(Async)?$/.test(callee.text)) {
        add(
          node,
          "ERROR",
          "residual-builder",
          `${callee.text}(...) builder call (use safeTry / mkFailable)`
        );
      }
      // mapMultiple(...) / mapM(...)
      if (ts.isIdentifier(callee) && /^(mapMultiple|mapM)$/.test(callee.text)) {
        add(
          node,
          "ERROR",
          "residual-mapmultiple",
          `${callee.text}(...) (use Result.combine(arr.map(fn)))`
        );
      }
      // bare success(...) / failure(...) identifier calls (lookalikes are member calls)
      if (ts.isIdentifier(callee) && /^(success|failure)$/.test(callee.text)) {
        add(
          node,
          "WARN",
          "residual-helper-call",
          `bare '${callee.text}(...)' call - verify it is not a leftover ts-failable helper`
        );
      }
      // x.match({ success, failure })
      if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === "match" &&
        node.arguments.length === 1 &&
        ts.isObjectLiteralExpression(node.arguments[0])
      ) {
        const keys = node.arguments[0].properties
          .map((p) => p.name && ts.isIdentifier(p.name) && p.name.text)
          .filter(Boolean);
        if (keys.includes("success") || keys.includes("failure")) {
          add(
            node,
            "ERROR",
            "object-match",
            `.match({ success, failure }) object form - neverthrow .match is positional (okFn, errFn)`
          );
        }
      }
      // .mapError(...)
      if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === "mapError"
      ) {
        add(
          node,
          "ERROR",
          "map-error",
          `.mapError(...) - neverthrow spells it .mapErr(...)`
        );
      }
    }

    // x.result.isError / .value / .error   (boxed accessor)
    if (
      ts.isPropertyAccessExpression(node) &&
      BOXED_ACCESSORS.has(node.name.text) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "result"
    ) {
      const isError = node.name.text === "isError";
      add(
        node,
        isError ? "ERROR" : "WARN",
        "boxed-accessor",
        `'.result.${node.name.text}' ts-failable box accessor` +
          (isError ? "" : " (WARN: may be a non-failable .result lookalike)")
      );
    }

    // NOTE: yield-outside-generator is NOT checked here. TypeScript's parser is
    // lenient - in a non-generator it reads `yield* x` as `yield * x` (identifier
    // times value), so no YieldExpression node exists. That is the same leniency
    // that let the original bug slip past `tsc`. It is detected reliably in
    // checkGeneratorYield() via a strict-mode parse of the transpiled output.

    // safeTry(function*(){ ...no yield... })
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "safeTry" &&
      node.arguments.length >= 1
    ) {
      const arg = node.arguments[0];
      if (
        (ts.isFunctionExpression(arg) || ts.isFunctionDeclaration(arg)) &&
        arg.asteriskToken &&
        !hasYieldDescendant(arg)
      ) {
        add(
          arg,
          "ERROR",
          "empty-generator",
          `safeTry(function*(){...}) has no yield - use a plain (async) function returning a Result`
        );
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/**
 * Reliable yield-outside-generator detection: transpile away the types (as jest
 * does) and parse the result in strict mode. V8 rejects `yield` outside a
 * generator with "Unexpected strict mode reserved word" - the exact failure jest
 * hit. AST inspection can't do this (TS parses the yield as an identifier).
 * Returns file-level findings with source-line hints (transpiled line numbers
 * don't map cleanly back to source).
 */
function checkGeneratorYield(file, text, findings) {
  if (!/\byield\b/.test(text)) {
    return;
  } // nothing to check
  let js;
  try {
    js = ts.transpileModule(text, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019,
        alwaysStrict: true, // emit "use strict" so vm parses strictly
        jsx: file.endsWith(".tsx") ? ts.JsxEmit.React : undefined,
      },
    }).outputText;
  } catch {
    return; // transpile failure is out of scope for this check
  }
  try {
    new vm.Script(js, { filename: file }); // parse only; does not execute
  } catch (e) {
    const msg = String(e && e.message);
    if (!/reserved word|generator|yield/i.test(msg)) {
      return;
    } // unrelated strict issue
    // Point at candidate source lines so the finding is actionable.
    const lines = text.split("\n");
    const hints = [];
    for (let i = 0; i < lines.length; i++) {
      if (/\byield\b/.test(lines[i])) {
        hints.push(i + 1);
      }
    }
    findings.push({
      line: hints[0] || 0,
      col: 1,
      severity: "ERROR",
      category: "yield-outside-generator",
      message:
        `strict parse failed ("${msg}") - a 'yield' is outside a generator ` +
        `function (SyntaxError at load time). Candidate line(s): ${hints.join(
          ", "
        )}`,
    });
  }
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length ? collectFiles(args) : gitChangedFiles();
  if (files.length === 0) {
    console.error(
      "No .ts/.tsx files to validate (pass paths, or run inside a git repo with an origin/master)."
    );
    process.exit(2);
  }

  /** @type {Finding[]} */
  const all = [];
  for (const file of files) {
    let text;
    let sf;
    try {
      text = fs.readFileSync(file, "utf8");
      const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
    } catch (e) {
      all.push({
        file,
        line: 0,
        col: 0,
        severity: "ERROR",
        category: "parse-error",
        message: String(e && e.message),
      });
      continue;
    }
    // Node-based findings (get their line/col from the AST node).
    const nodeFindings = [];
    checkSyntactic(sf, nodeFindings);
    checkShadows(sf, neverthrowImports(sf), nodeFindings);
    for (const f of nodeFindings) {
      const { line, col } = pos(sf, f.node);
      all.push({
        file,
        line,
        col,
        severity: f.severity,
        category: f.category,
        message: f.message,
      });
    }
    // Line-based findings (already carry line/col).
    const lineFindings = [];
    checkGeneratorYield(file, text, lineFindings);
    for (const f of lineFindings) {
      all.push({
        file,
        line: f.line,
        col: f.col,
        severity: f.severity,
        category: f.category,
        message: f.message,
      });
    }
  }

  all.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col
  );

  const rel = (f) => path.relative(process.cwd(), f);
  let curFile = null;
  for (const f of all) {
    if (f.file !== curFile) {
      curFile = f.file;
      console.log(`\n${rel(f.file)}`);
    }
    const tag = f.severity === "ERROR" ? "ERROR" : "warn ";
    console.log(
      `  ${String(f.line).padStart(5)}:${String(f.col).padEnd(3)} ${tag} [${
        f.category
      }] ${f.message}`
    );
  }

  const errors = all.filter((f) => f.severity === "ERROR").length;
  const warns = all.filter((f) => f.severity === "WARN").length;
  console.log(
    `\nValidated ${files.length} file(s): ${errors} error(s), ${warns} warning(s).`
  );
  process.exit(errors > 0 ? 1 : 0);
}

main();
