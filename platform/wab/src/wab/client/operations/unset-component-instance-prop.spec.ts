import { setComponentInstanceProp } from "@/wab/client/operations/set-component-instance-prop";
import { setupComponentWithInstance } from "@/wab/client/operations/tests/utils";
import { unsetComponentInstanceProp } from "@/wab/client/operations/unset-component-instance-prop";
import { assert } from "@/wab/shared/common";

describe("unsetComponentInstanceProp", () => {
  it("unsets a set prop", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    setComponentInstanceProp(instance, "label", "Buy", opts);
    const result = unsetComponentInstanceProp(instance, "label", opts);

    expect(result.result).toEqual("success");
    expect(getArg(instance, "label")).toBeUndefined();
  });

  it("unsets a variant group selection", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    setComponentInstanceProp(instance, "size", "small", opts);
    const result = unsetComponentInstanceProp(instance, "size", opts);

    expect(result.result).toEqual("success");
    expect(getArg(instance, "size")).toBeUndefined();
  });

  it("is a no-op on an already-unset prop", () => {
    const { instance, opts } = setupComponentWithInstance();

    const result = unsetComponentInstanceProp(instance, "label", opts);

    expect(result.result).toEqual("success");
  });

  it("errors on an unknown prop", () => {
    const { instance, opts } = setupComponentWithInstance();

    const result = unsetComponentInstanceProp(instance, "nope", opts);

    assert(result.result === "error", "expected error");
    expect(result.message).toContain(`has no prop "nope"`);
  });

  it("errors on a slot prop", () => {
    const { instance, opts } = setupComponentWithInstance();

    const result = unsetComponentInstanceProp(instance, "children", opts);

    assert(result.result === "error", "expected error");
    expect(result.message).toContain("slot");
  });
});
