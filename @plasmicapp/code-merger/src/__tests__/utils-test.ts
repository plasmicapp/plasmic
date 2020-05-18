import { code, parseExpr, nodesDeepEqualIgnoreComments } from "../utils";

describe("utils", function () {
  it("should work", function () {
    const ast1 = parseExpr(`
    <div>
        {
            // comment
            "Hello World"
        }
    </div>`);
    const ast2 = parseExpr(`
    <div>
        {
            "Hello World"
        }
    </div>`);
    expect(code(ast1)).not.toEqual(code(ast2));
    expect(nodesDeepEqualIgnoreComments(ast1, ast2)).toBeTruthy();
  });
});
