import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import Select from "@/wab/client/components/widgets/Select";
import Textbox from "@/wab/client/components/widgets/Textbox";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import PlasmicParamSection from "@/wab/client/plasmic/plasmic_kit_state_management/PlasmicParamSection";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { assert, ensure, mkShortId, spawn } from "@/wab/shared/common";
import { canRenameParam } from "@/wab/shared/core/components";
import { clone, codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import {
  getPropTypeType,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import { COMPONENT_PROP_CAP } from "@/wab/shared/Labels";
import {
  Component,
  Expr,
  FunctionType,
  isKnownExpr,
  isKnownFunctionType,
  isKnownPageHref,
  isKnownRenderableType,
  isKnownRenderFuncType,
  Param,
} from "@/wab/shared/model/classes";
import { typeDisplayName, typeFactory } from "@/wab/shared/model/model-util";
import { smartHumanize } from "@/wab/shared/strs";
import { cloneType } from "@/wab/shared/core/tpls";
import { isNaN } from "lodash";
import React from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

function getComponentParamTypeOptions() {
  return [
    { value: "text", label: "Text", isPrimitive: true },
    { value: "num", label: "Number", isPrimitive: true },
    { value: "bool", label: "Toggle", isPrimitive: true },
    { value: "any", label: "Object", isPrimitive: true },
    // queryData is just a json object, and so counts as "primitive"
    { value: "queryData", label: "Fetched data", isPrimitive: true },
    { value: "eventHandler", label: "Event handler", isPrimitive: false },
    { value: "href", label: "Link URL", isPrimitive: false },
    { value: "dateString", label: "Date", isPrimitive: true },
    { value: "dateRangeStrings", label: "Date Range", isPrimitive: true },
  ] as const;
}

function getComponentParamTypeOption(paramType: ComponentParamTypeOptions) {
  return getComponentParamTypeOptions().find((opt) => opt.value === paramType);
}

type ComponentParamTypeOptions = ReturnType<
  typeof getComponentParamTypeOptions
>[number]["value"];

function isDefaultValueValid(paramType: ComponentParamTypeOptions, val: Expr) {
  const option = getComponentParamTypeOption(paramType);
  if (!option) {
    return true;
  }
  if (option.isPrimitive) {
    const lit = tryExtractJson(val);
    if (paramType === "num") {
      const numeric = typeof lit === "string" ? +lit : lit;
      return !isNaN(numeric);
    } else if (paramType === "bool") {
      return typeof lit === "boolean";
    } else if (paramType === "any") {
      return typeof lit === "object";
    }
  } else if (paramType === "href") {
    if (isKnownPageHref(val)) {
      return true;
    }
    const lit = tryExtractJson(val);
    return typeof lit === "string";
  }
  return true;
}

export function ComponentPropModal(props: {
  studioCtx: StudioCtx;
  component: Component;
  visible: boolean;
  existingParam?: Param;
  onFinish: (newParam?: Param) => void;
  type?: Param["type"];
  centeredModal?: boolean;
  suggestedName?: string;
}) {
  const {
    studioCtx,
    component,
    visible,
    onFinish,
    existingParam,
    centeredModal,
    suggestedName,
  } = props;

  const type = props.type ?? existingParam?.type;
  const [paramName, setParamName] = React.useState(
    existingParam?.variable.name ?? suggestedName ?? ""
  );
  const [paramType, setParamType] = React.useState<ComponentParamTypeOptions>(
    (isKnownFunctionType(type)
      ? "eventHandler"
      : (type?.name as ComponentParamTypeOptions)) ?? "text"
  );
  const [defaultExpr, setDefaultExpr] = React.useState<Expr | undefined>(
    existingParam && existingParam.defaultExpr
      ? existingParam.defaultExpr
      : undefined
  );
  const [previewExpr, setPreviewExpr] = React.useState<Expr | undefined>(
    existingParam && existingParam.previewExpr
      ? existingParam.previewExpr
      : undefined
  );
  const [defaultArgs, setDefaultArgs] = React.useState<
    { name: string; type: string; key: string }[]
  >(
    existingParam && isKnownFunctionType(existingParam.type)
      ? deriveArgTypes(existingParam.type)
      : []
  );
  const isLocalizationEnabled = studioCtx.site.flags.usePlasmicTranslation;
  const [isLocalizable, setIsLocalizable] = React.useState(
    existingParam && isLocalizationEnabled ? existingParam.isLocalizable : false
  );

  const isValid = React.useMemo(
    () =>
      paramName &&
      paramType &&
      (defaultExpr == null || isDefaultValueValid(paramType, defaultExpr)),
    [paramName, paramType, type, defaultExpr]
  );

  const onSave = async () => {
    if (!isValid) {
      return;
    }

    await studioCtx.change(({ success }) => {
      const newParamType = type
        ? cloneType(type)
        : paramType !== "eventHandler"
        ? typeFactory[paramType]()
        : typeFactory.func(
            ...defaultArgs
              .filter((arg) => arg.name !== "")
              .map((arg) => typeFactory.arg(arg.name, typeFactory[arg.type]()))
          );
      const name = studioCtx
        .tplMgr()
        .getUniqueParamName(component, paramName, existingParam);
      const isLocalizableVal =
        paramType === "text" && isLocalizationEnabled ? isLocalizable : false;
      if (existingParam) {
        studioCtx.tplMgr().renameParam(component, existingParam, name);
        existingParam.type = newParamType;
        existingParam.defaultExpr = defaultExpr && clone(defaultExpr);
        existingParam.previewExpr = previewExpr && clone(previewExpr);
        existingParam.isLocalizable = isLocalizableVal;
        onFinish(existingParam);
        return success();
      } else {
        assert(
          !isKnownRenderableType(newParamType) &&
            !isKnownRenderFuncType(newParamType),
          () => `Didn't expect slot type`
        );
        const param = mkParam({
          name,
          type: newParamType,
          paramType: "prop",
          description: "metaProp",
          defaultExpr,
          previewExpr,
          isLocalizable: isLocalizableVal,
        });
        component.params.push(param);
        onFinish(param);
        return success();
      }
    });
  };

  const canRename = !existingParam || canRenameParam(component, existingParam);

  const updateDefaultArg = (
    key: string,
    updateValues: Record<string, string>
  ) => {
    setDefaultArgs((prev) =>
      prev.map((arg) => (arg.key === key ? { ...arg, ...updateValues } : arg))
    );
  };

  let propEditorType =
    paramType !== "eventHandler"
      ? wabTypeToPropType(type ?? typeFactory[paramType]())
      : undefined;
  if (getPropTypeType(propEditorType) === "dataSourceOpData") {
    propEditorType = wabTypeToPropType(typeFactory["any"]());
  }
  const isParamTypePrimitive =
    getComponentParamTypeOption(paramType)?.isPrimitive ?? false;

  const modalContent = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        spawn(onSave());
      }}
    >
      <PlasmicParamSection
        paramName={{
          props: {
            defaultValue: paramName,
            onChange: (e) => setParamName(e.target.value),
            "data-test-id": "prop-name",
            disabled: !canRename,
          },
        }}
        fixedParamType={!!type}
        existingParamType={{
          value: type && smartHumanize(typeDisplayName(type, true)),
          disabled: true,
        }}
        paramType={{
          props: {
            value: paramType,
            onChange: (val) => {
              if (val) {
                setParamType(val as ComponentParamTypeOptions);
                setDefaultExpr(val === "bool" ? codeLit(false) : undefined);
                setIsLocalizable(false);
              }
            },
            children: getComponentParamTypeOptions().map(({ value, label }) => (
              <Select.Option value={value} textValue={label} key={value}>
                {label}
              </Select.Option>
            )),
            "data-test-id": "prop-type",
          },
        }}
        defaultValue={{
          render: () =>
            paramType !== "eventHandler" && (
              <div className="generic-prop-editor" data-test-id="default-value">
                <PropValueEditor
                  label={existingParam?.variable.name ?? "New prop"}
                  value={
                    isParamTypePrimitive && defaultExpr
                      ? tryExtractJson(defaultExpr)
                      : defaultExpr
                  }
                  onChange={(val) => {
                    setDefaultExpr(
                      val == null || val === ""
                        ? undefined
                        : isKnownExpr(val)
                        ? val
                        : isParamTypePrimitive
                        ? codeLit(val)
                        : undefined
                    );
                  }}
                  propType={ensure(
                    propEditorType,
                    "propEditorType should only be undefined if paramType equals eventHandler"
                  )}
                  attr="default-value"
                />
              </div>
            ),
        }}
        previewValue={{
          render: () =>
            paramType !== "eventHandler" && (
              <div className="generic-prop-editor">
                <PropValueEditor
                  label={existingParam?.variable.name ?? "New prop"}
                  value={
                    isParamTypePrimitive && previewExpr
                      ? tryExtractJson(previewExpr)
                      : previewExpr
                  }
                  onChange={(val) => {
                    setPreviewExpr(
                      val == null || val === ""
                        ? undefined
                        : isKnownExpr(val)
                        ? val
                        : isParamTypePrimitive
                        ? codeLit(val)
                        : undefined
                    );
                  }}
                  propType={ensure(
                    propEditorType,
                    "propEditorType should only be undefined if paramType equals eventHandler"
                  )}
                  attr="preview-value"
                />
              </div>
            ),
        }}
        defaultArgs={defaultArgs.map((arg) => (
          <LabeledListItem
            key={arg.key}
            labelSize="half"
            label={
              <Textbox
                defaultValue={arg.name}
                onEdit={(val) => updateDefaultArg(arg.key, { name: val })}
                styleType={["bordered"]}
                placeholder="arg name"
                data-test-id="arg-name"
              />
            }
            padding={["noLabel", "noContent", "noHorizontal"]}
            onDelete={() =>
              setDefaultArgs((prev) =>
                prev.filter((pArg) => pArg.key !== arg.key)
              )
            }
          >
            <Select
              type={"bordered"}
              style={{ width: "100%" }}
              value={arg.type}
              onChange={(val) =>
                val && updateDefaultArg(arg.key, { type: val })
              }
              data-test-id="arg-type"
            >
              {getComponentParamTypeOptions()
                .filter((opt) => opt.isPrimitive)
                .map(({ value, label }) => (
                  <Select.Option value={value} textValue={label} key={value}>
                    {label}
                  </Select.Option>
                ))}
            </Select>
          </LabeledListItem>
        ))}
        plusIcon={
          <IconLinkButton
            onClick={() =>
              setDefaultArgs((prev) => [
                ...prev,
                { name: "", type: "text", key: mkShortId() },
              ])
            }
            type="button"
            data-test-id="add-arg"
          >
            <Icon icon={PlusIcon} />
          </IconLinkButton>
        }
        specialParamType={
          paramType === "eventHandler"
            ? "eventHandler"
            : paramType === "text" && isLocalizationEnabled
            ? "localizable"
            : undefined
        }
        localizableSwitch={{
          isChecked: isLocalizable,
          onChange: (val) => setIsLocalizable(val),
        }}
        hideEventArgs={!!type && paramType === "eventHandler"}
        confirmBtn={{
          props: {
            disabled: !isValid,
            htmlType: "submit",
            onClick: () => {
              spawn(onSave());
            },
            "data-test-id": "prop-submit",
          },
        }}
        cancelBtn={{ onClick: () => onFinish() }}
        // isInvalid={false}
      />
    </form>
  );

  if (centeredModal) {
    return (
      <Modal
        open
        footer={null}
        title={`New ${COMPONENT_PROP_CAP}`}
        onCancel={() => onFinish()}
      >
        {modalContent}
      </Modal>
    );
  } else {
    return (
      <SidebarModal
        show={visible}
        title={
          existingParam
            ? `Edit ${existingParam.variable.name}`
            : `New ${COMPONENT_PROP_CAP}`
        }
        onClose={() => onFinish()}
      >
        {modalContent}
      </SidebarModal>
    );
  }
}

function deriveArgTypes(type: FunctionType) {
  return type.params.map((arg) => ({
    name: arg.argName,
    type: arg.type.name,
    key: mkShortId(),
  }));
}
