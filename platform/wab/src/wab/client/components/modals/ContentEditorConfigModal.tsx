import { AppCtx } from "@/wab/client/app-ctx";
import Button from "@/wab/client/components/widgets/Button";
import { Modal } from "@/wab/client/components/widgets/Modal";
import Select from "@/wab/client/components/widgets/Select";
import { ensureType, isOneOf, unreachable } from "@/wab/common";
import { brand } from "@/wab/commons/types";
import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import {
  BASIC_ALIASES,
  COMPONENT_ALIASES,
  LeftTabButtonKey,
  LeftTabKey,
  LEFT_TAB_PANEL_KEYS,
  makeNiceAliasName,
  PROJECT_CONFIGS,
  UiConfig,
} from "@/wab/shared/ui-config-utils";
import { capitalizeFirst } from "@/wab/strs";
import { Form, Input } from "antd";
import { capitalize, omit, uniqBy } from "lodash";
import React from "react";
import sty from "./ContentEditorConfigModal.module.scss";

const HIDDEN_LEFT_TAB_KEYS: LeftTabKey[] = ["outline", "copilot"];

export function ContentEditorConfigModal(props: {
  appCtx: AppCtx;
  config: UiConfig;
  title: React.ReactNode;
  level: "team" | "workspace" | "content-editor";
  onSubmit: (config: UiConfig) => void;
  onCancel: () => void;
}) {
  const { appCtx, config, onSubmit, onCancel, title, level } = props;

  const [form] = Form.useForm();

  return (
    <Modal
      title={title}
      open={true}
      footer={null}
      onCancel={onCancel}
      closable={false}
      wrapClassName="prompt-modal"
    >
      <Form
        form={form}
        onFinish={(values) => {
          onSubmit?.(
            ensureType<UiConfig>({
              ...values,
              pageTemplates: safeParse(values.pageTemplates),
              insertableTemplates: safeParse(values.insertableTemplates),
            })
          );
        }}
        initialValues={{
          ...config,
          // We edit pageTemplates and insertableTemplates as json strings
          pageTemplates:
            config.pageTemplates == null
              ? ""
              : JSON.stringify(config.pageTemplates, null, 2),
          insertableTemplates:
            config.insertableTemplates == null
              ? ""
              : JSON.stringify(config.insertableTemplates, null, 2),
        }}
      >
        <h3 className="mv-xlg">Insertion</h3>
        <Form.Item name={["canInsertBasics"]} noStyle>
          <BooleanPreferencesControl
            label="Can insert basic elements?"
            prefKeys={BASIC_ALIASES.map((alias) => ({
              value: alias,
              label: makeNiceAliasName(alias),
            }))}
          />
        </Form.Item>
        <Form.Item name={["canInsertBuiltinComponent"]} noStyle>
          <BooleanPreferencesControl
            label="Can insert builtin components?"
            prefKeys={COMPONENT_ALIASES.map((alias) => ({
              value: alias,
              label: makeNiceAliasName(alias),
            }))}
          />
        </Form.Item>
        <Form.Item name={["canInsertHostless"]} noStyle>
          <BooleanPreferencesControl
            label="Can use components from component store?"
            prefKeys={[
              ...uniqBy(
                appCtx.appConfig.hostLessComponents ?? [],
                (p) => p.codeName
              ).map((pkg) => ({
                value: pkg.codeName ?? "",
                label: pkg.name,
              })),
            ]}
          />
        </Form.Item>

        <h3 className="mv-xlg">Project Configs</h3>
        <Form.Item name={["projectConfigs"]} noStyle>
          <PreferencesControl
            label={"Can edit project configurations?"}
            prefKeys={PROJECT_CONFIGS.map((t) => ({
              value: t,
              label: capitalizeFirst(t),
            }))}
            options={[true, false]}
            optionLabel={(op) => (op ? "Enabled" : "Disabled")}
          />
        </Form.Item>

        <h3 className="mv-xlg">Left tabs</h3>
        <Form.Item name={["leftTabs"]} noStyle>
          <PreferencesControl
            label={"Show left tabs?"}
            prefKeys={LEFT_TAB_PANEL_KEYS.filter(
              (x) => !HIDDEN_LEFT_TAB_KEYS.includes(x)
            ).map((t) => ({ value: t, label: leftTabKeyToLabel(t) }))}
            options={["hidden", "readable", "writable"]}
            optionLabel={(op) => capitalizeFirst(op)}
          />
        </Form.Item>

        <h3 className="mv-xlg">Style panels</h3>
        <Form.Item name={["styleSectionVisibilities"]} noStyle>
          <BooleanPreferencesControl
            label="Can edit these sections in the right panel?"
            prefKeys={Object.entries(PublicStyleSection).map(
              ([label, value]) => ({ value, label })
            )}
          />
        </Form.Item>

        {isOneOf(level, ["team", "workspace"]) && (
          <>
            <hr className="mv-xlg" />
            <h3>Branding</h3>
            <Form.Item
              name={["brand", "logoImgSrc"]}
              label="Logo image url"
              getValueFromEvent={(e) =>
                e.target.value === "" ? undefined : e.target.value
              }
            >
              <Input />
            </Form.Item>
            <Form.Item
              name={["brand", "logoHref"]}
              label="Logo link url"
              getValueFromEvent={(e) =>
                e.target.value === "" ? undefined : e.target.value
              }
            >
              <Input />
            </Form.Item>
          </>
        )}

        <hr className="mv-xlg" />
        <h3>Templates</h3>
        {renderJsonEditor({
          fieldName: "pageTemplates",
          label: "page templates",
          help: "JSON array of page templates.",
          defaultInitialValue: [
            {
              displayName: "My Page Template",
              imageUrl: "https://example.com/my-template.png",
              projectId: brand("rBVncjZMfEPDGmCMNe2QhK"),
              componentName: "Homepage",
              category: "Landing Pages",
            },
          ],
        })}
        {renderJsonEditor({
          fieldName: "insertableTemplates",
          label: "insertable templates",
          help: "JSON array of insertable templates.",
          defaultInitialValue: [
            {
              displayName: "My Insertable Template",
              imageUrl: "https://example.com/my-template.png",
              projectId: brand("3SwC2F4BeXucfS9cpFbd24"),
              componentName: "Hero Section 1",
              category: "Hero Sections",
            },
          ],
        })}
        <Form.Item style={{ margin: 0 }}>
          <Button className="mr-sm" type="primary" htmlType="submit">
            Update
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
function renderJsonEditor<T>({
  fieldName,
  label,
  help,
  defaultInitialValue,
}: {
  fieldName: string;
  label: string;
  help: string;
  defaultInitialValue: T;
}) {
  return (
    <Form.Item shouldUpdate>
      {(form) =>
        !form.getFieldValue([fieldName]) ? (
          <Button
            onClick={() => {
              form.setFieldsValue({
                [fieldName]: JSON.stringify(defaultInitialValue, null, 2),
              });
            }}
          >
            Configure custom {label}
          </Button>
        ) : (
          <Form.Item
            name={[fieldName]}
            label={capitalize(label)}
            help={help}
            rules={[
              {
                validator: async (_, value) => {
                  value.trim().length === 0 || safeParse(value);
                },
              },
            ]}
          >
            <Input.TextArea rows={12} />
          </Form.Item>
        )
      }
    </Form.Item>
  );
}

const safeParse = (str: string) => {
  return str?.trim().length > 0 ? JSON.parse(str) : null;
};

type BooleanPreferencesType<T extends string> =
  | boolean
  | undefined
  | null
  | Record<T, boolean>;

function BooleanPreferencesControl<T extends string>(props: {
  label: string;
  prefKeys: (T | { value: T; label?: string })[];
  value?: BooleanPreferencesType<T>;
  onChange?: (value: BooleanPreferencesType<T>) => void;
}) {
  const { label, prefKeys, value, onChange } = props;
  return (
    <>
      <Form.Item label={label}>
        <Select
          type="bordered"
          value={
            value == null
              ? "default"
              : value === true
              ? "yes"
              : value === false
              ? "no"
              : "whitelist"
          }
          onChange={(newValue) =>
            onChange?.(
              newValue === "default"
                ? null
                : newValue === "yes"
                ? true
                : newValue === "no"
                ? false
                : ({} as Record<T, boolean>)
            )
          }
        >
          <Select.Option value={"default"}>Default</Select.Option>
          <Select.Option value={"yes"}>Allowed</Select.Option>
          <Select.Option value={"no"}>Disallowed</Select.Option>
          <Select.Option value={"whitelist"}>Configure whitelist</Select.Option>
        </Select>
      </Form.Item>
      {value != null && typeof value === "object" && (
        <PreferenceMapControl
          prefKeys={prefKeys}
          value={value}
          onChange={onChange}
          options={[true, false]}
          optionKey={(op) => (op ? "yes" : "no")}
          optionLabel={(op) => (op ? "Allowed" : "Disallowed")}
        />
      )}
    </>
  );
}

function PreferenceSelect<OptionType>(props: {
  value?: OptionType;
  onChange?: (value: OptionType | undefined) => void;
  options: OptionType[];
  optionKey?: (op: OptionType) => string;
  optionLabel?: (op: OptionType) => string;
  size?: React.ComponentProps<typeof Select>["size"];
}) {
  const { value, onChange, options, size } = props;
  const optionKey = props.optionKey ?? ((op: OptionType) => `${op}`);
  const optionLabel =
    props.optionLabel ??
    ((op: OptionType) =>
      (op as any) === true
        ? "Allowed"
        : (op as any) === false
        ? "Disallowed"
        : `${op}`);
  return (
    <Select
      type="bordered"
      value={value == null ? "default" : optionKey(value)}
      onChange={(val) => {
        if (val === "default") {
          onChange?.(undefined);
        } else {
          const option = options.find((op) => optionKey(op) === val);
          if (option != null) {
            onChange?.(option);
          }
        }
      }}
      size={size}
    >
      <Select.Option value={"default"}>Default</Select.Option>
      {options?.map((op) => (
        <Select.Option key={optionKey(op)} value={optionKey(op)}>
          {optionLabel(op)}
        </Select.Option>
      ))}
    </Select>
  );
}

function PreferencesControl<T extends string, OptionType>(props: {
  label?: React.ReactNode;
  prefKeys: (T | { value: T; label?: string })[];
  value?: Record<T, OptionType>;
  onChange?: (value: Record<T, OptionType> | undefined) => void;
  options: OptionType[];
  optionKey?: (op: OptionType) => string;
  optionLabel?: (op: OptionType) => string;
}) {
  const { label, prefKeys, value, onChange, options, optionKey, optionLabel } =
    props;
  return (
    <>
      <Form.Item label={label}>
        <Select
          type="bordered"
          value={value == null ? "default" : "customize"}
          onChange={(newValue) =>
            onChange?.(
              newValue === "default" ? undefined : ({} as Record<T, OptionType>)
            )
          }
        >
          <Select.Option value={"default"}>Default</Select.Option>
          <Select.Option value={"customize"}>Customize</Select.Option>
        </Select>
      </Form.Item>
      {value != null && typeof value === "object" && (
        <PreferenceMapControl
          prefKeys={prefKeys}
          value={value}
          onChange={onChange}
          options={options}
          optionKey={optionKey}
          optionLabel={optionLabel}
        />
      )}
    </>
  );
}

function PreferenceMapControl<T extends string, OptionType>(props: {
  prefKeys: (T | { value: T; label?: string })[];
  value?: Record<T, OptionType>;
  onChange?: (value: Record<T, OptionType>) => void;
  options: OptionType[];
  optionKey?: (op: OptionType) => string;
  optionLabel?: (op: OptionType) => string;
}) {
  const { prefKeys, value, onChange, options, optionKey, optionLabel } = props;

  return (
    <Form.Item>
      <table className={sty.prefsTable}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Allowed?</th>
          </tr>
        </thead>
        <tbody>
          {prefKeys.map((prefKey) => {
            const prefKeyString =
              typeof prefKey === "string" ? prefKey : prefKey.value;
            const prefLabel =
              (typeof prefKey === "object" ? prefKey.label : undefined) ??
              prefKeyString;
            return (
              <tr key={prefKeyString}>
                <td>{prefLabel}</td>
                <td>
                  <PreferenceSelect
                    options={options}
                    optionKey={optionKey}
                    optionLabel={optionLabel}
                    size="small"
                    value={value?.[prefKeyString]}
                    onChange={(op) => {
                      if (op == null) {
                        onChange?.(
                          (value ? omit(value, prefKeyString) : {}) as Record<
                            T,
                            OptionType
                          >
                        );
                      } else {
                        onChange?.({ ...value, [prefKeyString]: op } as Record<
                          T,
                          OptionType
                        >);
                      }
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Form.Item>
  );
}

function leftTabKeyToLabel(key: LeftTabButtonKey) {
  switch (key) {
    case "outline":
      return "Outline";
    case "components":
      return "Components";
    case "tokens":
      return "Style tokens";
    case "mixins":
      return "Style presets";
    case "fonts":
      return "Custom fonts";
    case "themes":
      return "Default styles";
    case "images":
      return "Image assets";
    case "responsiveness":
      return "Responsive breakpoints";
    case "imports":
      return "Imported projects";
    case "versions":
      return "Published versions";
    case "settings":
      return "Global context settings";
    case "splits":
      return "Optimize";
    case "lint":
      return "Lint issues";
    case "copilot":
      return "Copilot";
    case "figma":
      return "Figma";
    default:
      unreachable(key);
  }
}
