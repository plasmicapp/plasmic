import { ArrayPrimitiveEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ArrayPrimitiveEditor";
import { EnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/EnumPropEditor";
import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import ParamSection from "@/wab/client/components/sidebar-tabs/StateManagement/ParamSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import StyleSwitch from "@/wab/client/components/style-controls/StyleSwitch";
import {
  IconLinkButton,
  IFrameAwareDropdownMenu,
} from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { Modal } from "@/wab/client/components/widgets/Modal";
import Select from "@/wab/client/components/widgets/Select";
import Textbox from "@/wab/client/components/widgets/Textbox";
import DotsVerticalIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__DotsVertical";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  getPropTypeType,
  PropTypeType,
  StudioPropType,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import {
  assert,
  ensure,
  mkShortId,
  mkUuid,
  spawn,
  unexpected,
  xGroupBy,
} from "@/wab/shared/common";
import { canRenameParam } from "@/wab/shared/core/components";
import { clone, codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { JsonValue, mkParam } from "@/wab/shared/core/lang";
import { cloneType } from "@/wab/shared/core/tpls";
import { COMPONENT_PROP_CAP } from "@/wab/shared/Labels";
import { lintChoicePropValues } from "@/wab/shared/linting/lint-choice-prop-values";
import {
  Component,
  Expr,
  FunctionType,
  isKnownDataSourceOpExpr,
  isKnownEventHandler,
  isKnownExpr,
  isKnownFunctionType,
  isKnownImageAssetRef,
  isKnownPageHref,
  isKnownPropParam,
  isKnownRenderableType,
  isKnownRenderFuncType,
  isKnownStyleTokenRef,
  Param,
} from "@/wab/shared/model/classes";
import {
  isChoiceType,
  typeDisplayName,
  typeFactory,
} from "@/wab/shared/model/model-util";
import { smartHumanize } from "@/wab/shared/strs";
import { ChoiceObject, ChoiceOptions, ChoiceValue } from "@plasmicapp/host";
import { Menu, notification } from "antd";
import { isNaN } from "lodash";
import pluralize from "pluralize";
import React from "react";

/**
 * We have lots of prop/param types.
 * This value can be one of the following types:
 * - WAB param type
 * - Component prop type (see @plasmicapp/host prop-types.ts)
 */
type PropTypeData = {
  value: Param["type"]["name"] | PropTypeType;
  label: string;
  /** The JSON type for the prop type, or false if it must be an Expr. */
  jsonType: false | "boolean" | "number" | "string" | "any";
  /** The Expr's typeguard check function like `isKnownPageHref`. */
  exprTypeGuard?: (expr: Expr) => boolean;
};

// Check that the values match @plasmicapp/host prop-types.ts
const COMPONENT_PARAM_TYPES_CONFIG = [
  { value: "text", label: "Text", jsonType: "string" },
  { value: "num", label: "Number", jsonType: "number" },
  { value: "bool", label: "Toggle", jsonType: "boolean" },
  { value: "any", label: "Object", jsonType: "any" }, // any / Object = JsonValue, NOT JsonObject
  { value: "choice", label: "Choice", jsonType: "any" }, // string | number | boolean
  {
    value: "queryData",
    label: "Query data",
    jsonType: "any",
    exprTypeGuard: isKnownDataSourceOpExpr,
  },
  {
    value: "eventHandler",
    label: "Function",
    jsonType: false,
    exprTypeGuard: isKnownEventHandler,
  },
  {
    value: "href",
    label: "Link URL",
    jsonType: "string", // can be external URL
    exprTypeGuard: isKnownPageHref, // can be local page href
  },
  { value: "dateString", label: "Date", jsonType: "string" },
  { value: "dateRangeStrings", label: "Date range", jsonType: "string" },
  {
    value: "color",
    label: "Color",
    jsonType: "string", // can be CSS color
    exprTypeGuard: isKnownStyleTokenRef, // can be token
  },
  {
    value: "img",
    label: "Image",
    jsonType: "string", // can be external image URL
    exprTypeGuard: isKnownImageAssetRef, // can be image asset
  },
] as const satisfies readonly PropTypeData[];

function getComponentParamTypeOption(
  paramType: ComponentParamTypeOptions
): PropTypeData | undefined {
  return COMPONENT_PARAM_TYPES_CONFIG.find((opt) => opt.value === paramType);
}

type ComponentParamTypeOptions =
  (typeof COMPONENT_PARAM_TYPES_CONFIG)[number]["value"];

function isExprValid(propTypeData: PropTypeData | undefined, val: Expr) {
  // There may be some prop types we haven't handled when linking code component props.
  if (!propTypeData) {
    return true;
  }

  if (propTypeData.value === "array" || propTypeData.exprTypeGuard?.(val)) {
    return true;
  } else if (propTypeData.jsonType) {
    if (propTypeData.jsonType === "any") {
      return true;
    }

    const lit = tryExtractJson(val);
    if (propTypeData.jsonType === "number") {
      const numeric = typeof lit === "string" ? +lit : lit;
      return !isNaN(numeric);
    } else if (propTypeData.jsonType === "boolean") {
      return typeof lit === "boolean";
    } else if (propTypeData.jsonType === "string") {
      return typeof lit === "string";
    } else {
      unexpected(
        `invalid jsonData ${propTypeData.jsonType} on propTypeData: ${propTypeData.value}`
      );
    }
  } else {
    unexpected(`invalid propTypeData: ${propTypeData.value}`);
  }
}

const getValue = (item: ChoiceValue | ChoiceObject): ChoiceValue =>
  typeof item === "object" ? item.value : item;

const getValueString = (
  item: ChoiceValue | ChoiceObject | undefined
): string | undefined =>
  item !== undefined ? String(getValue(item)) : undefined;

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

  const componentParamTypes = studioCtx.appCtx.appConfig.enableDataQueries
    ? COMPONENT_PARAM_TYPES_CONFIG
    : COMPONENT_PARAM_TYPES_CONFIG.filter((type) => type.value !== "queryData");

  const type = props.type ?? existingParam?.type;
  const [paramName, setParamName] = React.useState(
    existingParam?.variable.name ?? suggestedName ?? ""
  );
  const [paramType, setParamType] = React.useState<ComponentParamTypeOptions>(
    (isKnownFunctionType(type)
      ? "eventHandler"
      : (type?.name as ComponentParamTypeOptions)) ?? "text"
  );

  const paramTypeData = getComponentParamTypeOption(paramType);

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

  const [choices, setChoices] = React.useState<ChoiceOptions>(
    existingParam && isChoiceType(existingParam.type)
      ? (existingParam.type.options as ChoiceOptions)
      : []
  );

  const [advanced, setAdvanced] = React.useState(
    isKnownPropParam(existingParam) ? existingParam.advanced : false
  );

  const exprStrVal = (expr: Expr | undefined): string | undefined => {
    return exprDisplayVal(expr, paramTypeData)?.toString();
  };

  const onChangeChoices = (values: ChoiceOptions) => {
    // Update the default and preview values if the corresponding allowed value changes
    const oldItem = choices.find(
      (item) => !values.some((v) => getValue(v) === getValue(item))
    );
    const newItem = values.find(
      (item) => !choices.some((c) => getValue(c) === getValue(item))
    );
    const oldVal = getValueString(oldItem);
    const newVal = getValueString(newItem);

    if (oldVal !== undefined) {
      const defaultVal = exprStrVal(defaultExpr);
      const previewVal = exprStrVal(previewExpr);

      if (defaultVal === oldVal) {
        setDefaultExpr(jsonExprToExpr(newVal));
      }
      if (previewVal === oldVal) {
        setPreviewExpr(jsonExprToExpr(newVal));
      }
    }

    setChoices(values);
  };

  const isValid = React.useMemo(
    () =>
      paramName &&
      paramType &&
      (defaultExpr === undefined || isExprValid(paramTypeData, defaultExpr)) &&
      (previewExpr === undefined || isExprValid(paramTypeData, previewExpr)),
    [paramName, paramType, type, defaultExpr, previewExpr]
  );

  const onSave = async () => {
    if (!isValid) {
      return;
    }

    const uniqueValues = Array.from(new Set(choices.map(getValue)));
    if (uniqueValues.length !== choices.length) {
      notification.error({
        message: "Choices should not contain duplicates.",
      });
      return;
    }

    const checkOptionsUsage = (newParamName: string) => {
      const issues = lintChoicePropValues(studioCtx.site, studioCtx).filter(
        (issue) => issue.propName === newParamName
      );
      if (issues.length === 0) {
        return;
      }
      const componentNames = [
        ...xGroupBy(issues, (issue) => issue.component).keys(),
      ].map((c) => c.name);

      const issuesPlural =
        issues.length > 1 ? `are ${issues.length} issues` : "is 1 issue";
      const componentsPlural = pluralize("components", componentNames.length);

      const key = mkUuid();
      notification.warning({
        key,
        message: `Review ${component.name} prop usage`,
        description: (
          <>
            <p>{`There ${issuesPlural} with existing ${newParamName} props on ${componentsPlural}: ${componentNames}.`}</p>
            <p>
              To review all issues, go to the
              <a
                onClick={async () => {
                  await studioCtx.change(({ success }) => {
                    studioCtx.switchLeftTab("lint", { highlight: true });
                    notification.close(key);
                    return success();
                  });
                }}
              >
                {" [Issues tab]."}
              </a>
            </p>
          </>
        ),
        duration: 10,
      });
    };
    const newParamType = type
      ? cloneType(type)
      : paramType === "eventHandler"
      ? typeFactory.func(
          ...defaultArgs
            .filter((arg) => arg.name !== "")
            .map((arg) => typeFactory.arg(arg.name, typeFactory[arg.type]()))
        )
      : paramType === "choice"
      ? typeFactory[paramType](choices)
      : typeFactory[paramType]();

    const name = studioCtx
      .tplMgr()
      .getUniqueParamName(component, paramName, existingParam);

    await studioCtx.change(({ success }) => {
      const isLocalizableVal =
        paramType === "text" && isLocalizationEnabled ? isLocalizable : false;

      if (existingParam) {
        studioCtx.tplMgr().renameParam(component, existingParam, name);
        if (newParamType.name === "choice") {
          newParamType.options = choices;
        }
        if (isKnownPropParam(existingParam)) {
          existingParam.advanced = advanced;
        }
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
          advanced,
        });
        component.params.push(param);
        onFinish(param);
        return success();
      }
    });
    if (existingParam && newParamType.name === "choice") {
      checkOptionsUsage(name);
    }
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
    paramType === "eventHandler"
      ? undefined
      : paramType === "choice"
      ? wabTypeToPropType(type ?? typeFactory[paramType](choices))
      : wabTypeToPropType(type ?? typeFactory[paramType]());
  if (getPropTypeType(propEditorType) === "dataSourceOpData") {
    propEditorType = wabTypeToPropType(typeFactory["any"]());
  }

  const modalContent = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        spawn(onSave());
      }}
    >
      <ParamSection
        fixedParamType={!!type}
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
              {componentParamTypes
                .filter((opt) => !!opt.jsonType && !("exprTypeGuard" in opt))
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
        hideEventArgs={!!type && paramType === "eventHandler"}
        showAdvancedSection={true}
        overrides={{
          paramName: {
            props: {
              defaultValue: paramName,
              onChange: (e) => setParamName(e.target.value),
              "data-test-id": "prop-name",
              disabled: !canRename,
            },
          },
          existingParamType: {
            value: type && smartHumanize(typeDisplayName(type, true)),
            disabled: true,
          },
          paramType: {
            props: {
              value: paramType,
              onChange: (val) => {
                if (val) {
                  setParamType(val as ComponentParamTypeOptions);
                  setDefaultExpr(val === "bool" ? codeLit(false) : undefined);
                  setIsLocalizable(false);
                }
              },
              children: componentParamTypes.map(({ value, label }) => (
                <Select.Option value={value} textValue={label} key={value}>
                  {label}
                </Select.Option>
              )),
              "data-test-id": "prop-type",
            },
          },
          defaultValue: {
            render: () =>
              paramType !== "eventHandler" && (
                <PropValueEditorWithMenu
                  attr="default-value"
                  label={paramName || "New prop"}
                  propType={ensure(
                    propEditorType,
                    "propEditorType should only be undefined if paramType equals eventHandler"
                  )}
                  propTypeData={paramTypeData}
                  value={defaultExpr}
                  choices={choices}
                  onChange={setDefaultExpr}
                />
              ),
          },
          previewValue: {
            render: () =>
              paramType !== "eventHandler" && (
                <PropValueEditorWithMenu
                  attr="preview-value"
                  label={paramName || "New prop"}
                  propType={ensure(
                    propEditorType,
                    "propEditorType should only be undefined if paramType equals eventHandler"
                  )}
                  propTypeData={paramTypeData}
                  value={previewExpr}
                  choices={choices}
                  onChange={setPreviewExpr}
                />
              ),
          },
          advancedSection: {
            render: () => {
              return (
                <>
                  <AdvancedToggle advanced={advanced} onChange={setAdvanced} />
                  {paramType === "choice" && (
                    <ArrayPrimitiveEditor
                      label={"Allowed Values"}
                      values={choices.map(getValue)}
                      onChange={onChangeChoices}
                      data-test-id={"component-prop-choices"}
                    />
                  )}
                </>
              );
            },
          },
          localizableSwitch: {
            isChecked: isLocalizable,
            onChange: (val) => setIsLocalizable(val),
          },
          confirmBtn: {
            props: {
              disabled: !isValid,
              htmlType: "submit",
              "data-test-id": "prop-submit",
            },
          },
          cancelBtn: { onClick: () => onFinish() },
        }}
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

const jsonExprToExpr = (
  val: Expr | JsonValue | undefined
): Expr | undefined => {
  return val == null || val === ""
    ? undefined
    : isKnownExpr(val)
    ? val
    : codeLit(val);
};

const exprDisplayVal = (
  expr: Expr | undefined,
  propTypeData: PropTypeData | undefined
): Expr | JsonValue | undefined => {
  return expr === undefined
    ? undefined
    : propTypeData?.exprTypeGuard?.(expr)
    ? expr
    : propTypeData?.jsonType
    ? tryExtractJson(expr)
    : undefined;
};

const AdvancedToggle: React.FC<{
  advanced: boolean;
  onChange: (isChecked: boolean) => void;
}> = ({ advanced, onChange }) => {
  return (
    <LabeledItemRow
      label={
        <LabelWithDetailedTooltip
          tooltip={<div>If set, the prop is hidden in the UI by default.</div>}
        >
          Advanced
        </LabelWithDetailedTooltip>
      }
    >
      <div className="flex justify-start flex-fill">
        <StyleSwitch isChecked={advanced ?? false} onChange={onChange}>
          {null}
        </StyleSwitch>
      </div>
    </LabeledItemRow>
  );
};

/** Wraps a PropValueEditor and menu for unsetting the value. */
const PropValueEditorWithMenu: React.FC<{
  attr: "default-value" | "preview-value" | "allowed-values";
  label: string;
  propType: StudioPropType<any>;
  propTypeData: PropTypeData | undefined;
  value: Expr | undefined;
  choices: ChoiceOptions;
  onChange: (expr: Expr | undefined) => void;
}> = ({ attr, label, value, onChange, propType, propTypeData, choices }) => {
  const displayVal = exprDisplayVal(value, propTypeData);

  return (
    <div className="generic-prop-editor" data-test-id={attr}>
      {choices.length ? (
        <EnumPropEditor
          value={displayVal?.toString()}
          valueSetState={displayVal === undefined ? "isUnset" : "isSet"}
          onChange={(val) => {
            onChange(jsonExprToExpr(val));
          }}
          options={choices}
          className={"form-control"}
        />
      ) : (
        <PropValueEditor
          attr={attr}
          label={label}
          value={displayVal}
          onChange={(val) => {
            const expr = jsonExprToExpr(val);

            if (expr === undefined || isExprValid(propTypeData, expr)) {
              onChange(expr);
            } else {
              unexpected(
                `PropValueEditor returned value that doesn't satisfy ${propTypeData?.value}`
              );
            }
          }}
          propType={propType}
        />
      )}
      <IFrameAwareDropdownMenu
        menu={
          <Menu>
            <Menu.Item onClick={() => onChange(undefined)}>Unset</Menu.Item>
          </Menu>
        }
      >
        <IconButton data-test-id={`${attr}-menu-btn`}>
          <DotsVerticalIcon />
        </IconButton>
      </IFrameAwareDropdownMenu>
    </div>
  );
};

function deriveArgTypes(type: FunctionType) {
  return type.params.map((arg) => ({
    name: arg.argName,
    type: arg.type.name,
    key: mkShortId(),
  }));
}
