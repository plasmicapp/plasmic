import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { unwrap } from "@/wab/commons/failable-utils";
import { getSingleTplComponentFromArg } from "@/wab/shared/SlotUtils";
import { unsetTplComponentArg } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  ensureBaseVariantSetting,
  getBaseVariant,
} from "@/wab/shared/Variants";
import {
  elementSchemaToTpl,
  isPlainObjectPropType,
} from "@/wab/shared/code-components/code-components";
import {
  createDefaultSubmitButton,
  createLabelRenderExprFromFormItem,
  inputTypeToElementSchema,
} from "@/wab/shared/code-components/simplified-mode/Forms";
import { assert, ensure, spawn } from "@/wab/shared/common";
import { getComponentPropTypes } from "@/wab/shared/component-props";
import {
  ExprCtx,
  clone as cloneExpr,
  codeLit,
  deserCompositeExprMaybe,
  isRealCodeExpr,
  mergeUserMinimalValueWithCompositeExpr,
  serCompositeExprMaybe,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { SlotSelection } from "@/wab/shared/core/slots";
import {
  TplCodeComponent,
  clone as cloneTpl,
  findFirstTextBlockInBaseVariant,
  getParamVariable,
  getTplComponentArgByParamName,
  isTplCodeComponent,
  isTplComponent,
  mkTplComponent,
  tplChildren,
} from "@/wab/shared/core/tpls";
import {
  Arg,
  Expr,
  Param,
  TplComponent,
  TplNode,
  VariantSetting,
  isKnownDataSourceOpExpr,
  isKnownExpr,
  isKnownRenderExpr,
} from "@/wab/shared/model/classes";
import { CodeComponentMode } from "@plasmicapp/host";
import { NormalizedData } from "@plasmicapp/react-web/lib/data-sources";
import {
  InputType,
  SimplifiedFormItemsProp,
  buttonComponentName,
  componentNameToInputType,
  deriveFormFieldConfigs,
  formItemComponentName,
  inputTypeToComponentName as inputTypeToAntdComponentName,
} from "@plasmicpkgs/antd5";

type FormItemProps = {
  [key in keyof SimplifiedFormItemsProp]: Expr | undefined;
};

enum FsmState {
  Form,
  FormItem,
}

const plumeTypeToInputType = {
  "text-input": InputType.Text,
  select: InputType.Select,
  "select-option": InputType.Option,
  "select-option-group": InputType.OptionGroup,
  switch: InputType.Checkbox,
  checkbox: InputType.Checkbox,
};

const getSlotDirectChildren = (tpl: TplComponent, slotName: string) => {
  const slotArg = ensure(
    $$$(tpl).getSlotArg(slotName),
    `${tpl.component.name} should have a label slot`
  );
  return isKnownRenderExpr(slotArg.expr) ? slotArg.expr.tpl : [];
};

const getFirstTextInSlot = (tpl: TplComponent, slotName: string) => {
  for (const child of getSlotDirectChildren(tpl, slotName)) {
    const maybeText = findFirstTextBlockInBaseVariant(child);
    if (maybeText) {
      return maybeText;
    }
  }
  return undefined;
};

const getRadiosInTpl = (tpl: TplComponent) => {
  const options: any[] = [];
  for (const child of getSlotDirectChildren(tpl, "children")) {
    if (
      !isTplCodeComponent(child) ||
      inputTypeToAntdComponentName[InputType.Radio] !== child.component.name
    ) {
      continue;
    }
    const value = getTplComponentArgByParamName(child, "value");
    const label = getFirstTextInSlot(child, "children");
    options.push({
      ...(label ? { label } : {}),
      ...(value ? { value: value.expr } : {}),
    });
  }
  return options;
};

const getSelectOptionsInTpl = (tpl: TplComponent) => {
  const options: any[] = [];
  for (const child of getSlotDirectChildren(tpl, "children")) {
    if (!isTplComponent(child)) {
      continue;
    }
    const tplChildInputType = child.component.plumeInfo
      ? plumeTypeToInputType[child.component.plumeInfo.type]
      : componentNameToInputType[child.component.name];
    const tplInputType = tpl.component.plumeInfo
      ? plumeTypeToInputType[tpl.component.plumeInfo.type]
      : componentNameToInputType[tpl.component.name];

    if (tplChildInputType === InputType.Option) {
      const value = getTplComponentArgByParamName(child, "value");
      const label = getFirstTextInSlot(child, "children");
      options.push({
        type: "option",
        ...(label ? { label } : {}),
        ...(value ? { value: value.expr } : {}),
      });
    } else if (tplChildInputType === InputType.OptionGroup) {
      if (tplInputType === InputType.OptionGroup) {
        continue;
      }
      const label = getFirstTextInSlot(
        child,
        tpl.component.plumeInfo ? "title" : "label"
      );
      options.push({
        type: "option-group",
        ...(label ? { label } : {}),
        options: getSelectOptionsInTpl(child),
      });
    }
  }
  return options;
};

function extractFormItemsFromAdvancedMode(tpl: TplComponent) {
  const formItems: FormItemProps[] = [];
  let firstButton: TplComponent | undefined = undefined;

  function walkTpls(currTpl: TplNode, fsmState: FsmState) {
    if (
      isTplCodeComponent(currTpl) &&
      currTpl.component.name === buttonComponentName &&
      !firstButton
    ) {
      firstButton = currTpl;
    }
    const currTplBaseVs = ensureBaseVariantSetting(currTpl);
    if (
      isTplComponent(currTpl) &&
      fsmState === FsmState.Form &&
      currTpl.component.name === formItemComponentName
    ) {
      const formItem: FormItemProps = {
        inputType: undefined,
      };
      for (const arg of currTplBaseVs.args) {
        if (["label", "children"].includes(arg.param.variable.name)) {
          continue;
        }
        formItem[arg.param.variable.name] = cloneExpr(arg.expr);
      }
      formItem.label = getFirstTextInSlot(currTpl, "label");
      for (const child of getSlotDirectChildren(currTpl, "children")) {
        const maybeInputInfo = walkTpls(child, FsmState.FormItem);
        if (maybeInputInfo) {
          formItem.inputType = maybeInputInfo.inputType;
          if (maybeInputInfo.options) {
            formItem.options = cloneExpr(maybeInputInfo.options);
          }
          if (maybeInputInfo.optionType) {
            formItem.optionType = cloneExpr(maybeInputInfo.optionType);
          }
          if (maybeInputInfo.checkboxLabel) {
            formItem.label = maybeInputInfo.checkboxLabel;
          }
          break;
        }
      }
      if (formItem.inputType) {
        // if we didn't find an inputType as child of formItem, we skip this Form.Item
        formItems.push(formItem);
      }
    } else if (
      isTplComponent(currTpl) &&
      fsmState === FsmState.FormItem &&
      componentNameToInputType[currTpl.component.name] !== undefined
    ) {
      const inputType = componentNameToInputType[currTpl.component.name];
      if (inputType === InputType.Select) {
        const useChildrenArg = getTplComponentArgByParamName(
          currTpl,
          "useChildren",
          currTplBaseVs
        );
        let options: Expr | undefined | null;
        if (
          useChildrenArg &&
          !isRealCodeExpr(useChildrenArg.expr) &&
          tryExtractJson(useChildrenArg?.expr)
        ) {
          // we need to check the children slot
          options = serCompositeExprMaybe(getSelectOptionsInTpl(currTpl));
        } else {
          const optionParam = currTpl.component.params.find(
            (p) => p.variable.name === "options"
          );
          const optionsArg = getTplComponentArgByParamName(
            currTpl,
            "options",
            currTplBaseVs
          );
          options = optionsArg?.expr ?? optionParam?.defaultExpr;
        }
        return {
          inputType,
          options,
        };
      } else if (inputType === InputType.RadioGroup) {
        const useChildrenArg = getTplComponentArgByParamName(
          currTpl,
          "useChildren",
          currTplBaseVs
        );
        let options: Expr | undefined | null;
        if (
          useChildrenArg &&
          !isRealCodeExpr(useChildrenArg.expr) &&
          tryExtractJson(useChildrenArg?.expr)
        ) {
          // we need to check the children slot
          options = serCompositeExprMaybe(getRadiosInTpl(currTpl));
        } else {
          const optionParam = currTpl.component.params.find(
            (p) => p.variable.name === "options"
          );
          const optionsArg = getTplComponentArgByParamName(
            currTpl,
            "options",
            currTplBaseVs
          );
          options = optionsArg?.expr ?? optionParam?.defaultExpr;
        }
        const optionTypeParam = currTpl.component.params.find(
          (p) => p.variable.name === "optionType"
        );
        const optionTypeArg = getTplComponentArgByParamName(
          currTpl,
          "optionType",
          currTplBaseVs
        );
        return {
          inputType,
          options,
          optionType: optionTypeArg?.expr ?? optionTypeParam?.defaultExpr,
        };
      } else if (inputType === InputType.Checkbox) {
        return {
          inputType,
          checkboxLabel: getFirstTextInSlot(currTpl, "children"),
        };
      } else if (inputType !== InputType.Radio) {
        return { inputType };
      }
    } else if (
      isTplComponent(currTpl) &&
      fsmState === FsmState.FormItem &&
      !!currTpl.component.plumeInfo &&
      plumeTypeToInputType[currTpl.component.plumeInfo.type] !== undefined
    ) {
      const inputType = plumeTypeToInputType[currTpl.component.plumeInfo.type];
      if (inputType === InputType.Checkbox) {
        return {
          inputType,
          checkboxLabel: getFirstTextInSlot(currTpl, "children"),
        };
      } else if (inputType === InputType.Select) {
        const useSlot = getTplComponentArgByParamName(
          currTpl,
          "children",
          currTplBaseVs
        );
        let options: Expr | undefined | null;
        if (useSlot) {
          // we need to check the children slot
          options = serCompositeExprMaybe(getSelectOptionsInTpl(currTpl));
        } else {
          const optionParam = currTpl.component.params.find(
            (p) => p.variable.name === "options"
          );
          const optionsArg = getTplComponentArgByParamName(
            currTpl,
            "options",
            currTplBaseVs
          );
          options = optionsArg?.expr ?? optionParam?.defaultExpr;
        }
        return {
          inputType,
          options,
        };
      } else {
        return { inputType };
      }
    } else {
      for (const child of tplChildren(currTpl)) {
        const maybeInputInfo = walkTpls(child, fsmState);
        if (maybeInputInfo) {
          return maybeInputInfo;
        }
      }
    }
  }

  for (const child of getSlotDirectChildren(tpl, "children")) {
    walkTpls(child, FsmState.Form);
  }
  return {
    formItems,
    firstButton,
  };
}

const DATA_FORMS_ITEM_PROP = "dataFormItems";

const extractFormItemsFromSchemaForm = (
  tpl: TplCodeComponent,
  viewCtx: ViewCtx,
  baseVs: VariantSetting,
  data: NormalizedData | undefined
) => {
  if (!data || !data?.schema) {
    return [];
  }
  const row = data && data.data.length > 0 ? data.data[0] : undefined;

  const propType = getComponentPropTypes(viewCtx, tpl.component)?.[
    DATA_FORMS_ITEM_PROP
  ];
  assert(
    propType,
    `form component should have a "${DATA_FORMS_ITEM_PROP}" prop type`
  );
  assert(
    isPlainObjectPropType(propType) && propType.type === "array",
    `"${DATA_FORMS_ITEM_PROP}" prop type should be an array`
  );

  const { componentPropValues } = viewCtx.getComponentEvalContext(tpl);
  const env = viewCtx.getCanvasEnvForTpl(tpl);
  const dataFormsItemsArg = baseVs.args.find(
    (arg) => arg.param.variable.name === DATA_FORMS_ITEM_PROP
  );
  const exprCtx: ExprCtx = {
    projectFlags: viewCtx.projectFlags(),
    component: viewCtx.currentComponent(),
    inStudio: true,
  };

  const fields = deriveFormFieldConfigs(
    componentPropValues.dataFormItems ?? [],
    data.schema,
    row
  )?.mergedFields;
  return mergeUserMinimalValueWithCompositeExpr(
    fields,
    dataFormsItemsArg?.expr,
    exprCtx,
    env ?? {},
    propType.unstable__keyFunc
  );
};

export function updateFormComponentMode(
  tpl: TplCodeComponent,
  viewCtx: ViewCtx,
  newMode: CodeComponentMode,
  schemaData: NormalizedData | undefined
) {
  const baseVs = ensureBaseVariantSetting(tpl);
  const baseVariant = getBaseVariant(viewCtx.currentComponent());
  const submitSlot = new SlotSelection({
    tpl,
    slotParam: ensure(
      tpl.component.params.find((p) => p.variable.name === "submitSlot"),
      `forms component should have a "submitSlot" slot`
    ),
  });
  const childrenSlot = new SlotSelection({
    tpl,
    slotParam: ensure(
      tpl.component.params.find((p) => p.variable.name === "children"),
      `forms component should have a "children" slot`
    ),
  });
  const allComponents = [
    ...walkDependencyTree(viewCtx.site, "all").flatMap(
      (dep) => dep.site.components
    ),
    ...viewCtx.site.components,
  ];

  const formItemsParam = ensure(
    tpl.component.params.find((p) => p.variable.name === "formItems"),
    `forms should have a "formItems" param`
  );
  const formItemsArg = getTplComponentArgByParamName(tpl, "formItems", baseVs);

  const isSchemaForm = isKnownDataSourceOpExpr(
    baseVs.args.find((arg) => arg.param.variable.name === "data")?.expr
  );

  const extractFormItemsFromArg = (
    itemArg: Arg | undefined,
    itemParam: Param
  ) => {
    return itemArg
      ? deserCompositeExprMaybe(itemArg.expr)
      : itemParam.defaultExpr
      ? tryExtractJson(itemParam.defaultExpr)
      : undefined;
  };
  const formItems: FormItemProps[] = isSchemaForm
    ? extractFormItemsFromSchemaForm(tpl, viewCtx, baseVs, schemaData)
    : extractFormItemsFromArg(formItemsArg, formItemsParam);

  if (newMode === "simplified") {
    const { formItems: newFormItems, firstButton } =
      extractFormItemsFromAdvancedMode(tpl);
    // remove old submit slot
    spawn(
      viewCtx.viewOps.tryDelete({
        tpl: submitSlot,
        forceDelete: true,
        skipCommentsConfirmation: true,
      })
    );

    if (firstButton) {
      viewCtx.viewOps.insertAsChild(cloneTpl(firstButton), submitSlot);
    } else {
      viewCtx.viewOps.insertAsChild(
        createDefaultSubmitButton(
          viewCtx.tplMgr(),
          viewCtx.currentComponent(),
          allComponents
        ),
        submitSlot
      );
    }

    // set new form items
    viewCtx
      .variantTplMgr()
      .setArg(
        tpl,
        getParamVariable(tpl, "formItems"),
        serCompositeExprMaybe(newFormItems)
      );

    //delete chilren
    spawn(
      viewCtx.viewOps.tryDelete({
        tpl: childrenSlot,
        forceDelete: true,
        skipCommentsConfirmation: true,
      })
    );
    viewCtx.setStudioFocusByTpl(tpl);
  } else if (newMode === "advanced") {
    //delete chilren
    spawn(
      viewCtx.viewOps.tryDelete({
        tpl: childrenSlot,
        forceDelete: true,
        skipCommentsConfirmation: true,
      })
    );
    if (formItems && Array.isArray(formItems)) {
      for (const formItem of formItems) {
        const inputType = (
          isKnownExpr(formItem.inputType)
            ? tryExtractJson(formItem.inputType)
            : formItem.inputType
        ) as InputType | undefined;
        const labelRenderExpr = createLabelRenderExprFromFormItem(
          formItem,
          baseVariant
        );
        const elementSchema = inputTypeToElementSchema(formItem);
        if (!elementSchema) {
          continue;
        }
        const inputTpl = unwrap(
          elementSchemaToTpl(
            viewCtx.site,
            viewCtx.currentComponent(),
            elementSchema,
            { codeComponentsOnly: true }
          )
        ).tpl as TplComponent;

        if (
          inputType &&
          [InputType.Select, InputType.RadioGroup].includes(inputType) &&
          formItem.options
        ) {
          viewCtx
            .variantTplMgr()
            .setArg(
              inputTpl,
              getParamVariable(inputTpl, "options"),
              cloneExpr(formItem.options)
            );
        }
        if (InputType.RadioGroup === inputType && formItem.optionType) {
          viewCtx
            .variantTplMgr()
            .setArg(
              inputTpl,
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
          viewCtx.variantTplMgr().getBaseVariantForNewNode(),
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
        viewCtx.viewOps.insertAsChild(tplFormItem, tpl);
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
          spawn(
            viewCtx.viewOps.tryDelete({
              tpl: checkboxChildrenSlot,
              forceDelete: true,
              skipCommentsConfirmation: true,
            })
          );
          viewCtx.viewOps.insertAsChild(labelRenderExpr.tpl[0], inputTpl);
        }
      }
    }
    const submitSlotArg = getTplComponentArgByParamName(
      tpl,
      "submitSlot",
      baseVs
    );
    const submitButton = getSingleTplComponentFromArg(submitSlotArg);
    if (submitButton) {
      viewCtx.viewOps.insertAsChild(cloneTpl(submitButton), tpl);
    } else {
      viewCtx.viewOps.insertAsChild(
        createDefaultSubmitButton(
          viewCtx.tplMgr(),
          viewCtx.currentComponent(),
          allComponents
        ),
        submitSlot
      );
    }
    spawn(
      viewCtx.viewOps.tryDelete({
        tpl: submitSlot,
        forceDelete: true,
        skipCommentsConfirmation: true,
      })
    );
    unsetTplComponentArg(tpl, getParamVariable(tpl, "formItems"));
    unsetTplComponentArg(tpl, getParamVariable(tpl, "dataFormItems"));
    unsetTplComponentArg(tpl, getParamVariable(tpl, "data"));
    viewCtx.setStudioFocusByTpl(tpl);
  }
}
