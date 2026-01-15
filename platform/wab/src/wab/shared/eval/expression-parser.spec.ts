import { makeShortProjectId } from "@/wab/shared/codegen/util";
import { flattenExprs } from "@/wab/shared/core/tpls";
import {
  codeUsesGlobalObjects,
  emptyParsedExprInfo,
  extractDataTokenIdentifiers,
  isDataTokenExpr,
  parseCodeExpression,
  parseDataTokenIdentifier,
  pathToDisplayString,
  pathToString,
  renameObjectKey,
  replaceVarWithProp,
  transformDataTokenPathToBundle,
  transformDataTokenPathToDisplay,
  transformDataTokensInCode,
  transformDataTokensToDisplay,
} from "@/wab/shared/eval/expression-parser";
import {
  CompositeExpr,
  CustomCode,
  ObjectPath,
  Site,
} from "@/wab/shared/model/classes";

describe("parseCodeExpression", function () {
  it("should find uses of $props.key", () => {
    const parsed = parseCodeExpression("new Date($props.date).getMonth()");
    const expected = emptyParsedExprInfo();
    expected.usesDollarVars.$props = true;
    expected.usedDollarVarKeys.$props.add("date");
    expect(parsed).toEqual(expected);
  });

  it('should find uses of $props["key"]', () => {
    const parsed = parseCodeExpression('new Date($props["date"]).getMonth()');
    const expected = emptyParsedExprInfo();
    expected.usesDollarVars.$props = true;
    expected.usedDollarVarKeys.$props.add("date");
    expect(parsed).toEqual(expected);
  });

  it("should find uses of vars", () => {
    const parsed = parseCodeExpression("a + b + c");
    const expected = emptyParsedExprInfo();
    expected.usedFreeVars = new Set(["a", "b", "c"]);
    expect(parsed).toEqual(expected);
  });

  it("should find uses of object vars", () => {
    const parsed = parseCodeExpression('a.b.c + d["e"]');
    const expected = emptyParsedExprInfo();
    expected.usedFreeVars = new Set(["a", "d"]);
    expect(parsed).toEqual(expected);
  });

  it("should ignore non-free vars", () => {
    const parsed = parseCodeExpression(`
      (() => {
        try {
          return (
            $state.variable.ab + c
          );
        } catch (e) {
          if(e instanceof TypeError) {
            return (
              undefined
            );
          }
          throw e;
        }
      })()
    `);
    const expected = emptyParsedExprInfo();
    expected.usesDollarVars.$state = true;
    expected.usedDollarVarKeys.$state = new Set(["variable", "variable.ab"]);
    expected.usedFreeVars.add("c");
    expect(parsed).toEqual(expected);
  });

  it("should ignore object-looking substrings", () => {
    const parsed = parseCodeExpression('variable + "a $props.date b"');
    const expected = emptyParsedExprInfo();
    expected.usedFreeVars.add("variable");
    expect(parsed).toEqual(expected);
  });

  it("should find uses of unknown $props", () => {
    const parsed = parseCodeExpression(
      "new Date($props[$ctx.unknown]).getMonth()"
    );
    const expected = emptyParsedExprInfo();
    expected.usesDollarVars.$ctx = true;
    expected.usesDollarVars.$props = true;
    expected.usesUnknownDollarVarKeys.$props = true;
    expected.usedDollarVarKeys.$ctx.add("unknown");
    expect(parsed).toEqual(expected);
  });

  it("should find uses of $state", () => {
    const parsed = parseCodeExpression(
      '$state.a.deep.value + $state["b"].foo + $state[c].bar + "$state.d" - $state.e[f].g'
    );
    const expected = emptyParsedExprInfo();
    expected.usesDollarVars.$state = true;
    expected.usesUnknownDollarVarKeys.$state = true;
    expected.usedDollarVarKeys.$state = new Set([
      "a.deep.value",
      "a.deep",
      "a",
      "b.foo",
      "b",
      "e",
    ]);
    expected.usedFreeVars = new Set(["c", "f"]);
    expect(parsed).toEqual(expected);
  });

  it("should find uses of $ctx", () => {
    const parsed = parseCodeExpression(
      '$ctx.a.deep.value + $ctx["b"].foo + $ctx[c].bar + "$ctx.d"'
    );
    const expected = emptyParsedExprInfo();
    expected.usesDollarVars.$ctx = true;
    expected.usesUnknownDollarVarKeys.$ctx = true;
    expected.usedDollarVarKeys.$ctx = new Set(["a", "b"]);
    expected.usedFreeVars = new Set(["c"]);
    expect(parsed).toEqual(expected);
  });

  it("should find $ctx with no keys", () => {
    const parsed = parseCodeExpression("new Date($ctx).getMonth()");
    const expected = emptyParsedExprInfo();
    expected.usesDollarVars.$ctx = true;
    expect(parsed).toEqual(expected);
  });

  it("should parse object code", () => {
    const parsed = parseCodeExpression("({x: 1, y: 2})");
    const expected = emptyParsedExprInfo();
    expect(parsed).toEqual(expected);
  });
});

