import { createComponentState } from "@/wab/client/operations/create-component-state";
import { deleteComponentProp } from "@/wab/client/operations/delete-component-prop";
import { setupComponentWithInstance } from "@/wab/client/operations/tests/utils";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert, ensure } from "@/wab/shared/common";
import { codeLit, customCode } from "@/wab/shared/core/exprs";
import { Param, TplTag } from "@/wab/shared/model/classes";

describe("deleteComponentProp", () => {
  function setup() {
    const fixture = setupComponentWithInstance();
    const findParam = (name: string): Param =>
      ensure(
        fixture.button.params.find((p) => p.variable.name === name),
        `param "${name}" must exist`
      );
    return {
      ...fixture,
      findParam,
      opts: { site: fixture.site, component: fixture.button },
    };
  }

  it("deletes an unreferenced prop and strips instance args", () => {
    const { tplMgr, instance, vs, findParam, opts } = setup();
    const param = findParam("label");
    tplMgr.setArg(instance, vs, param.variable, codeLit("Hello"));
    expect(vs.args.some((arg) => arg.param === param)).toEqual(true);

    const result = deleteComponentProp(param, opts);

    assert(result.isOk(), "expected success result");
    expect(opts.component.params).not.toContain(param);
    expect(vs.args.some((arg) => arg.param === param)).toEqual(false);
  });

  it("blocks deletion while the prop is referenced in the component", () => {
    const { button, findParam, opts } = setup();
    const param = findParam("label");
    const root = button.tplTree as TplTag;
    const rootVs = ensureVariantSetting(root, [getBaseVariant(button)]);
    rootVs.attrs["title"] = customCode("$props.label");

    const result = deleteComponentProp(param, opts);

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Cannot delete prop "label": it is referenced in component "Button".'
    );
    expect(button.params).toContain(param);
  });

  it("rejects the params of a read-and-write state", () => {
    const { site, tplMgr, button, opts } = setup();
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "search",
      accessType: "writable",
    });
    assert(created.isOk(), "state setup failed");

    expect(
      deleteComponentProp(created.value.param, opts)._unsafeUnwrapErr().message
    ).toEqual(
      'Prop "search" is linked to a state; manage it through state operations.'
    );
    expect(
      deleteComponentProp(created.value.onChangeParam, opts)._unsafeUnwrapErr()
        .message
    ).toEqual(
      'Prop "On search change" is linked to a state; manage it through state operations.'
    );
    expect(button.params).toContain(created.value.param);
  });

  it("rejects params that are not plain props", () => {
    const { sizeGroup, findParam, opts } = setup();

    expect(
      deleteComponentProp(findParam("children"), opts)._unsafeUnwrapErr()
        .message
    ).toEqual(
      'Param "children" is a slot; slots are managed through the element tree.'
    );
    expect(
      deleteComponentProp(sizeGroup.param, opts)._unsafeUnwrapErr().message
    ).toEqual(
      'Param "size" backs a variant group; manage it through variant group operations.'
    );
  });
});
