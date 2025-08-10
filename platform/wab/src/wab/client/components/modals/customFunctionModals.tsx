import {
  reactConfirm,
  showTemporaryPrompt,
} from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { Modal } from "@/wab/client/components/widgets/Modal";
import Select from "@/wab/client/components/widgets/Select";
import TrashsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__TrashSvg";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { cachedExprsInSite } from "@/wab/shared/cached-selectors";
import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { ensure, removeWhere } from "@/wab/shared/common";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import { fixCustomFunctionExpr } from "@/wab/shared/core/custom-functions";
import { isDynamicExpr } from "@/wab/shared/core/exprs";
import { ExprReference, findExprsInInteraction } from "@/wab/shared/core/tpls";
import { codeUsesFunction } from "@/wab/shared/eval/expression-parser";
import {
  Component,
  CustomFunction,
  Expr,
  isKnownCustomCode,
  isKnownCustomFunctionExpr,
  isKnownEventHandler,
  isKnownExpr,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
import { renameDollarFunctions } from "@/wab/shared/refactoring";
import { naturalSort } from "@/wab/shared/sort";
import * as React from "react";

type RemapFunctionResponse = CustomFunction | "delete";

interface ExprRef {
  ownerComponent: Component;
  exprRefs: ExprReference[];
}

function getCustomFunctionDisplayName(customFunction: CustomFunction): string {
  return customFunction.displayName || customFunctionId(customFunction);
}

async function promptRemapCustomFunction(props: {
  customFunction: CustomFunction;
  refComponents: Component[];
  availableFunctions: CustomFunction[];
}) {
  const { customFunction, refComponents, availableFunctions } = props;

  const fnDisplay = getCustomFunctionDisplayName(customFunction);

  const candidates = naturalSort(
    [...availableFunctions],
    getCustomFunctionDisplayName
  );

  return showTemporaryPrompt<RemapFunctionResponse>((onSubmit, onCancel) => (
    <Modal
      title={
        <>
          Custom function no longer registered: {fnDisplay} (
          <code>{customFunction.importPath}</code>)
        </>
      }
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
    >
      <p>
        Function <code>{fnDisplay}</code> is no longer registered, but is being
        used by{" "}
        <strong>{refComponents.map(getComponentDisplayName).join(", ")}</strong>
        . What would you like to do?
      </p>
      <div className="flex flex-vcenter">
        <Select
          type="bordered"
          placeholder={"Replace with another function..."}
          onChange={async (value) => {
            if (value) {
              const newFn = ensure(
                candidates.find((c) => customFunctionId(c) === value),
                "Must have picked from candidates list"
              );
              const newName = getCustomFunctionDisplayName(newFn);
              if (
                await reactConfirm({
                  message: `Replace all uses of "${fnDisplay}" with "${newName}"?`,
                })
              ) {
                onSubmit(newFn);
              }
            }
          }}
        >
          {candidates.map((fn) => (
            <Select.Option
              key={customFunctionId(fn)}
              value={customFunctionId(fn)}
              textValue={getCustomFunctionDisplayName(fn)}
            >
              <div className="flex fill-width flex-vcenter">
                <span className="flex-fill">
                  {getCustomFunctionDisplayName(fn)}{" "}
                </span>
                <code
                  className="ml-lg text-ellipsis"
                  style={{ maxWidth: 200 }}
                  title={fn.importPath}
                >
                  {fn.importPath}
                </code>
              </div>
            </Select.Option>
          ))}
        </Select>
        <div className="mh-lg">or</div>
        <div>
          <Button
            startIcon={<Icon icon={TrashsvgIcon} />}
            withIcons={["startIcon"]}
            onClick={() => onSubmit("delete")}
          >
            Delete all existing uses
          </Button>
        </div>
      </div>
    </Modal>
  ));
}

async function tryRemapMissingCustomFunctions(
  missing: Set<CustomFunction>,
  componentExprRefs: ExprRef[],
  availableFunctions: CustomFunction[]
): Promise<{
  removedFunctions: Set<CustomFunction>;
  remappedFunctions: Map<CustomFunction, CustomFunction>;
}> {
  const removedFunctions = new Set<CustomFunction>();
  const remappedFunctions = new Map<CustomFunction, CustomFunction>();

  for (const customFunction of missing) {
    const fnName = customFunctionId(customFunction);
    const refComponents = componentExprRefs
      .filter(({ ownerComponent, exprRefs }) => {
        return (
          exprRefs.some(({ expr }) =>
            exprUsesFunction(expr, customFunction, fnName)
          ) ||
          ownerComponent.serverQueries.some(
            (q) => q.op && exprUsesFunction(q.op, customFunction, fnName)
          )
        );
      })
      .map((ref) => ref.ownerComponent);
    // Don't prompt user if there are no uses
    if (refComponents.length === 0) {
      removedFunctions.add(customFunction);
      continue;
    }
    const functionToRemap = await promptRemapCustomFunction({
      customFunction,
      refComponents,
      availableFunctions,
    });
    if (functionToRemap && functionToRemap !== "delete") {
      remappedFunctions.set(customFunction, functionToRemap);
    }
    removedFunctions.add(customFunction);
  }
  return { removedFunctions, remappedFunctions };
}

function exprUsesFunction(
  expr: Expr,
  fn: CustomFunction,
  fnName: string
): boolean {
  if (isKnownCustomFunctionExpr(expr)) {
    return expr.func === fn;
  }
  if (isKnownCustomCode(expr)) {
    return codeUsesFunction(expr.code.slice(1, -1), fnName);
  }
  if (isKnownTemplatedString(expr)) {
    return expr.text.some(
      (part) => isKnownExpr(part) && exprUsesFunction(part, fn, fnName)
    );
  }
  return false;
}

const isCustomFunctionOrDynamicExpr = (expr: Expr) => {
  return isKnownCustomFunctionExpr(expr) || isDynamicExpr(expr);
};

export async function updateSiteCustomFunctions(props: {
  ctx: StudioCtx;
  newFunctions: CustomFunction[];
  updatedFunctions: CustomFunction[];
  removedFunctions: Set<CustomFunction>;
}) {
  const { ctx, newFunctions, updatedFunctions } = props;
  const { site } = ctx;

  const exprRefs: ExprRef[] = cachedExprsInSite(site).map((ref) => {
    return {
      ownerComponent: ref.ownerComponent,
      exprRefs: ref.exprRefs.filter(
        ({ expr }) =>
          (isKnownEventHandler(expr) &&
            expr.interactions.some((interaction) =>
              findExprsInInteraction(interaction).some(
                isCustomFunctionOrDynamicExpr
              )
            )) ||
          isCustomFunctionOrDynamicExpr(expr)
      ),
    };
  });
  ctx.observeComponents(exprRefs.map((ref) => ref.ownerComponent));

  const availableFunctions = site.customFunctions.filter(
    (customFunction) => !props.removedFunctions.has(customFunction)
  );

  // Allow the user to remap missing functions
  const { removedFunctions, remappedFunctions } =
    await tryRemapMissingCustomFunctions(props.removedFunctions, exprRefs, [
      ...newFunctions,
      ...availableFunctions,
    ]);

  await ctx.change(
    ({ success }) => {
      // Add new functions first, so they can be used for remapping
      for (const customFunction of newFunctions) {
        site.customFunctions.push(customFunction);
      }

      removeWhere(site.customFunctions, (customFunction) =>
        removedFunctions.has(customFunction)
      );

      exprRefs.forEach((usage) => {
        // Update server queries with remapped functions
        usage.ownerComponent.serverQueries.forEach((q) => {
          fixCustomFunctionExpr(remappedFunctions, q.op);
        });
        // Remove from server queries
        removeWhere(
          usage.ownerComponent.serverQueries,
          (serverQuery) =>
            !!serverQuery.op?.func && removedFunctions.has(serverQuery.op.func)
        );

        usage.exprRefs.forEach((ref) => {
          const expr = ref.expr;
          if (isKnownCustomFunctionExpr(expr)) {
            // Update remapped functions first
            fixCustomFunctionExpr(remappedFunctions, expr);

            // Update params
            const updatedRegistration = updatedFunctions.find(
              (fn) => fn === expr.func
            );
            if (!updatedRegistration) {
              return;
            }
            removeWhere(
              expr.args,
              (arg) =>
                !updatedRegistration.params.find(
                  (param) => param === arg.argType
                )
            );
          } else if (isKnownEventHandler(expr)) {
            expr.interactions.forEach((interaction) => {
              // Remove from event handlers
              removeWhere(
                interaction.args,
                (arg) =>
                  isKnownCustomFunctionExpr(arg.expr) &&
                  removedFunctions.has(arg.expr.func) &&
                  !remappedFunctions.has(arg.expr.func)
              );
            });
          } else if (isDynamicExpr(expr)) {
            // Remap custom code
            if (isKnownCustomCode(expr)) {
              renameDollarFunctions(expr, remappedFunctions);
            } else if (isKnownTemplatedString(expr)) {
              // Remap templated strings with code parts
              for (const part of expr.text) {
                if (isKnownCustomCode(part)) {
                  renameDollarFunctions(part, remappedFunctions);
                }
              }
            }
          }
        });
      });
      return success();
    },
    { noUndoRecord: true }
  );
  return [...removedFunctions];
}
