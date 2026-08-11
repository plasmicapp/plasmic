import { createComponent } from "@/wab/client/operations/create-component";
import { createComponentState } from "@/wab/client/operations/create-component-state";
import { deleteComponentState } from "@/wab/client/operations/delete-component-state";
import {
  setupComponentWithInstance,
  setupComponentWithTplTree,
} from "@/wab/client/operations/tests/utils";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { getStateVarName } from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplTag, isKnownVariantGroupState } from "@/wab/shared/model/classes";

describe("deleteComponentState", () => {
  function setupWithState() {
    const { site, tplMgr } = setupComponentWithTplTree(
      Tpls.mkTplTagX("div", {})
    );
    const created = createComponent({
      tplMgr,
      name: "StateTest",
      type: ComponentType.Plain,
    });
    assert(created.isOk(), "setup failed");
    const component = created.value;
    const stateResult = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
    });
    assert(stateResult.isOk(), "state setup failed");
    return { site, tplMgr, component, state: stateResult.value };
  }

  it("deletes an unreferenced state along with both its params", () => {
    const { site, component, state } = setupWithState();

    const result = deleteComponentState(state, { site, component });

    assert(result.isOk(), "expected success result");
    expect(component.states).not.toContain(state);
    expect(component.params).not.toContain(state.param);
    expect(component.params).not.toContain(state.onChangeParam);
  });

  it("blocks deletion while the state is referenced in its component", () => {
    const { site, component, state } = setupWithState();
    const root = component.tplTree as TplTag;
    const vs = ensureVariantSetting(root, [getBaseVariant(component)]);
    vs.attrs["title"] = customCode(`$state.${getStateVarName(state)}`);

    const result = deleteComponentState(state, { site, component });

    assert(result.isErr(), "expected error result");
    expect(result.error).toMatchObject({
      message:
        'Cannot delete state "count": it is referenced in component "StateTest".',
      referencingNode: root,
    });
    expect(component.states).toContain(state);
  });

  it("blocks deletion while implicit copies are referenced elsewhere", () => {
    const { site, tplMgr, page, button, instance } =
      setupComponentWithInstance();
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "count",
      accessType: "readonly",
    });
    assert(created.isOk(), "state setup failed");
    const implicitState = page.states.find(
      (s) => s.implicitState === created.value && s.tplNode === instance
    );
    assert(implicitState, "expected an implicit state on the page");
    const pageRoot = page.tplTree as TplTag;
    const vs = ensureVariantSetting(pageRoot, [getBaseVariant(page)]);
    vs.attrs["title"] = customCode(`$state.${getStateVarName(implicitState)}`);

    const result = deleteComponentState(created.value, {
      site,
      component: button,
    });

    // The Button already has a "count" prop param, so the created
    // state is deduped to "count 2" (var name "count2").
    assert(result.isErr(), "expected error result");
    expect(result.error).toMatchObject({
      message:
        'Cannot delete state "count2": it is referenced in UnnamedComponent.',
    });
    expect(button.states).toContain(created.value);
  });

  it("deletes a public state and removes its unreferenced implicit copies", () => {
    const { site, tplMgr, page, button } = setupComponentWithInstance();
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "count",
      accessType: "readonly",
    });
    assert(created.isOk(), "state setup failed");
    expect(page.states).toHaveLength(1);

    const result = deleteComponentState(created.value, {
      site,
      component: button,
    });

    assert(result.isOk(), "expected success result");
    expect(page.states).toHaveLength(0);
  });

  it("rejects implicit states", () => {
    const { site, tplMgr, page, button, instance } =
      setupComponentWithInstance();
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "count",
      accessType: "readonly",
    });
    assert(created.isOk(), "state setup failed");
    const implicitState = page.states.find(
      (s) => s.implicitState === created.value && s.tplNode === instance
    );
    assert(implicitState, "expected an implicit state on the page");

    const result = deleteComponentState(implicitState, {
      site,
      component: page,
    });

    assert(result.isErr(), "expected error result");
    expect(result.error).toMatchObject({
      message:
        'State "button.count2" is an implicit state; it can only be removed by deleting its element.',
    });
  });

  it("rejects variant-group states", () => {
    const { site, button } = setupComponentWithInstance();
    const variantGroupState = button.states.find((s) =>
      isKnownVariantGroupState(s)
    );
    assert(variantGroupState, "expected a variant-group state");

    const result = deleteComponentState(variantGroupState, {
      site,
      component: button,
    });

    assert(result.isErr(), "expected error result");
    expect(result.error).toMatchObject({
      message:
        'State "size" backs a variant group; delete the variant group instead.',
    });
  });
});
