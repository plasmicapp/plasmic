import { createComponentState } from "@/wab/client/operations/create-component-state";
import { createInteraction } from "@/wab/client/operations/create-interaction";
import { createVariant } from "@/wab/client/operations/create-variant";
import { createVariantGroup } from "@/wab/client/operations/create-variant-group";
import { setupComponentWithInstance } from "@/wab/client/operations/tests/utils";
import { updateInteraction } from "@/wab/client/operations/update-interaction";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { codeLit } from "@/wab/shared/core/exprs";
import {
  UpdateVariableOperations,
  UpdateVariantOperations,
  addComponentState,
  mkValueStateForTextInput,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  Interaction,
  TplTag,
  ensureKnownCustomCode,
  ensureKnownFunctionExpr,
  ensureKnownObjectPath,
  ensureKnownVarRef,
  ensureKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { err } from "neverthrow";

describe("built-in interaction actions", () => {
  function setup() {
    const fixture = setupComponentWithInstance();
    const pageRoot = fixture.page.tplTree as TplTag;
    ensureVariantSetting(pageRoot, [getBaseVariant(fixture.page)]);
    const buttonRoot = fixture.button.tplTree as TplTag;
    ensureVariantSetting(buttonRoot, [getBaseVariant(fixture.button)]);
    return { ...fixture, pageRoot, buttonRoot };
  }

  function argExpr(interaction: Interaction, name: string) {
    const arg = interaction.args.find((a) => a.name === name);
    assert(arg, `expected an arg named "${name}"`);
    return arg.expr;
  }

  describe("updateVariable", () => {
    function setupWithState() {
      const fixture = setup();
      for (const [name, variableType] of [
        ["count", "number"],
        ["items", "array"],
      ] as const) {
        const stateResult = createComponentState({
          site: fixture.site,
          component: fixture.page,
          tplMgr: fixture.tplMgr,
          name,
          variableType,
        });
        assert(stateResult.isOk(), "state setup failed");
      }
      return fixture;
    }

    it("builds the serializer's arg shapes", () => {
      const fixture = setupWithState();

      const result = createInteraction({
        component: fixture.page,
        tpl: fixture.pageRoot,
        eventName: "onClick",
        name: "Set count",
        action: {
          actionName: "updateVariable",
          variable: ["count"],
          operation: "NewValue",
          value: "{{ 5 }}",
        },
      });

      assert(result.isOk(), "expected success result");
      const interaction = result.value;
      expect(interaction.actionName).toEqual("updateVariable");
      expect(
        ensureKnownObjectPath(argExpr(interaction, "variable"))
      ).toMatchObject({ path: ["$state", "count"] });
      expect(
        ensureKnownCustomCode(argExpr(interaction, "operation"))
      ).toMatchObject({ code: `${UpdateVariableOperations.NewValue}` });
      expect(
        ensureKnownCustomCode(argExpr(interaction, "value"))
      ).toMatchObject({ code: "5" });
    });

    it("accepts a path with the $state prefix and value-less operations", () => {
      const fixture = setupWithState();

      const result = createInteraction({
        component: fixture.page,
        tpl: fixture.pageRoot,
        eventName: "onClick",
        name: "Bump",
        action: {
          actionName: "updateVariable",
          variable: ["$state", "count"],
          operation: "Increment",
        },
      });

      assert(result.isOk(), "expected success result");
      expect(
        ensureKnownObjectPath(argExpr(result.value, "variable"))
      ).toMatchObject({ path: ["$state", "count"] });
      expect(result.value.args.find((a) => a.name === "value")).toBeUndefined();
    });

    it("rejects unknown states and mispaired fields", () => {
      const fixture = setupWithState();
      const create = (
        action: Parameters<typeof createInteraction>[0]["action"]
      ) =>
        createInteraction({
          component: fixture.page,
          tpl: fixture.pageRoot,
          eventName: "onClick",
          name: "Step",
          action,
        });

      expect(
        create({
          actionName: "updateVariable",
          variable: ["total"],
          operation: "NewValue",
          value: "5",
        })
      ).toEqual(
        err({
          message: `State "total" not found on component "UnnamedComponent". Available states: count, items.`,
        })
      );
      expect(
        create({
          actionName: "updateVariable",
          variable: ["count"],
          operation: "Toggle",
        })
      ).toEqual(
        err({
          message: `Operation "Toggle" is not available for state "count" of type "number". Available operations: Increment, Decrement, NewValue, ClearValue.`,
        })
      );
      expect(
        create({
          actionName: "updateVariable",
          variable: ["count"],
          operation: "NewValue",
        })
      ).toEqual(err({ message: `Operation "NewValue" requires a "value".` }));
      expect(
        create({
          actionName: "updateVariable",
          variable: ["count"],
          operation: "Increment",
          value: "5",
        })
      ).toEqual(
        err({ message: `Operation "Increment" does not take a "value".` })
      );
      expect(
        create({
          actionName: "updateVariable",
          variable: ["items"],
          operation: "Splice",
        })
      ).toEqual(
        err({
          message: `Operation "Splice" requires "startIndex" and "deleteCount".`,
        })
      );
      expect(
        create({
          actionName: "updateVariable",
          variable: ["count"],
          operation: "NewValue",
          value: "5",
          startIndex: 0,
        })
      ).toEqual(
        err({
          message: `Only the "Splice" operation takes "startIndex"/"deleteCount".`,
        })
      );
    });
  });

  describe("updateVariable with implicit states", () => {
    it("matches implicit element states by their read-surface name", () => {
      const fixture = setup();
      const emailInput = Tpls.mkTplTagX("input", {});
      emailInput.name = "email";
      fixture.pageRoot.children.push(emailInput);
      emailInput.parent = fixture.pageRoot;
      const state = mkValueStateForTextInput(
        emailInput,
        fixture.page,
        fixture.tplMgr
      );
      addComponentState(fixture.site, fixture.page, state);

      // Both the pre-split path and the read name passed verbatim work.
      for (const variable of [["email", "value"], ["email.value"]]) {
        const result = createInteraction({
          component: fixture.page,
          tpl: fixture.pageRoot,
          eventName: "onClick",
          name: "Set email",
          action: {
            actionName: "updateVariable",
            variable,
            operation: "NewValue",
            value: "hello",
          },
        });
        assert(result.isOk(), "expected success result");
        expect(
          ensureKnownObjectPath(argExpr(result.value, "variable"))
        ).toMatchObject({ path: ["$state", "email", "value"] });
      }
    });
  });

  describe("updateVariable with repeated implicit states", () => {
    it("rejects repeated element states, pointing at customFunction", () => {
      const fixture = setup();
      const emailInput = Tpls.mkTplTagX("input", {});
      emailInput.name = "email";
      fixture.pageRoot.children.push(emailInput);
      emailInput.parent = fixture.pageRoot;
      const vs = ensureVariantSetting(emailInput, [
        getBaseVariant(fixture.page),
      ]);
      vs.dataRep = Tpls.mkRep("currentItem", codeLit([1, 2]));
      const state = mkValueStateForTextInput(
        emailInput,
        fixture.page,
        fixture.tplMgr
      );
      addComponentState(fixture.site, fixture.page, state);

      const create = (
        action: Parameters<typeof createInteraction>[0]["action"]
      ) =>
        createInteraction({
          component: fixture.page,
          tpl: fixture.pageRoot,
          eventName: "onClick",
          name: "Step",
          action,
        });

      expect(
        create({
          actionName: "updateVariable",
          variable: ["email[]", "value"],
          operation: "NewValue",
          value: "hello",
        })
      ).toEqual(
        err({
          message: `State "email[].value" belongs to a repeated element and holds one value per row, so it is not supported by updateVariable. Use a "customFunction" step to target an exact row index in code (e.g. $state.email[0].value).`,
        })
      );
    });
  });

  describe("updateVariant", () => {
    it("builds a VarRef/VariantsRef for a single-select group", () => {
      const fixture = setup();

      const result = createInteraction({
        component: fixture.button,
        tpl: fixture.buttonRoot,
        eventName: "onClick",
        name: "Grow",
        action: {
          actionName: "updateVariant",
          vgroup: "size",
          operation: "NewValue",
          value: ["large"],
        },
      });

      assert(result.isOk(), "expected success result");
      const interaction = result.value;
      expect(interaction.actionName).toEqual("updateVariant");
      expect(ensureKnownVarRef(argExpr(interaction, "vgroup")).variable).toBe(
        fixture.sizeGroup.param.variable
      );
      expect(
        ensureKnownCustomCode(argExpr(interaction, "operation"))
      ).toMatchObject({ code: `${UpdateVariantOperations.NewValue}` });
      expect(
        ensureKnownVariantsRef(argExpr(interaction, "value")).variants.map(
          (v) => v.name
        )
      ).toEqual(["large"]);
    });

    it("accepts the read-surface (varName) group name", () => {
      const fixture = setup();
      const groupResult = createVariantGroup({
        component: fixture.button,
        tplMgr: fixture.tplMgr,
        name: "Display mode",
        optionsType: VariantOptionsType.singleChoice,
      });
      assert(groupResult.isOk(), "group setup failed");
      const variantResult = createVariant({
        component: fixture.button,
        tplMgr: fixture.tplMgr,
        variantGroup: groupResult.value,
        name: "compact",
      });
      assert(variantResult.isOk(), "variant setup failed");

      const result = createInteraction({
        component: fixture.button,
        tpl: fixture.buttonRoot,
        eventName: "onClick",
        name: "Compact",
        action: {
          actionName: "updateVariant",
          vgroup: "displayMode",
          operation: "NewValue",
          value: ["compact"],
        },
      });

      assert(result.isOk(), "expected success result");
      expect(ensureKnownVarRef(argExpr(result.value, "vgroup")).variable).toBe(
        groupResult.value.param.variable
      );
    });

    it("supports toggle groups without a value", () => {
      const fixture = setup();

      const result = createInteraction({
        component: fixture.button,
        tpl: fixture.buttonRoot,
        eventName: "onClick",
        name: "Toggle dark",
        action: {
          actionName: "updateVariant",
          vgroup: "dark",
          operation: "Toggle",
        },
      });

      assert(result.isOk(), "expected success result");
      expect(
        ensureKnownCustomCode(argExpr(result.value, "operation"))
      ).toMatchObject({ code: `${UpdateVariantOperations.Toggle}` });
      expect(result.value.args.find((a) => a.name === "value")).toBeUndefined();
    });

    it("rejects unknown groups, unavailable operations, and unknown variants", () => {
      const fixture = setup();
      const create = (
        action: Parameters<typeof createInteraction>[0]["action"]
      ) =>
        createInteraction({
          component: fixture.button,
          tpl: fixture.buttonRoot,
          eventName: "onClick",
          name: "Step",
          action,
        });

      expect(
        create({
          actionName: "updateVariant",
          vgroup: "theme",
          operation: "NewValue",
          value: ["large"],
        })
      ).toEqual(
        err({
          message: `Variant group "theme" not found on component "Button". Available groups: size, features, dark.`,
        })
      );
      expect(
        create({
          actionName: "updateVariant",
          vgroup: "dark",
          operation: "NewValue",
          value: ["dark"],
        })
      ).toEqual(
        err({
          message: `Operation "NewValue" is not available for variant group "dark". Available operations: Toggle, Activate, Deactivate.`,
        })
      );
      expect(
        create({
          actionName: "updateVariant",
          vgroup: "size",
          operation: "MultiToggle",
          value: ["large"],
        })
      ).toEqual(
        err({
          message: `Operation "MultiToggle" is not available for variant group "size". Available operations: NewValue, ClearValue.`,
        })
      );
      expect(
        create({
          actionName: "updateVariant",
          vgroup: "size",
          operation: "NewValue",
          value: ["small", "large"],
        })
      ).toEqual(
        err({
          message: `Variant group "size" is single-select; "value" must contain exactly one variant name.`,
        })
      );
      expect(
        create({
          actionName: "updateVariant",
          vgroup: "size",
          operation: "NewValue",
          value: ["huge"],
        })
      ).toEqual(
        err({
          message: `Variant "huge" not found in group "size". Available variants: small, large.`,
        })
      );
      expect(
        create({
          actionName: "updateVariant",
          vgroup: "size",
          operation: "ClearValue",
          value: ["large"],
        })
      ).toEqual(
        err({ message: `Operation "ClearValue" does not take a "value".` })
      );
    });
  });

  describe("switching action kinds via update", () => {
    it("replaces a run-code step with an updateVariable step and back", () => {
      const fixture = setup();
      const stateResult = createComponentState({
        site: fixture.site,
        component: fixture.page,
        tplMgr: fixture.tplMgr,
        name: "count",
        variableType: "number",
      });
      assert(stateResult.isOk(), "state setup failed");

      const created = createInteraction({
        component: fixture.page,
        tpl: fixture.pageRoot,
        eventName: "onClick",
        name: "Save",
        action: { actionName: "customFunction", code: "$state.count + 1" },
      });
      assert(created.isOk(), "setup failed");
      const interaction = created.value;

      const switched = updateInteraction(fixture.page, interaction, {
        action: {
          actionName: "updateVariable",
          variable: ["count"],
          operation: "Increment",
        },
      });
      assert(switched.isOk(), "expected success result");
      expect(interaction.actionName).toEqual("updateVariable");
      expect(interaction.interactionName).toEqual("Save");
      expect(interaction.args.map((a) => a.name).sort()).toEqual([
        "operation",
        "variable",
      ]);

      const back = updateInteraction(fixture.page, interaction, {
        action: { actionName: "customFunction", code: "console.log(1)" },
      });
      assert(back.isOk(), "expected success result");
      expect(interaction.actionName).toEqual("customFunction");
      expect(
        ensureKnownFunctionExpr(argExpr(interaction, "customFunction")).bodyExpr
      ).toMatchObject({ code: "(console.log(1))" });
    });

    it("leaves the step untouched when the new action payload is invalid", () => {
      const fixture = setup();

      const created = createInteraction({
        component: fixture.page,
        tpl: fixture.pageRoot,
        eventName: "onClick",
        name: "Save",
        action: { actionName: "customFunction", code: "1" },
      });
      assert(created.isOk(), "setup failed");
      const interaction = created.value;

      const result = updateInteraction(fixture.page, interaction, {
        name: "Persist",
        action: {
          actionName: "updateVariable",
          variable: ["missing"],
          operation: "Toggle",
        },
      });

      expect(result).toEqual(
        err({
          message: `State "missing" not found on component "UnnamedComponent". Available states: none.`,
        })
      );
      expect(interaction.interactionName).toEqual("Save");
      expect(interaction.actionName).toEqual("customFunction");
    });
  });
});
