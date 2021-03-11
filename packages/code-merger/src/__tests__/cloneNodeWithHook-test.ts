import * as babel from "@babel/core";
import { cloneDeepWithHook } from "../cloneDeepWithHook";
import { code, formatted, parseExpr, tagName } from "../utils";

describe("cloneNodeWithHook", function () {
  it("should work", function () {
    const input = `<div>{"Greeting"}<a className={"aClass"}></a><span/></div>`;
    const ast = parseExpr(input);
    const cloned = cloneDeepWithHook(ast, (n) => {
      if (n.type === "StringLiteral") {
        return babel.types.stringLiteral("Hello world");
      } else if (n.type === "JSXAttribute") {
        const cloned = babel.types.cloneDeep(n);
        cloned.name.name = "replacedAttr";
        return cloned;
      } else if (n.type === "JSXElement" && tagName(n) === "span") {
        const newSpan = "rh.showSpan() && <span>This is new span</span>";
        return babel.types.jsxExpressionContainer(parseExpr(newSpan));
      }
      return undefined;
    });
    expect(code(cloned)).toEqual(
      formatted(
        `<div>
          {"Hello world"}
          <a replacedAttr={"aClass"}>
          </a>
          {rh.showSpan() && <span>This is new span</span>}
        </div>`
      )
    );
  });
});
