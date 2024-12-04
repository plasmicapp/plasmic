// Each hook is identified by the selectors and triggered node name - it doesn't
// include the Private selector or the parent variants name. For example, the
// following style variants all resolve to the same hookName
//   base:Hover,Pressed
//   base:Private,Hover,Pressed at root
//   primary:Hover,Pressed
//   primary:Private,Hover,Pressed at root
// The hooke name would be
//    hoverPressed_root {
//      hover: boolean,
//      pressed: boolean
//    }

import {
  isPrivateStyleVariant,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import { NodeNamer } from "@/wab/shared/codegen/react-p/serialize-utils";
import { jsLiteral } from "@/wab/shared/codegen/util";
import { ensure } from "@/wab/shared/common";
import { tryExtractLit } from "@/wab/shared/core/exprs";
import {
  PseudoSelectorOption,
  TriggerCondition,
  getTriggerableSelectors,
} from "@/wab/shared/core/styles";
import { flattenTpls, isTplTag } from "@/wab/shared/core/tpls";
import { Component, TplNode, Variant } from "@/wab/shared/model/classes";
import L from "lodash";

// The usage of the hook, however, should check if all ancestors are active.
export class ReactHookSpec {
  readonly triggerNode: TplNode;
  readonly hookName: string;
  readonly triggerNodeName: string;
  constructor(
    public readonly sv: Variant,
    public readonly vsOwner: TplNode,
    public readonly component: Component,
    nodeNamer: NodeNamer
  ) {
    this.triggerNode = isPrivateStyleVariant(sv) ? vsOwner : component.tplTree;
    const name = nodeNamer(this.triggerNode);
    this.triggerNodeName = name ?? `n${this.triggerNode.uid}`;
    this.hookName = ReactHookSpec.getReactHookName(
      sv,
      nodeNamer,
      this.triggerNode
    );
  }

  isComponentHook = () => {
    return (
      this.triggerNode === this.component.tplTree &&
      !isPrivateStyleVariant(this.sv)
    );
  };

  /**
   * Returns a list of js statements installing React hooks for all the
   * interaction triggers for this spec.  For each trigger, defines both
   * the state variable and the variable of props of event handlers.
   */
  getTriggerHooks = () => {
    return getTriggerableSelectors(this.sv).map((opt) => {
      const varName = this.getTriggerOptVarName(opt);
      const propsName = this.getTriggerOptPropsName(opt);
      return `const [${varName}, ${propsName}] = ${this.serializeHookCall(
        ensure(opt.trigger, "Trigger condition is expected to be not null")
      )};`;
    });
  };

  getTriggerHooksVarNames = () => {
    return getTriggerableSelectors(this.sv).flatMap((opt) =>
      this.getTriggerOptVarName(opt)
    );
  };

  private serializeHookCall = (trigger: TriggerCondition) => {
    if (trigger.hookName === "useFocusVisible") {
      // For useFocusVisible, we need to check if this trigger node is a
      // text input.  Note this is not perfect, as we're not accounting
      // for the case where the user may have overridden the tag to
      // something else.
      return `useTrigger("useFocusVisible", {
        isTextInput: ${jsLiteral(isTextInputNode(this.triggerNode))}
      })`;
    } else if (trigger.hookName === "useFocusVisibleWithin") {
      // For useFocusVisibleWithin, we need to check if any of the descendant
      // is a text input
      return `useTrigger("useFocusVisibleWithin", {
        isTextInput: ${jsLiteral(isTextInputNodeWithin(this.triggerNode))}
      })`;
    } else {
      return `useTrigger(${jsLiteral(trigger.hookName)}, {})`;
    }
  };

  private getTriggerOptVarName = (opt: PseudoSelectorOption) => {
    return `is${L.upperFirst(this.triggerNodeName)}${opt.capitalName}`;
  };

  private getTriggerOptPropsName = (opt: PseudoSelectorOption) => {
    return `trigger${L.upperFirst(this.triggerNodeName)}${
      opt.capitalName
    }Props`;
  };

  /**
   * Returns a serialized boolean expression combining the names of the
   * state variables, as defined in getTriggerHooks()
   */
  getTriggerBooleanExpr = () => {
    return getTriggerableSelectors(this.sv)
      .map(
        (opt) =>
          `${opt.trigger?.isOpposite ? "!" : ""}${this.getTriggerOptVarName(
            opt
          )}`
      )
      .join(" && ");
  };

  /**
   * Returns the name of the props variable, as defined in getTriggerHooks()
   */
  getTriggerPropNames = () => {
    return getTriggerableSelectors(this.sv).map((opt) =>
      this.getTriggerOptPropsName(opt)
    );
  };

  getTriggerEvents = () => {
    return getTriggerableSelectors(this.sv).flatMap(
      (opt) => opt.trigger?.eventPropNames ?? []
    );
  };

  private static getReactHookName = (
    sv: Variant,
    nodeNamer: NodeNamer,
    triggerNode: TplNode
  ) => {
    // active not(hover) focused => activeNotHoverFocused
    const stateName = L.lowerFirst(
      getTriggerableSelectors(sv)
        .map((opt) => opt.capitalName)
        .join("")
    );
    const nodeName = nodeNamer(triggerNode);
    return [stateName, nodeName ? nodeName : `${triggerNode.uid}`].join("_");
  };

  getReactHookDefaultValue = () => {
    return getTriggerableSelectors(this.sv).every((opt) =>
      ensure(opt.trigger, "Trigger condition is expected to be not null")
        .isOpposite
        ? true
        : false
    );
  };

  serializeIsTriggeredCheck = (triggersRef: string) => {
    return `${triggersRef}.${this.hookName}`;
  };
}

function isTextInputNode(node: TplNode) {
  if (isTplTag(node)) {
    if (node.tag === "textarea") {
      return true;
    } else if (node.tag === "input") {
      const vs = tryGetBaseVariantSetting(node);
      if (!vs || !vs.attrs.type || tryExtractLit(vs.attrs.type) === "text") {
        return true;
      }
    }
  }
  return false;
}

function isTextInputNodeWithin(node: TplNode) {
  for (const descendant of flattenTpls(node)) {
    if (isTextInputNode(descendant)) {
      return true;
    }
  }
  return false;
}