describe("renameObjectKey", function () {
  it("should work when oldKey is not found in code", () => {
    const newCode = renameObjectKey(
      "$ctx.a + $ctx.b",
      "$props",
      "$props",
      "a",
      "b"
    );
    expect(newCode).toEqual("$ctx.a + $ctx.b");
  });

  it("should rename $props.oldKey", () => {
    const newCode = renameObjectKey(
      "$ctx.a + $props.oldKey + $ctx.b",
      "$props",
      "$props",
      "oldKey",
      "newKey"
    );
    expect(newCode).toEqual("$ctx.a + $props.newKey + $ctx.b");
  });

  it('should rename $queries["oldKey"]', () => {
    const newCode = renameObjectKey(
      '$ctx.a + $queries["oldKey"] + $ctx.b',
      "$queries",
      "$props",
      "oldKey",
      "newKey"
    );
    expect(newCode).toEqual("$ctx.a + $props.newKey + $ctx.b");
  });

  it("should not rename $props[oldKey]", () => {
    const newCode = renameObjectKey(
      "$ctx.a + $props[oldKey] + $ctx.b",
      "$props",
      "$props",
      "oldKey",
      "newKey"
    );
    expect(newCode).toEqual("$ctx.a + $props[oldKey] + $ctx.b");
  });

  it("should not rename object-looking substrings", () => {
    const newCode = renameObjectKey(
      '$ctx.a + "$props.oldKey" + $ctx.b',
      "$props",
      "$props",
      "oldKey",
      "newKey"
    );
    expect(newCode).toEqual('$ctx.a + "$props.oldKey" + $ctx.b');
  });

  it("should rename $state.old.key", () => {
    const newCode = renameObjectKey(
      "$ctx.a + $state.old.key + $ctx.b",
      "$state",
      "$state",
      "old.key",
      "new.yek"
    );
    expect(newCode).toEqual("$ctx.a + $state.new.yek + $ctx.b");
  });

  it('should rename $state["old"].key', () => {
    const newCode = renameObjectKey(
      '$ctx.a + $state["old"].key + $ctx.b',
      "$state",
      "$state",
      "old.key",
      "new.yek"
    );
    expect(newCode).toEqual("$ctx.a + $state.new.yek + $ctx.b");
  });

  it("should rename variable in object", () => {
    const newCode = renameObjectKey(
      "{ code: $props.test }",
      "$props",
      "$props",
      "test",
      "newTest"
    );

    // Removing spaces to make it easier to compare, since ast formats the code
    expect(newCode.replace(/\s+/g, " ")).toEqual("{ code: $props.newTest }");
  });
});

describe("replaceVarWithProp", function () {
  it("should work when varName is not found in code", () => {
    const newCode = replaceVarWithProp("$ctx.a + b", "c", "d");
    expect(newCode).toEqual("$ctx.a + b");
  });

  it("should rename var", () => {
    const newCode = replaceVarWithProp(
      "$ctx.a + niceVar + $ctx.b",
      "niceVar",
      "newProp"
    );
    expect(newCode).toEqual("$ctx.a + $props.newProp + $ctx.b");
  });

  it("should rename var with object member", () => {
    const newCode = replaceVarWithProp(
      "$ctx.a + niceVar.test + $ctx.b",
      "niceVar",
      "newProp"
    );
    expect(newCode).toEqual("$ctx.a + $props.newProp.test + $ctx.b");
  });

  it("should rename var inside object member", () => {
    const newCode = replaceVarWithProp(
      "$ctx.a + niceVar[test] + $ctx.b",
      "test",
      "newProp"
    );
    expect(newCode).toEqual("$ctx.a + niceVar[$props.newProp] + $ctx.b");
  });
});

