import { _testonly } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerCodeEditorLayout";
const { cleanDataForPreview } = _testonly;

describe("cleanDataForPreview", () => {
  it("should handle circular references without stack overflow", () => {
    // Create an object with a circular reference
    const circularObj: any = {
      name: "test",
      nested: {
        value: "nested value",
        __plasmicKey: "should be filtered",
      },
    };
    // Create circular reference
    circularObj.self = circularObj;
    circularObj.nested.parent = circularObj;

    // This should not throw "Maximum call stack size exceeded"
    const result = cleanDataForPreview(circularObj);

    expect(result).toBeDefined();
    expect(result.name).toBe("test");
    expect(result.nested.value).toBe("nested value");
    expect(result.nested.__plasmicKey).toBeUndefined();
    // Circular reference is cleaned (and preserved)
    expect(result.self).toBe(result);
    expect(result.nested.parent).toBe(result);
    expect(result.nested.parent.nested.__plasmicKey).toBeUndefined();
  });

  it("regression - should handle deeply nested circular references", () => {
    // Simulate failing production case
    const Tags = ["first", "second"];

    const ctx = {
      "Product Meta": {
        Tags,
        data: { nested: "value" },
      } as any,
    };

    // Create circular reference
    ctx["Product Meta"].ctx = ctx;

    const data = {
      $props: { quantitySelector: true },
      $ctx: ctx,
    };

    // This should not throw "Maximum call stack size exceeded"
    const result = cleanDataForPreview(data);

    expect(result).toBeDefined();
    expect(result.$props.quantitySelector).toBe(true);
    expect(result.$ctx["Product Meta"].Tags).toEqual(["first", "second"]);
    // Circular reference is preserved
    expect(result.$ctx["Product Meta"].ctx).toBe(result.$ctx);
  });

  it("should filter out $dataTokens_ and __plasmicKey prefixed keys", () => {
    const data = {
      normalKey: "value",
      $dataTokens_key: "should be filtered",
      dataTokensEnv: "should be filtered",
      registerInitFunc: "should be filtered",
      eagerInitializeStates: "should be filtered",
      __plasmicKey: "should be filtered",
      nested: {
        normalNested: "nested value",
        __plasmicNested: "should be filtered",
      },
    };

    const result = cleanDataForPreview(data);
    expect(result).toEqual({
      normalKey: "value",
      nested: { normalNested: "nested value" },
    });
  });

  it("should clean all references to the same object, not just the first", () => {
    const sharedObj = { value: "keep", __plasmicKey: "should be filtered" };
    const data = {
      first: { ref: sharedObj },
      second: { ref: sharedObj },
    };

    const result = cleanDataForPreview(data);

    // Both references should be cleaned
    expect(result).toEqual({
      first: { ref: { value: "keep" } },
      second: { ref: { value: "keep" } },
    });
  });
});
