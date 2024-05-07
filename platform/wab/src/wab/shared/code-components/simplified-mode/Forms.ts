import {
  Arg,
  Component,
  Expr,
  ExprText,
  isKnownCompositeExpr,
  isKnownExpr,
  Param,
  RenderExpr,
  Site,
  TplComponent,
  TplNode,
  Variant,
} from "@/wab/classes";
import { ensure, isNonNil } from "@/wab/common";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  clone as cloneExpr,
  codeLit,
  deserCompositeExprMaybe,
  isRealCodeExpr,
  isRealCodeExprEnsuringType,
  tryExtractJson,
} from "@/wab/exprs";
import { elementSchemaToTpl } from "@/wab/shared/code-components/code-components";
import { getSingleTplComponentFromArg } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { allComponents as getAllComponents } from "@/wab/sites";
import { SlotSelection } from "@/wab/slots";
import {
  clone as cloneTpl,
  getParamVariable,
  getTplComponentArgByParamName,
  mkTplComponent,
  mkTplInlinedText,
  TplCodeComponent,
} from "@/wab/tpls";
import {
  buttonComponentName,
  formItemComponentName,
  InputType,
  inputTypeToComponentName as inputTypeToAntdComponentName,
  SimplifiedFormItemsProp,
} from "@plasmicpkgs/antd5";
import { isString } from "lodash";

type FormItemProps = {
  [key in keyof SimplifiedFormItemsProp]: Expr | undefined;
};

export const inputTypeToElementSchema = (formItem: any) => {
  const inputType = isKnownExpr(formItem.inputType)
    ? tryExtractJson(formItem.inputType)
    : formItem.inputType;
  if (!isString(inputType) || !(inputType in inputTypeToAntdComponentName)) {
    return undefined;
  }
  return {
    type: "component" as const,
    name: inputTypeToAntdComponentName[inputType],
    props: {},
  };
};

export const createDefaultSubmitButton = (
  tplMgr: TplMgr,
  ownerComponent: Component,
  allComponents: Component[]
) => {
  return mkTplComponent(
    ensure(
      allComponents.find((c) => c.name === buttonComponentName),
      `project should have a "${formItemComponentName}" component`
    ),
    tplMgr.ensureBaseVariant(ownerComponent),
    {
      type: codeLit("primary"),
      submitsForm: codeLit("boolean"),
    }
  );
};

export const createLabelRenderExprFromFormItem = (
  formItem: FormItemProps,
  baseVariant: Variant
) => {
  const text = isRealCodeExpr(formItem.label)
    ? undefined
    : isKnownExpr(formItem.label)
    ? tryExtractJson(formItem.label)
    : formItem.label;
  const labelTpl = mkTplInlinedText(text ?? "", [baseVariant], "div", {
    baseVariant,
  });
  if (isRealCodeExprEnsuringType(formItem.label)) {
    ensureBaseVariantSetting(labelTpl).text = new ExprText({
      expr: formItem.label,
      html: false,
    });
  }
  return new RenderExpr({ tpl: [labelTpl] });
};

export function generateTplsFromFormItems(
  tpl: TplCodeComponent,
  site: Site,
  component: Component
) {
  const tplFormsItems: TplNode[] = [];
  const baseVs = ensureBaseVariantSetting(tpl);
  const baseVariant = baseVs.variants[0];
  const tplMgr = new TplMgr({ site });

  const allComponents = getAllComponents(site, { includeDeps: "all" });

  const formItemsParam = ensure(
    tpl.component.params.find((p) => p.variable.name === "formItems"),
    `forms should have a "formItems" param`
  );
  const formItemsArg = getTplComponentArgByParamName(tpl, "formItems", baseVs);

  const extractFormItemsFromArg = (
    itemArg: Arg | undefined,
    itemParam: Param
  ): FormItemProps[] | undefined => {
    if (itemArg) {
      if (isKnownCompositeExpr(itemArg.expr)) {
        return deserCompositeExprMaybe(itemArg.expr);
      }
      return tryExtractJson(itemArg.expr);
    }
    if (itemParam.defaultExpr) {
      return tryExtractJson(itemParam.defaultExpr);
    }
    return undefined;
  };

  const formItems = extractFormItemsFromArg(formItemsArg, formItemsParam);

  if (isNonNil(formItems)) {
    for (const formItem of formItems) {
      const inputType: InputType = isKnownExpr(formItem.inputType)
        ? tryExtractJson(formItem.inputType)
        : formItem.inputType;
      const labelRenderExpr = createLabelRenderExprFromFormItem(
        formItem,
        baseVariant
      );
      const elementSchema = inputTypeToElementSchema(formItem);
      if (!elementSchema) {
        continue;
      }
      const inputTpl = unwrap(
        elementSchemaToTpl(site, component, elementSchema, {
          codeComponentsOnly: true,
        })
      ).tpl as TplComponent;
      const inputTplBaseVs = ensureBaseVariantSetting(inputTpl);
      if (
        [InputType.Select, InputType.RadioGroup].includes(inputType) &&
        formItem.options
      ) {
        tplMgr.setArg(
          inputTpl,
          inputTplBaseVs,
          getParamVariable(inputTpl, "options"),
          cloneExpr(formItem.options)
        );
      }
      if (InputType.RadioGroup === inputType && formItem.optionType) {
        tplMgr.setArg(
          inputTpl,
          inputTplBaseVs,
          getParamVariable(inputTpl, "optionType"),
          cloneExpr(formItem.optionType)
        );
      }

      const formItemComponent = ensure(
        allComponents.find((c) => c.name === formItemComponentName),
        `project should have a "${formItemComponentName}" component`
      );
      const tplFormItem = mkTplComponent(
        formItemComponent,
        tplMgr.ensureBaseVariant(component),
        {
          ...Object.fromEntries(
            Object.entries(formItem)
              .filter(
                ([name]) =>
                  ![
                    "inputType",
                    "options",
                    "optionType",
                    "label",
                    "key",
                    "fieldId",
                    "showTime",
                  ].includes(name)
              )
              .map(([name, value]) => [
                name,
                isKnownExpr(value as any)
                  ? cloneExpr(value as Expr)
                  : codeLit(value as any),
              ])
          ),
          ...(labelRenderExpr && inputType !== InputType.Checkbox
            ? { label: labelRenderExpr }
            : inputType === InputType.Checkbox
            ? { noLabel: codeLit(true) }
            : {}),
        },
        inputTpl
      );
      if (InputType.Checkbox === inputType) {
        const checkboxChildrenSlot = new SlotSelection({
          tpl: inputTpl,
          slotParam: ensure(
            inputTpl.component.params.find(
              (p) => p.variable.name === "children"
            ),
            `"${inputTpl.component.name}" should have a "children" slot`
          ),
        });
        $$$(checkboxChildrenSlot.getTpl()).remove({ deep: true });
        $$$(inputTpl).append(labelRenderExpr.tpl[0]);
      }

      tplFormsItems.push(tplFormItem);
    }
  }
  const submitSlotArg = getTplComponentArgByParamName(
    tpl,
    "submitSlot",
    baseVs
  );
  const submitButton = getSingleTplComponentFromArg(submitSlotArg);
  if (submitButton) {
    tplFormsItems.push(cloneTpl(submitButton));
  } else {
    tplFormsItems.push(
      createDefaultSubmitButton(tplMgr, component, allComponents)
    );
  }
  return tplFormsItems;
}