describe("pathToString", function () {
  it("should generate code", () => {
    const code = pathToString(["$ctx", 0, "bad-name", "goodName"]);
    expect(code).toEqual(`$ctx[0]["bad-name"].goodName`);
  });
});

describe("codeUsesGlobalObjects", function () {
  it("should detect window usage", () => {
    expect(codeUsesGlobalObjects("window.location.href")).toBe(true);
    expect(codeUsesGlobalObjects("window")).toBe(true);
    expect(codeUsesGlobalObjects("const url = (window as any).test")).toBe(
      true
    );
  });

  it("should detect globalThis usage", () => {
    expect(codeUsesGlobalObjects("globalThis.fetch")).toBe(true);
    expect(codeUsesGlobalObjects("globalThis")).toBe(true);
    expect(codeUsesGlobalObjects("const g = (globalThis as MyGlobal)")).toBe(
      true
    );
  });

  it("should not detect locally declared window/globalThis", () => {
    expect(codeUsesGlobalObjects("const window = {}; window.test")).toBe(false);
    expect(
      codeUsesGlobalObjects("function test(window) { return window.prop }")
    ).toBe(false);
    expect(codeUsesGlobalObjects("let globalThis = {}; globalThis.value")).toBe(
      false
    );
  });

  it("should not detect window/globalThis in strings", () => {
    expect(codeUsesGlobalObjects('"window is global"')).toBe(false);
    expect(codeUsesGlobalObjects("'globalThis reference'")).toBe(false);
    expect(codeUsesGlobalObjects("`${variable} window test`")).toBe(false);
  });

  it("should handle complex expressions", () => {
    expect(codeUsesGlobalObjects("$props.data + window.innerWidth")).toBe(true);
    expect(codeUsesGlobalObjects("(() => globalThis.process)()")).toBe(true);
    expect(codeUsesGlobalObjects("$state.items.filter(x => x.id)")).toBe(false);
  });

  it("should handle invalid code gracefully", () => {
    expect(codeUsesGlobalObjects("invalid {{ syntax")).toBe(false);
  });
});

describe("transformDataTokensInCode", function () {
  // Use project IDs that produce valid JS identifiers when shortened (first 5 chars)
  const projectId = "1hbbcw1cMH46M8XARJt5Jt";
  const shortProjectId = makeShortProjectId(projectId); // "1hbbc"
  const depProjectId = "rDX1t9nUt4dXzzfHmGhHz1";
  const depShortId = makeShortProjectId(depProjectId); // "rDX1t"

  const mockSite = {
    projectDependencies: [
      {
        name: "myDep",
        projectId: depProjectId,
        site: {
          projectDependencies: [],
        },
      },
    ],
  } as unknown as Site;

  it("should transform local token to flat identifier", () => {
    const code = "$dataTokens.myToken";
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(`$dataTokens_${shortProjectId}_myToken`);
  });

  it("should transform dependency token to flat identifier", () => {
    const code = "$dataTokens.myDep.depToken";
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(`$dataTokens_${depShortId}_depToken`);
  });

  it("should not transform dep namespace reference", () => {
    const code = "$dataTokens.myDep";
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe("$dataTokens.myDep");
  });

  it("should transform tokens with nested dot notation", () => {
    // Local
    const code = "$dataTokens.myToken.a.b.c";
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(`$dataTokens_${shortProjectId}_myToken.a.b.c`);

    // Dep
    const depCode = "$dataTokens.myDep.depToken.x.y.z";
    const depResult = transformDataTokensInCode(depCode, mockSite, projectId);
    expect(depResult).toBe(`$dataTokens_${depShortId}_depToken.x.y.z`);
  });

  it("should transform local token with bracket notation", () => {
    const code = '$dataTokens.myToken["key"]';
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(`$dataTokens_${shortProjectId}_myToken["key"]`);
  });

  it("should transform local token with mixed dot and bracket notation", () => {
    const code = '$dataTokens.myToken.a["b"].c[0]';
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(`$dataTokens_${shortProjectId}_myToken.a["b"].c[0]`);
  });

  it("should transform dependency token with mixed notation", () => {
    const code = '$dataTokens.myDep.depToken.nested["prop"]';
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(`$dataTokens_${depShortId}_depToken.nested["prop"]`);
  });

  it("should transform token with nested path in function call", () => {
    const code = "Object.keys($dataTokens.myToken.nested)";
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(
      `Object.keys($dataTokens_${shortProjectId}_myToken.nested)`
    );
  });

  it("should transform multiple tokens in function call", () => {
    const code = "merge($dataTokens.token1, $dataTokens.myDep.token2.data)";
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(
      `merge($dataTokens_${shortProjectId}_token1, $dataTokens_${depShortId}_token2.data)`
    );
  });

  it("should transform token in complex expression", () => {
    const code =
      "($dataTokens.myToken.value || 0) + $dataTokens.myDep.depToken.count";
    const result = transformDataTokensInCode(code, mockSite, projectId);
    expect(result).toBe(
      `($dataTokens_${shortProjectId}_myToken.value || 0) + $dataTokens_${depShortId}_depToken.count`
    );
  });
});

