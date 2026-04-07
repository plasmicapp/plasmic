import {
  mkComponentWithQueries,
  mkCustomCodeOp,
  mkCustomFunctionExpr,
  mkServerQuery,
} from "@/wab/shared/codegen/react-p/server-queries/test-utils";
import {
  ServerQueryWithOperation,
  getReferencedQueryNamesInCustomCode,
} from "@/wab/shared/codegen/react-p/server-queries/utils";

describe("getReferencedQueryNamesInCustomCode", () => {
  it("returns referenced query varNames from custom code", () => {
    const q1 = mkServerQuery("All Todos", mkCustomFunctionExpr("fn"));
    const q2 = mkServerQuery("firstTodo", mkCustomCodeOp("$q.allTodos[0]"));
    const component = mkComponentWithQueries(q1, q2);

    const refs = getReferencedQueryNamesInCustomCode(
      q2 as ServerQueryWithOperation,
      component
    );
    expect(refs).toEqual(["allTodos"]);
  });

  it("returns multiple referenced queries", () => {
    const q1 = mkServerQuery("queryA", mkCustomCodeOp("1"));
    const q2 = mkServerQuery("queryB", mkCustomCodeOp("2"));
    const q3 = mkServerQuery(
      "combined",
      mkCustomCodeOp("$q.queryA + $q.queryB.data")
    );
    const component = mkComponentWithQueries(q1, q2, q3);

    const refs = getReferencedQueryNamesInCustomCode(
      q3 as ServerQueryWithOperation,
      component
    );
    expect(refs).toEqual(["queryA", "queryB"]);
  });

  it("does not include self-references", () => {
    const q1 = mkServerQuery("myQuery", mkCustomCodeOp("$q.myQuery"));
    const component = mkComponentWithQueries(q1);

    const refs = getReferencedQueryNamesInCustomCode(
      q1 as ServerQueryWithOperation,
      component
    );
    expect(refs).toEqual([]);
  });

  it("does not match partial names (word boundary)", () => {
    const q1 = mkServerQuery("todo", mkCustomCodeOp("1"));
    const q2 = mkServerQuery("todos", mkCustomCodeOp("2"));
    const q3 = mkServerQuery("check", mkCustomCodeOp("$q.todo.title"));
    const component = mkComponentWithQueries(q1, q2, q3);

    const refs = getReferencedQueryNamesInCustomCode(
      q3 as ServerQueryWithOperation,
      component
    );
    expect(refs).toEqual(["todo"]);
  });

  it("matches multiline $q references", () => {
    const q1 = mkServerQuery("todos", mkCustomCodeOp("1"));
    const q2 = mkServerQuery(
      "check",
      mkCustomCodeOp(`$q
                        .todos
                        .data`)
    );
    const component = mkComponentWithQueries(q1, q2);

    const refs = getReferencedQueryNamesInCustomCode(
      q2 as ServerQueryWithOperation,
      component
    );
    expect(refs).toEqual(["todos"]);
  });

  it("returns empty array for CustomFunctionExpr ops even with $q references in args", () => {
    const q1 = mkServerQuery("todos", mkCustomFunctionExpr("fn"));
    const q2 = mkServerQuery(
      "other",
      mkCustomFunctionExpr(
        "fn2",
        ["p1"],
        [{ name: "p1", code: "$q.todos.data" }]
      )
    );
    const component = mkComponentWithQueries(q1, q2);

    const refs = getReferencedQueryNamesInCustomCode(
      q2 as ServerQueryWithOperation,
      component
    );
    expect(refs).toEqual([]);
  });

  it("skips queries without operations", () => {
    const q1 = mkServerQuery("unconfigured", null);
    const q2 = mkServerQuery("myQuery", mkCustomCodeOp("$q.unconfigured"));
    const component = mkComponentWithQueries(q1, q2);

    const refs = getReferencedQueryNamesInCustomCode(
      q2 as ServerQueryWithOperation,
      component
    );
    expect(refs).toEqual([]);
  });
});
