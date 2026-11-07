import { EditorSession } from "@/wab/client/components/editor-sessions/editor-session";
import type { ModelTarget } from "@/wab/client/components/editor-sessions/model-target";
import {
  checkDisallowedStateBindingAssignment,
  checkDisallowedUseOfLibs,
  checkStrSizeLimit,
  checkSyntaxError,
  checkWindowGlobalUsage,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/CodeEditor";
import type { DataPickerProps } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  getAllVariantsForTpl,
  isBaseVariant,
  tryGetVariantSetting,
  variantComboKey,
} from "@/wab/shared/Variants";
import { flattenTpls } from "@/wab/shared/core/tpls";
import {
  pathToString,
  transformDataTokenPathToBundle,
  transformDataTokenPathToDisplay,
  transformDataTokensInCode,
  transformDataTokensToDisplay,
} from "@/wab/shared/eval/expression-parser";
import {
  Component,
  TplNode,
  Variant,
  VariantSetting,
} from "@/wab/shared/model/classes";

export interface BindingPreviewContext {
  viewCtx: ViewCtx;
  component: Component;
  tpl: TplNode | undefined;
  cloneKey: string | undefined;
}

export interface BindingIdentity extends ModelTarget {
  key?: string;
}

export interface BindingTarget extends BindingIdentity {
  readonly context: Omit<BindingPreviewContext, "cloneKey">;
  write(value: DataPickerProps["value"]): undefined;
  unlink?: () => undefined;
  value(): DataPickerProps["value"];
  data(preview: BindingPreviewContext): Record<string, any> | undefined;
  schema(): DataPickerProps["schema"];
}

export function isBindingTarget(
  target: BindingIdentity | undefined,
): target is BindingTarget {
  return !!target && "write" in target;
}

export interface BindingDraft {
  codeEditing: boolean;
  code: string;
  path: (string | number)[];
}

export function bindingTarget(
  viewCtx: ViewCtx,
  tpl: TplNode,
  variants: readonly Variant[],
  field: string,
  read: (setting: VariantSetting | undefined) => unknown,
): BindingIdentity {
  const component = viewCtx.currentComponent();
  const originalSetting = tryGetVariantSetting(tpl, variants);
  return {
    key: `${component.uuid}:${tpl.uuid}:${variantComboKey(variants)}:${field}`,
    exists: () =>
      viewCtx.site.components.includes(component) &&
      flattenTpls(component.tplTree).includes(tpl) &&
      (!originalSetting || tpl.vsettings.includes(originalSetting)) &&
      variants.every(
        (variant) =>
          isBaseVariant(variant) ||
          getAllVariantsForTpl({
            component,
            tpl,
            site: viewCtx.site,
            includeSuperVariants: true,
          }).includes(variant),
      ),
    read: () => read(tryGetVariantSetting(tpl, variants)),
  };
}

export function validateBindingCode(code: string) {
  return (
    checkStrSizeLimit(code) &&
    checkSyntaxError(code) &&
    checkDisallowedStateBindingAssignment(code) &&
    checkDisallowedUseOfLibs(code)
  );
}

export function createBindingSession(
  props: DataPickerProps,
  viewCtx?: ViewCtx,
  {
    parentDraft = false,
    studioCtx,
  }: { parentDraft?: boolean; studioCtx?: Pick<StudioCtx, "change"> } = {},
) {
  viewCtx = isBindingTarget(props.target)
    ? props.target.context.viewCtx
    : viewCtx;
  const onChange = props.onChange;
  const component = viewCtx?.currentComponent();
  const tpl = viewCtx?.focusedTpl();
  const target: ModelTarget | undefined =
    props.target ??
    (!parentDraft && viewCtx && component && tpl
      ? {
          exists: () =>
            viewCtx.site.components.includes(component) &&
            flattenTpls(component.tplTree).includes(tpl),
        }
      : undefined);
  const value =
    !props.value || !viewCtx
      ? props.value
      : typeof props.value === "string"
        ? transformDataTokensToDisplay(
            props.value,
            viewCtx.site,
            viewCtx.siteInfo.id,
          )
        : transformDataTokenPathToDisplay(
            props.value,
            viewCtx.site,
            viewCtx.siteInfo.id,
          );
  return new EditorSession<BindingDraft>({
    initial: {
      codeEditing:
        !props.data ||
        (!value
          ? props.initialMode === "codeEditing"
          : typeof value === "string"),
      code: Array.isArray(value) ? pathToString(value) : (value ?? ""),
      path: Array.isArray(value) ? value : ["undefined"],
    },
    // Toggling modes over the same expression is not an edit.
    snapshot: (draft) =>
      draft.codeEditing ? draft.code : pathToString(draft.path),
    target,
    studioCtx: parentDraft ? undefined : (viewCtx?.studioCtx ?? studioCtx),
    prepare: (draft) => {
      if (draft.codeEditing) {
        if (!validateBindingCode(draft.code)) {
          return {
            kind: "blocked",
            message:
              "Correct the expression before saving, or Cancel to discard it.",
          };
        }
        checkWindowGlobalUsage(draft.code);
      }
      return {
        apply: () => {
          const value = draft.codeEditing ? draft.code : draft.path;
          onChange(
            !viewCtx
              ? value
              : typeof value === "string"
                ? transformDataTokensInCode(
                    value,
                    viewCtx.site,
                    viewCtx.siteInfo.id,
                  ).code
                : transformDataTokenPathToBundle(
                    value,
                    viewCtx.site,
                    viewCtx.siteInfo.id,
                  ),
          );
        },
      };
    },
  });
}