describe("transformDataTokensToDisplay", function () {
  const projectId = "1hbbcw1cMH46M8XARJt5Jt";
  const shortProjectId = makeShortProjectId(projectId); // "1hbbc"
  const depProjectId = "rDX1t9nUt4dXzzfHmGhHz1";
  const depShortId = makeShortProjectId(depProjectId); // "rDX1t"

  const mockSite = {
    projectDependencies: [
      {
        name: "myDep",
        projectId: depProjectId,
        site: {
          projectDependencies: [],
        },
      },
    ],
  } as unknown as Site;

  it("should transform local flat identifier to display format", () => {
    const code = `$dataTokens_${shortProjectId}_myToken`;
    const result = transformDataTokensToDisplay(code, mockSite, projectId);
    expect(result).toBe("$dataTokens.myToken");
  });

  it("should transform dependency flat identifier to display format", () => {
    const code = `$dataTokens_${depShortId}_depToken`;
    const result = transformDataTokensToDisplay(code, mockSite, projectId);
    expect(result).toBe("$dataTokens.myDep.depToken");
  });

  it("should not transform non-data-token code", () => {
    const code = "$props.value + $state.count";
    const result = transformDataTokensToDisplay(code, mockSite, projectId);
    expect(result).toBe(code);
  });

  it("should transform local token with nested dot notation", () => {
    const code = `$dataTokens_${shortProjectId}_myToken.a.b.c`;
    const result = transformDataTokensToDisplay(code, mockSite, projectId);
    expect(result).toBe("$dataTokens.myToken.a.b.c");
  });

  it("should transform dependency token with mixed notation", () => {
    const code = `$dataTokens_${depShortId}_depToken.nested.prop`;
    const result = transformDataTokensToDisplay(code, mockSite, projectId);
    expect(result).toBe("$dataTokens.myDep.depToken.nested.prop");
  });

  it("should transform token in Object.keys()", () => {
    const code = `Object.keys($dataTokens_${shortProjectId}_myToken)`;
    const result = transformDataTokensToDisplay(code, mockSite, projectId);
    expect(result).toBe("Object.keys($dataTokens.myToken)");
  });

  it("should transform token in complex expression", () => {
    const code = `($dataTokens_${shortProjectId}_myToken.value || 0) + $dataTokens_${depShortId}_depToken.count`;
    const result = transformDataTokensToDisplay(code, mockSite, projectId);
    expect(result).toBe(
      "($dataTokens.myToken.value || 0) + $dataTokens.myDep.depToken.count"
    );
  });
});

