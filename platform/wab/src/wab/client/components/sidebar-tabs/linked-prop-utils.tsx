import { reactConfirm } from "@/wab/client/components/quick-modals";
import { Icon } from "@/wab/client/components/widgets/Icon";
import MinusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { arrayRemove } from "@/wab/shared/collections";
import { mkUuid } from "@/wab/shared/common";
import { codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { cloneType, findAllInstancesOfComponent } from "@/wab/shared/core/tpls";
import { findLinkedPropIssuesForParam } from "@/wab/shared/linting/lint-linked-props";
import { Component, Expr, Param, Type } from "@/wab/shared/model/classes";
import {
  isMultiChoiceType,
  isOptionsType,
  normalizeToChoiceObjects,
} from "@/wab/shared/model/model-util";
import { ChoiceValue } from "@plasmicapp/host";
import { notification } from "antd";
import L from "lodash";
import * as React from "react";

/**
 * Reshapes a stored linked-prop value to the given valid option values and
 * single/multi shape, dropping members that are no longer valid options.
 * Dynamic / non-literal exprs are left untouched.
 */
export function coerceLinkedPropValue(
  expr: Expr | null | undefined,
  validValues: ChoiceValue[],
  multi: boolean
): Expr | null {
  if (!expr) {
    return null;
  }
  const val = tryExtractJson(expr);
  if (val === undefined) {
    return expr;
  }
  const valid = (Array.isArray(val) ? val : [val]).filter(
    (v): v is ChoiceValue =>
      (typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean") &&
      validValues.includes(v)
  );
  if (valid.length === 0) {
    return null;
  }
  return multi ? codeLit(valid) : codeLit(valid[0]);
}

/**
 * Brings an outer prop back in sync with the inner prop it's linked to.
 * This is only possible for single/multi-choice props
 */
export async function reconcileLinkedProp(opts: {
  viewCtx: ViewCtx;
  innerType: Type;
  innerName: string;
  outerParam: Param;
  outerComponent: Component;
}): Promise<void> {
  const { viewCtx, innerType, innerName, outerParam, outerComponent } = opts;
  if (!isOptionsType(innerType) || !isOptionsType(outerParam.type)) {
    return;
  }
  const newOptions = normalizeToChoiceObjects(innerType.options);
  const currentOptions = normalizeToChoiceObjects(outerParam.type.options);
  const added = L.differenceBy(newOptions, currentOptions, "value");
  const removed = L.differenceBy(currentOptions, newOptions, "value");
  const multi = isMultiChoiceType(innerType);
  const multiChanged = isMultiChoiceType(outerParam.type) !== multi;

  const confirmed = await reactConfirm({
    title: "Update linked prop",
    message: (
      <div>
        <p>
          Update <strong>{outerParam.variable.name}</strong> to match{" "}
          <strong>{innerName}</strong>?
        </p>
        {added.length > 0 && (
          <p>
            <Icon icon={PlusIcon} className="added-fg mr-sm" />
            <strong>Adding:</strong> {added.map((o) => o.label).join(", ")}
          </p>
        )}
        {removed.length > 0 && (
          <p>
            <Icon icon={MinusIcon} className="removed-fg mr-sm" />
            <strong>Removing:</strong> {removed.map((o) => o.label).join(", ")}
          </p>
        )}
        {multiChanged && (
          <p>
            Switching to{" "}
            <strong>{multi ? "multi-select" : "single-select"}</strong>.
          </p>
        )}
      </div>
    ),
    confirmLabel: "Update",
  });
  if (!confirmed) {
    return;
  }

  const newValues = newOptions.map((o) => o.value);
  viewCtx.change(() => {
    outerParam.type = cloneType(innerType);
    outerParam.defaultExpr = coerceLinkedPropValue(
      outerParam.defaultExpr,
      newValues,
      multi
    );
    outerParam.previewExpr = coerceLinkedPropValue(
      outerParam.previewExpr,
      newValues,
      multi
    );
    for (const { tpl: instance } of findAllInstancesOfComponent(
      viewCtx.site,
      outerComponent
    )) {
      for (const ivs of instance.vsettings) {
        const argItem = ivs.args.find((arg) => arg.param === outerParam);
        if (!argItem) {
          continue;
        }
        const coerced = coerceLinkedPropValue(argItem.expr, newValues, multi);
        if (coerced) {
          argItem.expr = coerced;
        } else {
          arrayRemove(ivs.args, argItem);
        }
      }
    }
  });
}

export function notifyLinkedPropDrift(
  studioCtx: StudioCtx,
  innerComponent: Component,
  innerParam: Param
): void {
  const issues = findLinkedPropIssuesForParam(
    studioCtx.site,
    innerComponent,
    innerParam
  );
  if (issues.length === 0) {
    return;
  }
  const componentNames = L.uniq(issues.map((i) => i.component.name));
  const key = mkUuid();
  notification.warning({
    key,
    message: "Linked props out of sync",
    description: (
      <>
        <p>{`This change left ${issues.length} linked prop${
          issues.length > 1 ? "s" : ""
        } out of sync on: ${componentNames.join(", ")}.`}</p>
        <a
          onClick={() => {
            studioCtx.switchLeftTab("lint", { highlight: true });
            notification.close(key);
          }}
        >
          [Review in Issues tab]
        </a>
      </>
    ),
    duration: 10,
  });
}
