import type { SubDeps } from "@/wab/client/components/canvas/subdeps";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { getTplSlotForParam, isSlot } from "@/wab/shared/SlotUtils";
import { getPropTypeType } from "@/wab/shared/code-components/code-components";
import { serializeTplSlotArgsAsArray } from "@/wab/shared/codegen/react-p";
import {
  asOneNode,
  getExportedComponentName,
  makeComponentRenderIdFileName,
  makeComponentSkeletonIdFileName,
  makePlasmicComponentName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { generateSubstituteComponentCalls } from "@/wab/shared/codegen/react-p/utils";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import { assert, unexpected } from "@/wab/shared/common";
import { flattenTpls, isTplComponent } from "@/wab/shared/core/tpls";
import { Component } from "@/wab/shared/model/classes";
import { ChangeSummary } from "@/wab/shared/model/model-change-util";
import {
  PlumeCodeComponentMeta,
  PlumeType,
  getPlumeEditorPlugin,
} from "@/wab/shared/plume/plume-registry";
import React from "react";

/**
 * A stub for default slot contents.
 *
 * Some plume hooks check if anything is passed to the slot children in order to
 * determine variants to activate. When nothing in passed, we use the default
 * slot contents (e.g., `maybeIncludeSerializedDefaultSlotContent` in codegen of
 *  checkbox), so we create the stub here to be used by the hook.
 *
 * We could render the actual default slot contents instead, but since they
 * would be rendered anyways (if needed) it seemed better to just add and then
 * remove a stub:
 * - it's a less complex logic
 * - it's better for performance as we don't need to re-compute the
 *   `RenderingCtx`. And, since computing it would require React hooks, we would
 *   need to call it on every render by React rules (even if we did provide slot
 *   args!)
 * - it works with data binding
 *
 * (The only component where we can't use it is Select, because we actually
 * process the children to wrap in canvas React contexts)
 */
export function createDefaultSlotContentsStub(sub: SubDeps) {
  return sub.React.createElement(() => {
    assert(false, () => `All slot stubs should've been removed`);
  }, {});
}

export function convertToDefaultProp(
  attrs: Record<string, string>,
  prop: string,
  defaultProp: string
) {
  if (prop in attrs && !(defaultProp in attrs) && attrs[prop]) {
    attrs[defaultProp] = attrs[prop];
  }
  delete attrs[prop];
}

export function fixupForPlume(summary: ChangeSummary, viewCtx?: ViewCtx) {
  for (const tree of summary.newTrees) {
    for (const tpl of flattenTpls(tree)) {
      if (isTplComponent(tpl)) {
        const plugin = getPlumeEditorPlugin(tpl.component);
        plugin?.onAttached?.(tpl, viewCtx);
      }
    }
  }
  for (const tpl of summary.updatedNodes) {
    if (isTplComponent(tpl)) {
      const plugin = getPlumeEditorPlugin(tpl.component);
      plugin?.onUpdated?.(tpl);
    }
  }
}

export function serializeComponentSubstitutionCallsForDefaultContents(
  ctx: SerializerBaseContext,
  paramNames: string[]
) {
  if (!ctx.exportOpts.useComponentSubstitutionApi) {
    return "";
  }

  const { component } = ctx;
  const referencedComponents = new Set<Component>();
  for (const paramName of paramNames) {
    const param = component.params.find((p) => p.variable.name === paramName);
    const slot = param ? getTplSlotForParam(component, param) : undefined;
    if (!slot || slot.defaultContents.length === 0) {
      continue;
    }
    for (const tpl of slot.defaultContents.flatMap((t) => flattenTpls(t))) {
      if (isTplComponent(tpl)) {
        referencedComponents.add(tpl.component);
      }
    }
  }

  if (referencedComponents.size === 0) {
    return "";
  }

  const calls = generateSubstituteComponentCalls(
    [...referencedComponents],
    ctx.exportOpts,
    ctx.aliases
  );

  return calls.join("\n");
}

export function getSerializedDefaultSlotContent(
  ctx: SerializerBaseContext,
  paramName: string
) {
  const { component } = ctx;
  const param = component.params.find((p) => p.variable.name === paramName);
  const slot = param ? getTplSlotForParam(component, param) : undefined;
  if (!slot || slot.defaultContents.length === 0) {
    return undefined;
  }

  return asOneNode(
    serializeTplSlotArgsAsArray(ctx, slot.param, slot.defaultContents)
  );
}

export function maybeIncludeSerializedDefaultSlotContent(
  ctx: SerializerBaseContext,
  paramName: string
) {
  const serializedDefaultContent = getSerializedDefaultSlotContent(
    ctx,
    paramName
  );
  if (!serializedDefaultContent) {
    return "";
  }

  const propName = toVarName(paramName);
  return `
    if (!(${jsLiteral(propName)} in props)) {
      props = {
        ...props,
        ${propName}: ${serializedDefaultContent}
      };
    }
  `;
}

export function makeComponentImportPath(
  component: Component,
  ctx: SerializerBaseContext,
  type: "render" | "skeleton"
) {
  if (type === "render") {
    return ctx.exportOpts.idFileNames
      ? makeComponentRenderIdFileName(component)
      : makePlasmicComponentName(component);
  } else if (type === "skeleton") {
    return ctx.exportOpts.idFileNames
      ? makeComponentSkeletonIdFileName(component)
      : getExportedComponentName(component);
  } else {
    throw unexpected();
  }
}

export function traverseReactEltTree(
  children: React.ReactNode,
  callback: (elt: React.ReactElement) => void
) {
  const rec = (elts: React.ReactNode) => {
    if (Array.isArray(elts)) {
      elts.forEach((x) => rec(x));
    } else if (React.isValidElement(elts)) {
      callback(elts);
      rec(elts.props.children);
    }
  };
  rec(children as any);
}

export function isPlumeTypeElement(
  elt: React.ReactElement,
  type: PlumeType
): elt is React.ReactElement {
  return !!elt && !!elt.type && (elt.type as any).__plumeType === type;
}

export function ensureValidPlumeCodeMeta(
  comp: Component,
  meta: PlumeCodeComponentMeta
): PlumeCodeComponentMeta {
  // Certain props in meta.props are safe to add to the Plume component,
  // but we should not add a slot prop if it doesn't already exist,
  // because it needs a corresponding TplSlot, and there's no way for
  // us to know where to put that
  const props = Object.fromEntries(
    Object.entries(meta.props).filter(([prop, propType]) => {
      if (getPropTypeType(propType) === "slot") {
        if (
          !comp.params.find(
            (p) => toVarName(p.variable.name) === prop && isSlot(p)
          )
        ) {
          return false;
        }
      }
      return true;
    })
  );

  const states = !meta.states
    ? undefined
    : Object.fromEntries(
        Object.entries(meta.states).filter(([stateName, stateSpec]) => {
          // For state, a prop exists if it is going to be added (in `props` above),
          // or it is an existing param.  We use `toVarName()` to match because that's
          // how we match state spec to params in code-components.ts
          const propExists = (prop: string) => {
            return (
              prop in props ||
              !!comp.params.find((p) => toVarName(p.variable.name) === prop)
            );
          };

          // A state is only valid if its valueProp and onChangeProp both exists
          if (
            stateSpec.type === "writable" &&
            stateSpec.valueProp &&
            !propExists(stateSpec.valueProp)
          ) {
            return false;
          }
          if (stateSpec.onChangeProp && !propExists(stateSpec.onChangeProp)) {
            return false;
          }

          return true;
        })
      );

  return {
    ...meta,
    props,
    states,
  } as PlumeCodeComponentMeta;
}
