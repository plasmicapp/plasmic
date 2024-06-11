import { FunctionExpr, Interaction, TplComponent, TplTag } from "@/wab/classes";
import { mkEventHandlerEnv } from "@/wab/client/components/canvas/canvas-rendering";
import { extractDataCtx } from "@/wab/client/state-management/interactions-meta";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure } from "@/wab/common";
import { ExprCtx, getRawCode } from "@/wab/exprs";
import { toVarName } from "@/wab/shared/codegen/util";
import { evalCodeWithEnv } from "@/wab/shared/eval";
import { isValidJavaScriptCode, parseJsCode } from "@/wab/shared/parser-utils";
import {
  extractEventArgsNameFromEventHandler,
  findKeyForEventHandler,
  serializeActionArg,
} from "@/wab/states";
import { ancestor as traverse } from "acorn-walk";
import { notification } from "antd";
import { findLast, isString } from "lodash";

function wrapInteractionCode(interactionCode: string) {
  return `(async () => {
    ${interactionCode}
  })()`;
}

const getInteractionCode = (interaction: Interaction, exprCtx: ExprCtx) => {
  const eventCode = getRawCode(interaction.parent, exprCtx);
  const interactionCodeStart = eventCode.indexOf(
    `// step-begin: ${interaction.uuid}`
  );
  const interactionCodeEnd = eventCode.indexOf(
    `// step-end: ${interaction.uuid}`
  );
  return eventCode.substring(interactionCodeStart, interactionCodeEnd);
};

export function doesCodeDependsOnPreviousStepsOrEventArgs(
  code: string,
  interaction: Interaction,
  exprCtx: ExprCtx,
  studioCtx: StudioCtx,
  opts?: {
    skipSteps?: boolean;
    skipEventArgs?: boolean;
  }
) {
  const eventHandler = interaction.parent;
  const eventArgs = extractEventArgsNameFromEventHandler(eventHandler, exprCtx);

  const ast = parseJsCode(code);
  let usesEventArgs = false;
  const stepsUsages: string[] = [];
  traverse(ast, {
    Identifier: (node) => {
      if (eventArgs.includes(node.name)) {
        usesEventArgs = true;
      }
    },
    MemberExpression(path) {
      const { object, property } = path;
      if (
        object.type === "Identifier" &&
        object.name === "$steps" &&
        property.type === "Literal" &&
        isString(property.value)
      ) {
        stepsUsages.push(property.value);
      } else if (
        object.type === "Identifier" &&
        object.name === "$steps" &&
        property.type === "Identifier"
      ) {
        stepsUsages.push(property.name);
      }
    },
  });
  if (
    usesEventArgs &&
    !studioCtx.hasCachedInteractionArgs(eventHandler.uid) &&
    !opts?.skipEventArgs
  ) {
    return true;
  }
  const previousInteractions = eventHandler.interactions.slice(
    0,
    eventHandler.interactions.indexOf(interaction)
  );
  for (const stepName of stepsUsages) {
    if (stepName === toVarName(interaction.interactionName)) {
      continue;
    }
    const step = findLast(
      previousInteractions,
      (it) => toVarName(it.interactionName) === stepName
    );
    if (step && !studioCtx.hasCached$stepValue(step.uuid) && !opts?.skipSteps) {
      return true;
    }
  }
  return false;
}

export function canRunInteraction(
  interaction: Interaction,
  viewCtx: ViewCtx,
  opts?: {
    skipSteps?: boolean;
    skipEventArgs?: boolean;
  }
) {
  const exprCtx: ExprCtx = {
    projectFlags: viewCtx.projectFlags(),
    component: viewCtx.currentComponent(),
    inStudio: true,
  };
  const interactionCode = getInteractionCode(interaction, exprCtx);
  return !doesCodeDependsOnPreviousStepsOrEventArgs(
    interactionCode,
    interaction,
    exprCtx,
    viewCtx.studioCtx,
    opts
  );
}

export function runInteraction(
  interaction: Interaction,
  viewCtx: ViewCtx,
  tpl: TplComponent | TplTag
) {
  const exprCtx: ExprCtx = {
    projectFlags: viewCtx.projectFlags(),
    component: viewCtx.currentComponent(),
    inStudio: true,
  };
  const interactionCode = getInteractionCode(interaction, exprCtx);
  return runInteractionCode(interactionCode, interaction, viewCtx, tpl);
}

export function runInteractionCode(
  interactionCode: string,
  interaction: Interaction,
  viewCtx: ViewCtx,
  tpl: TplComponent | TplTag
) {
  ensure(
    isValidJavaScriptCode(interactionCode),
    "Invalid javascript code for interaction"
  );

  const exprCtx: ExprCtx = {
    projectFlags: viewCtx.projectFlags(),
    component: viewCtx.currentComponent(),
    inStudio: true,
  };
  const canvasEnv = viewCtx.getCanvasEnvForTpl(tpl, { keep$StateRef: true });
  const dataCtx = extractDataCtx(
    viewCtx,
    tpl,
    canvasEnv
      ? mkEventHandlerEnv(
          canvasEnv,
          viewCtx.studioCtx,
          viewCtx.canvasCtx.Sub.reactWeb,
          async (invalidateKeys: string[] | null | undefined) => {
            if (!invalidateKeys) {
              return undefined;
            }
            const invalidateKey = async (key: string) => {
              await viewCtx.studioCtx.refreshFetchedDataFromPlasmicQuery(key);
            };
            return await Promise.all(
              invalidateKeys.map((key) => invalidateKey(key))
            );
          },
          viewCtx.canvasCtx.win(),
          viewCtx.canvasCtx.Sub.dataSources
        )
      : undefined,
    interaction,
    findKeyForEventHandler(
      ensure(
        exprCtx.component,
        `missing component to run interaction ${interaction.actionName} - ${interaction.interactionName}`
      ),
      interaction.parent
    )
  );
  if (!("$steps" in dataCtx)) {
    // this will happen for the first step
    dataCtx["$steps"] = {};
  }

  try {
    return evalCodeWithEnv(
      wrapInteractionCode(interactionCode),
      dataCtx,
      viewCtx.canvasCtx.win()
    );
  } catch (err) {
    notification.error({
      message: `Error when running step ${interaction.interactionName}`,
      description: err.message,
    });
  }
}

export function runCodeInDataPicker(
  functionExpr: FunctionExpr,
  interaction: Interaction,
  viewCtx: ViewCtx,
  tpl: TplComponent | TplTag
) {
  const component = ensure(
    viewCtx.currentComponent(),
    "missing a component to run interaction"
  );
  const exprCtx: ExprCtx = {
    projectFlags: viewCtx.projectFlags(),
    component,
    inStudio: true,
  };

  const serializedCustomFunction = getRawCode(
    serializeActionArg(
      component,
      "customFunction",
      "customFunction",
      functionExpr
    ),
    exprCtx
  );

  const interactionCode = `
    let step = (${serializedCustomFunction})()
    if (
      typeof step === "object" &&
      typeof step.then === "function"
    ) {
      step = await step;
    }
    globalThis.__PLASMIC_CACHE_$STEP_VALUE("${interaction.uuid}", step);
    return step`;

  return runInteractionCode(interactionCode, interaction, viewCtx, tpl);
}