describe("transformDataTokenPathToBundle", function () {
  const projectId = "1hbbcw1cMH46M8XARJt5Jt";
  const shortProjectId = makeShortProjectId(projectId); // "1hbbc"
  const depProjectId = "rDX1t9nUt4dXzzfHmGhHz1";
  const depShortId = makeShortProjectId(depProjectId); // "rDX1t"

  const mockSite = {
    projectDependencies: [
      {
        name: "myDep",
        projectId: depProjectId,
        site: {
          projectDependencies: [],
        },
      },
    ],
  } as unknown as Site;

  it("should transform local token path to storage format", () => {
    const path = ["$dataTokens", "myToken"];
    const result = transformDataTokenPathToBundle(path, mockSite, projectId);
    expect(result).toEqual([`$dataTokens_${shortProjectId}_myToken`]);
  });

  it("should transform dependency token path to storage format", () => {
    const path = ["$dataTokens", "myDep", "depToken"];
    const result = transformDataTokenPathToBundle(path, mockSite, projectId);
    expect(result).toEqual([`$dataTokens_${depShortId}_depToken`]);
  });

  it("should not transform non-dataTokens paths", () => {
    const path = ["$props", "value"];
    const result = transformDataTokenPathToBundle(path, mockSite, projectId);
    expect(result).toEqual(path);
  });

  it("should transform local token path with nested properties", () => {
    const path = ["$dataTokens", "myToken", "a", "b", "c"];
    const result = transformDataTokenPathToBundle(path, mockSite, projectId);
    expect(result).toEqual([
      `$dataTokens_${shortProjectId}_myToken`,
      "a",
      "b",
      "c",
    ]);
  });

  it("should transform dependency token path with numeric indices", () => {
    const path = ["$dataTokens", "myDep", "depToken", "items", 0];
    const result = transformDataTokenPathToBundle(path, mockSite, projectId);
    expect(result).toEqual([`$dataTokens_${depShortId}_depToken`, "items", 0]);
  });

  it("should not transform dep namespace without token name", () => {
    const path = ["$dataTokens", "myDep"];
    const result = transformDataTokenPathToBundle(path, mockSite, projectId);
    expect(result).toEqual(path);
  });
});

describe("transformDataTokenPathToDisplay and pathToDisplayString", function () {
  const projectId = "1hbbcw1cMH46M8XARJt5Jt";
  const shortProjectId = makeShortProjectId(projectId); // "1hbbc"
  const depProjectId = "rDX1t9nUt4dXzzfHmGhHz1";
  const depShortId = makeShortProjectId(depProjectId); // "rDX1t"

  const mockSite = {
    projectDependencies: [
      {
        name: "myDep",
        projectId: depProjectId,
        site: {
          projectDependencies: [],
        },
      },
    ],
  } as unknown as Site;

  it("should transform local storage path to display format", () => {
    const path = [`$dataTokens_${shortProjectId}_myToken`];
    const result = transformDataTokenPathToDisplay(path, mockSite, projectId);
    expect(result).toEqual(["$dataTokens", "myToken"]);
  });

  it("should transform dependency storage path to display format", () => {
    const path = [`$dataTokens_${depShortId}_depToken`];
    const result = transformDataTokenPathToDisplay(path, mockSite, projectId);
    expect(result).toEqual(["$dataTokens", "myDep", "depToken"]);
  });

  it("should not transform non-token paths", () => {
    const path = ["$props", "value"];
    const result = transformDataTokenPathToDisplay(path, mockSite, projectId);
    expect(result).toEqual(path);
  });

  it("should transform local token path with nested properties", () => {
    const path = [`$dataTokens_${shortProjectId}_myToken`, "a", "b", "c"];
    const result = transformDataTokenPathToDisplay(path, mockSite, projectId);
    expect(result).toEqual(["$dataTokens", "myToken", "a", "b", "c"]);
  });

  it("should transform dependency token path with numeric indices", () => {
    const path = [`$dataTokens_${depShortId}_depToken`, "items", 0];
    const result = transformDataTokenPathToDisplay(path, mockSite, projectId);
    expect(result).toEqual(["$dataTokens", "myDep", "depToken", "items", 0]);
  });

  it("should handle path with only flat identifier", () => {
    const path = [`$dataTokens_${shortProjectId}_myToken`];
    const result = transformDataTokenPathToDisplay(path, mockSite, projectId);
    expect(result).toEqual(["$dataTokens", "myToken"]);
  });

  it("should preserve complex nested structures", () => {
    const path = [
      `$dataTokens_${shortProjectId}_myToken`,
      "data",
      "items",
      0,
      "value",
    ];
    const result = transformDataTokenPathToDisplay(path, mockSite, projectId);
    expect(result).toEqual([
      "$dataTokens",
      "myToken",
      "data",
      "items",
      0,
      "value",
    ]);
  });

  it("should convert local token without nested properties to string", () => {
    const path = [`$dataTokens_${shortProjectId}_myToken`];
    const result = pathToDisplayString(path, mockSite, projectId);
    expect(result).toBe("$dataTokens.myToken");
  });

  it("should convert local token with nested properties to string", () => {
    const path = [`$dataTokens_${shortProjectId}_myToken`, "a", "b", 0];
    const result = pathToDisplayString(path, mockSite, projectId);
    expect(result).toBe("$dataTokens.myToken.a.b[0]");
  });
});

