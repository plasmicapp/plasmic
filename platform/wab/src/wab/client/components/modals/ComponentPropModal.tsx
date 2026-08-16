import { ArrayPrimitiveEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ArrayPrimitiveEditor";
import { ChoicePropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ChoicePropEditor";
import { notifyLinkedPropDrift } from "@/wab/client/components/sidebar-tabs/linked-prop-utils";
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
import { createComponentProp } from "@/wab/client/operations/create-component-prop";
import { updateComponentProp } from "@/wab/client/operations/update-component-prop";
import { validateValueForPropType } from "@/wab/client/operations/utils/validate-prop-changes";
import DotsVerticalIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__DotsVertical";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  getPropTypeType,
  isPlainObjectPropType,
  StudioPropType,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import {
  ensure,
  ensureArray,
  isJsonScalar,
  mkShortId,
  mkUuid,
  spawn,
  unexpected,
  xGroupBy,
} from "@/wab/shared/common";
import { canRenameParam } from "@/wab/shared/core/components";
import { clone, codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { JsonValue } from "@/wab/shared/core/lang";
import { cloneType } from "@/wab/shared/core/tpls";
import { GenericError } from "@/wab/shared/error-handling";
import { COMPONENT_PROP_CAP } from "@/wab/shared/Labels";
import { lintChoicePropValues } from "@/wab/shared/linting/lint-choice-prop-values";
import {
  Component,
  Expr,
  FunctionType,
  isKnownExpr,
  isKnownFunctionType,
  isKnownPropParam,
  Param,
} from "@/wab/shared/model/classes";
import {
  isOptionsType,
  typeDisplayName,
  typeFactory,
} from "@/wab/shared/model/model-util";
import {
  COMPONENT_PARAM_TYPES,
  ComponentParamTypeOptions,
  FUNC_ARG_TYPES,
  FuncArgTypeKind,
  getComponentParamTypeOption,
  mkWabTypeForPropKind,
  PropTypeData,
} from "@/wab/shared/model/prop-type-config";
import { smartHumanize } from "@/wab/shared/strs";
import { ChoiceObject, ChoiceOptions, ChoiceValue } from "@plasmicapp/host";
import { Menu, notification } from "antd";
import { ok } from "neverthrow";
import pluralize from "pluralize";
import React from "react";

const getValue = (item: ChoiceValue | ChoiceObject): ChoiceValue =>
  typeof item === "object" ? item.value : item;

const getValueString = (
  item: ChoiceValue | ChoiceObject | undefined
): string | undefined =>
  item !== undefined ? String(getValue(item)) : undefined;

export interface ComponentPropModalProps {
  studioCtx: StudioCtx;
  component: Component;
  visible: boolean;
  existingParam?: Param;
  onFinish: (newParam?: Param) => void;
  type?: Param["type"];
  centeredModal?: boolean;
  suggestedName?: string;
  suggestedDefaultExpr?: Expr | undefined;
}

export function ComponentPropModal(props: ComponentPropModalProps) {
  const {
    studioCtx,
    component,
    visible,
    onFinish,
    existingParam,
    centeredModal,
    suggestedName,
    suggestedDefaultExpr,
  } = props;

  const componentParamTypes = studioCtx.appCtx.appConfig.enableDataQueries
    ? COMPONENT_PARAM_TYPES
    : COMPONENT_PARAM_TYPES.filter((type) => type.value !== "queryData");

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
  const isChoiceType = paramType === "choice" || paramType === "multiChoice";

  const [defaultExpr, setDefaultExpr] = React.useState<Expr | undefined>(
    existingParam?.defaultExpr ?? suggestedDefaultExpr
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
    type && isOptionsType(type) ? (type.options as ChoiceOptions) : []
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
    // Values are matched as text, since that is what the editor shows, but
    // the replaced values keeps its own type i.e a numeric option must stay a
    // number, or the default no longer matches it.
    const newValue = newItem !== undefined ? getValue(newItem) : undefined;
    const validValues = new Set(values.map((v) => String(getValue(v))));

    const remapExpr = (expr: Expr | undefined): Expr | undefined => {
      const val = exprDisplayVal(expr, paramTypeData);
      if (!Array.isArray(val)) {
        return String(val) === oldVal ? jsonExprToExpr(newValue) : expr;
      }
      const remapped = val
        .map((v) => (String(v) === oldVal ? newValue : v))
        .filter(
          // Remove invalid values
          (v): v is ChoiceValue => v !== undefined && validValues.has(String(v))
        );
      return codeLit(remapped);
    };

    if (oldVal !== undefined) {
      setDefaultExpr(remapExpr(defaultExpr));
      setPreviewExpr(remapExpr(previewExpr));
    }

    setChoices(values);
  };

  const isValid = React.useMemo(() => {
    const trimmed = paramName.trim();
    return (
      trimmed &&
      !trimmed.endsWith("/") &&
      paramType &&
      (defaultExpr === undefined ||
        !validateValueForPropType(
          "Default",
          paramTypeData,
          choices,
          defaultExpr
        )) &&
      (previewExpr === undefined ||
        !validateValueForPropType(
          "Preview",
          paramTypeData,
          choices,
          previewExpr
        ))
    );
  }, [paramName, paramType, type, defaultExpr, previewExpr, choices]);

  const onSave = async () => {
    if (!isValid) {
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
                  await studioCtx.change(() => {
                    studioCtx.switchLeftTab("lint", { highlight: true });
                    notification.close(key);
                    return ok();
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
    const isLocalizableVal =
      paramType === "text" && isLocalizationEnabled ? isLocalizable : false;

    const saved = await studioCtx.change<GenericError, Param>(() => {
      if (existingParam) {
        return updateComponentProp(
          existingParam,
          {
            name:
              paramName !== existingParam.variable.name ? paramName : undefined,
            options: isOptionsType(existingParam.type) ? choices : undefined,
            defaultValue: defaultExpr ? clone(defaultExpr) : null,
            previewValue: previewExpr ? clone(previewExpr) : null,
            advanced,
            isLocalizable: isLocalizableVal,
          },
          { component, tplMgr: studioCtx.tplMgr() }
        ).map(() => existingParam);
      }
      return createComponentProp({
        component,
        tplMgr: studioCtx.tplMgr(),
        name: paramName,
        type: type
          ? cloneType(type)
          : mkWabTypeForPropKind(paramType, {
              options: choices,
              funcArgs: defaultArgs
                .filter((arg) => arg.name !== "")
                .map((arg) => ({
                  name: arg.name,
                  type: arg.type as FuncArgTypeKind,
                })),
            }),
        defaultValue: defaultExpr,
        previewValue: previewExpr,
        advanced,
        isLocalizable: isLocalizableVal,
      });
    });
    if (saved.isErr()) {
      notification.error({ message: saved.error.message });
      return;
    }
    const savedParam = saved.value;
    onFinish(savedParam);
    if (existingParam && isOptionsType(savedParam.type)) {
      checkOptionsUsage(savedParam.variable.name);
    }
    if (existingParam) {
      notifyLinkedPropDrift(studioCtx, component, existingParam);
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
      : wabTypeToPropType(
          type ?? mkWabTypeForPropKind(paramType, { options: choices })
        );
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
              {FUNC_ARG_TYPES.map(({ value, label }) => (
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
            : isChoiceType
            ? "choice"
            : undefined
        }
        hideEventArgs={!!type && paramType === "eventHandler"}
        showAdvancedSection={true}
        choiceSettings={
          isChoiceType ? (
            <ArrayPrimitiveEditor
              label={"Allowed Values"}
              options={choices}
              onChange={onChangeChoices}
              data-test-id={"component-prop-choices"}
            />
          ) : undefined
        }
        overrides={{
          name: {
            props: {
              children: (
                <LabelWithDetailedTooltip
                  tooltip={
                    <div>
                      Use <code>/</code> to organize props into folders, e.g.{" "}
                      <code>Header / title</code>.
                    </div>
                  }
                >
                  Name
                </LabelWithDetailedTooltip>
              ),
            },
          },
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
                  disableDynamicValue
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
                  disableDynamicValue
                />
              ),
          },
          advancedSection: {
            render: () => {
              return (
                <AdvancedToggle advanced={advanced} onChange={setAdvanced} />
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

const selectedChoiceValues = (
  val: Expr | JsonValue | undefined
): ChoiceValue[] | undefined => {
  if (val == null || isKnownExpr(val)) {
    return undefined;
  }
  // The values keep the type they were written with.
  return ensureArray(val).filter(
    (v): v is ChoiceValue => isJsonScalar(v) && v !== null
  );
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
        <StyleSwitch
          data-plasmic-prop="advanced-toggle"
          isChecked={advanced ?? false}
          onChange={onChange}
        >
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
  disableDynamicValue?: boolean;
}> = ({
  attr,
  label,
  value,
  onChange,
  propType,
  propTypeData,
  choices,
  disableDynamicValue,
}) => {
  const displayVal = exprDisplayVal(value, propTypeData);
  const isMultiSelect =
    isPlainObjectPropType(propType) &&
    propType.type === "choice" &&
    propType.multiSelect === true;

  const valueSetState = displayVal === undefined ? "isUnset" : "isSet";
  return (
    <div className="generic-prop-editor" data-test-id={attr}>
      {choices.length ? (
        isMultiSelect ? (
          <ChoicePropEditor
            multiSelect={true}
            attr={attr}
            valueSetState={valueSetState}
            onChange={(val) => {
              onChange(jsonExprToExpr(val));
            }}
            options={choices}
            value={selectedChoiceValues(displayVal)}
            defaultValueHint={[]}
          />
        ) : (
          <ChoicePropEditor
            multiSelect={false}
            attr={attr}
            valueSetState={valueSetState}
            onChange={(val) => {
              onChange(jsonExprToExpr(val));
            }}
            options={choices}
            value={selectedChoiceValues(displayVal)?.[0]}
            defaultValueHint=""
          />
        )
      ) : (
        <PropValueEditor
          attr={attr}
          label={label}
          value={displayVal}
          onChange={(val) => {
            const expr = jsonExprToExpr(val);

            if (
              expr === undefined ||
              !validateValueForPropType(
                attr === "preview-value" ? "Preview" : "Default",
                propTypeData,
                undefined,
                expr
              )
            ) {
              onChange(expr);
            } else {
              unexpected(
                `PropValueEditor returned value that doesn't satisfy ${propTypeData?.value}`
              );
            }
          }}
          propType={propType}
          disableDynamicValue={disableDynamicValue}
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
