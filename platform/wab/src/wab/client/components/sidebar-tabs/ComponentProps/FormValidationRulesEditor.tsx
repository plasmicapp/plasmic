import {
  isPropShown,
  PropEditorRow,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import Button from "@/wab/client/components/widgets/Button";
import Chip from "@/wab/client/components/widgets/Chip";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  maybePropTypeToDisplayName,
  StudioPropType,
} from "@/wab/shared/code-components/code-components";
import { arrayRemove } from "@/wab/shared/collections";
import { assert } from "@/wab/shared/common";
import {
  clone as cloneExpr,
  codeLit,
  tryExtractJson,
  tryExtractString,
} from "@/wab/shared/core/exprs";
import {
  CollectionExpr,
  ensureKnownMapExpr,
  Expr,
  isKnownCustomCode,
  isKnownMapExpr,
  MapExpr,
  TplComponent,
  TplTag,
} from "@/wab/shared/model/classes";
import omit from "lodash/omit";
import React from "react";

const RULE_EDITORS: {
  name: string;
  type: StudioPropType<Record<string, Expr>>;
}[] = [
  {
    name: "ruleType",
    type: {
      type: "choice",
      options: [
        { label: "Is required", value: "required" },
        { label: "Minimum length", value: "min" },
        { label: "Maximum length", value: "max" },
        { label: "Must be one of", value: "enum" },
        // { label: "Matches regex", value: "regex" },
        { label: "Forbid all-whitespace", value: "whitespace" },
        { label: "Custom validator", value: "advanced" },
        { label: "(Remove rule)", value: "remove" },
      ],
      defaultValue: "required",
      disableDynamicValue: true,
      displayName: "Rule type",
    },
  },
  {
    name: "length",
    type: {
      type: "number",
      hidden: (props) =>
        !["max", "min"].includes(tryExtractString(props.ruleType) || ""),
      displayName: "Length",
    },
  },
  {
    name: "pattern",
    type: {
      type: "string",
      hidden: (props) =>
        !["pattern"].includes(tryExtractString(props.ruleType) || ""),
      displayName: "Pattern",
    },
  },
  {
    name: "custom",
    type: {
      type: "function",
      displayName: "Validator",
      hidden: (props) => tryExtractJson(props.ruleType) !== "advanced",
      argTypes: [
        {
          name: "rule",
          type: "object",
        },
        {
          name: "value",
          type: "string",
        },
      ],
    },
  },
  {
    name: "options",
    type: {
      type: "array",
      itemType: {
        type: "object",
        nameFunc: (item: any) => item?.label ?? item?.value,
        fields: {
          value: {
            type: "string",
            displayName: "Value",
          },
        },
      },
      hidden: (props) => tryExtractJson(props.ruleType) !== "enum",
      displayName: "Options",
    },
  },
  {
    name: "message",
    type: {
      type: "string",
      displayName: "Error message",
    },
  },
];

interface ValidationRuleBuilderProps {
  onChange: (argName: string, value: Expr | undefined) => void;
  onDelete: () => void;
  viewCtx: ViewCtx;
  tpl: TplTag | TplComponent;
  rule: Record<string, Expr>;
}

export function ValidationRuleBuilder(props: ValidationRuleBuilderProps) {
  const { onChange, onDelete, viewCtx, tpl, rule } = props;
  return (
    <>
      {RULE_EDITORS.map(({ name, type }) => {
        if (!isPropShown(type, rule)) {
          return null;
        }
        return (
          <PropEditorRow
            viewCtx={viewCtx}
            tpl={tpl}
            onChange={(expr) => {
              if (
                name === "ruleType" &&
                isKnownCustomCode(expr) &&
                tryExtractJson(expr) === "remove"
              ) {
                onDelete();
                return;
              }
              onChange(name, expr);
            }}
            definedIndicator={{ source: "invariantable" }}
            propType={type}
            label={maybePropTypeToDisplayName(type) || name}
            expr={rule[name]}
            disableLinkToProp={true}
            attr={name}
            componentPropValues={rule}
            schema={viewCtx.customFunctionsSchema()}
            env={{
              ...(viewCtx.getCanvasEnvForTpl(tpl) ?? {}),
              ...(name === "custom"
                ? {
                    rule: {},
                    value: {},
                  }
                : {}),
            }}
          />
        );
      })}
      <div className="p-m">
        <hr />
      </div>
    </>
  );
}

interface FormValidationRulesEditorProps {
  value?: CollectionExpr;
  onChange: (value: CollectionExpr) => void;
  viewCtx: ViewCtx;
  tpl: TplTag | TplComponent;
}

export function FormValidationRulesEditor(
  props: FormValidationRulesEditorProps
) {
  const clonedExpr = props.value ? cloneExpr(props.value) : undefined;
  const rules = clonedExpr?.exprs ?? [];
  const [showModal, setShowModal] = React.useState(false);

  return (
    <>
      <div className="flex-fill flex-left text-ellipsis">
        <Chip onClick={() => setShowModal(true)}>
          <span className="line-clamp-12">
            {rules.length} rule{rules.length !== 1 ? "s" : ""}
          </span>
        </Chip>
      </div>
      {showModal && (
        <SidebarModal
          show
          onClose={() => setShowModal(false)}
          title={`Configure Rules`}
        >
          <div className="p-m pr-xxlg overflow-hidden">
            <div className="flex-col fill-height fill-width gap-m">
              {rules.map((rule, index) => {
                assert(
                  isKnownMapExpr(rule),
                  "only map expr are allowed to form validation rule"
                );
                return (
                  <div>
                    <ValidationRuleBuilder
                      key={`rule-${index}`}
                      {...omit(props, "value")}
                      onChange={(argName, argExpr) => {
                        const newExpr = props.value
                          ? cloneExpr(props.value)
                          : new CollectionExpr({ exprs: [] });
                        const mapExpr = ensureKnownMapExpr(
                          newExpr.exprs[index]
                        ).mapExpr;
                        if (!argExpr) {
                          delete mapExpr[argName];
                        } else {
                          mapExpr[argName] = argExpr;
                        }
                        props.onChange(newExpr);
                      }}
                      onDelete={() => {
                        if (!clonedExpr) {
                          return;
                        }
                        arrayRemove(clonedExpr.exprs, rule);
                        props.onChange(clonedExpr);
                      }}
                      rule={rule.mapExpr}
                    />
                  </div>
                );
              })}
              <Button
                startIcon={<Icon icon={PlusIcon} />}
                onClick={() => {
                  const newExpr = props.value
                    ? cloneExpr(props.value)
                    : new CollectionExpr({ exprs: [] });
                  newExpr.exprs.push(
                    new MapExpr({
                      mapExpr: {
                        ruleType: codeLit("required"),
                      },
                    })
                  );
                  props.onChange(newExpr);
                }}
                type={"primary"}
              >
                Add new rule
              </Button>
            </div>
          </div>
        </SidebarModal>
      )}
    </>
  );
}
