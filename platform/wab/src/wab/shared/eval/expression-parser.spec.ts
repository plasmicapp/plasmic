import {
  codeUsesGlobalObjects,
  emptyParsedExprInfo,
  parseCodeExpression,
  pathToString,
  renameObjectKey,
  replaceVarWithProp,
} from "@/wab/shared/eval/expression-parser";

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