describe("parseDataTokenIdentifier", function () {
  it("should parse data token identifier with simple name", () => {
    const result = parseDataTokenIdentifier("$dataTokens_qfp12_name");
    expect(result).toEqual({
      identifier: "$dataTokens_qfp12_name",
      projectShortId: "qfp12",
      tokenName: "name",
    });
  });

  it("should parse data token identifier with underscored name", () => {
    const result = parseDataTokenIdentifier(
      "$dataTokens_qfp12_underscored_name"
    );
    expect(result).toEqual({
      identifier: "$dataTokens_qfp12_underscored_name",
      projectShortId: "qfp12",
      tokenName: "underscored_name",
    });
  });
});

describe("extractDataTokenIdentifiers", function () {
  it("should extract identifier from ObjectPath", () => {
    const objectPath = new ObjectPath({
      path: ["$dataTokens_abc12_token1", "nested", "prop"],
      fallback: null,
    });
    const result = extractDataTokenIdentifiers(objectPath);
    expect(result).toEqual(["$dataTokens_abc12_token1"]);
  });

  it("should extract identifier from CustomCode", () => {
    const customCode = new CustomCode({
      code: "($dataTokens_abc12_token1 + $dataTokens_xyz99_token2)",
      fallback: null,
    });
    const result = extractDataTokenIdentifiers(customCode);
    expect(result).toEqual([
      "$dataTokens_abc12_token1",
      "$dataTokens_xyz99_token2",
    ]);
  });

  it("should extract from mixed CustomCode with member expressions", () => {
    const customCode = new CustomCode({
      code: "($dataTokens_abc12_token.nested.prop + $dataTokens_xyz99_token[0])",
      fallback: null,
    });
    const result = extractDataTokenIdentifiers(customCode);
    expect(result).toEqual([
      "$dataTokens_abc12_token",
      "$dataTokens_xyz99_token",
    ]);
  });

  it("should handle deeply nested composite expressions", () => {
    const innerObjectPath = new ObjectPath({
      path: ["$dataTokens_level3_token"],
      fallback: null,
    });
    const innerCustomCode = new CustomCode({
      code: "($dataTokens_level2_tokenA)",
      fallback: null,
    });
    const innerComposite = new CompositeExpr({
      hostLiteral: "{inner}",
      substitutions: { inner: innerObjectPath },
    });
    const middleComposite = new CompositeExpr({
      hostLiteral: "Middle: {code}{comp}",
      substitutions: { code: innerCustomCode, comp: innerComposite },
    });
    const outerObjectPath = new ObjectPath({
      path: ["$dataTokens_level1_token"],
      fallback: null,
    });
    const nonTokenPath = new ObjectPath({
      path: ["$state", "value"],
      fallback: null,
    });
    const outerComposite = new CompositeExpr({
      hostLiteral: "Outer: {{outer}} {{middle}} {{nonToken}}",
      substitutions: {
        outer: outerObjectPath,
        middle: middleComposite,
        nonToken: nonTokenPath,
      },
    });
    const result = flattenExprs(outerComposite)
      .filter(isDataTokenExpr)
      .flatMap(extractDataTokenIdentifiers);
    expect(result).toEqual([
      "$dataTokens_level1_token",
      "$dataTokens_level2_tokenA",
      "$dataTokens_level3_token",
    ]);
  });
});
