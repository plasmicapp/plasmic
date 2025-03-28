import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure } from "@/wab/shared/common";
import { ValNode, isValNode } from "@/wab/shared/core/val-nodes";
import {
  AncestorInfo,
  getInvalidAncestor,
  updatedAncestorInfo,
} from "@/wab/shared/linting/invalid-nesting/reactValidateDomNesting";
import { InvalidDomNestingLintIssue } from "@/wab/shared/linting/lint-types";
import { Component, TplNode } from "@/wab/shared/model/classes";
import $ from "jquery";

const TYPE = "invalid-dom-nesting";

interface DomInfo {
  element: Element;
  valNode?: ValNode;
}

type AncestorDomInfo = AncestorInfo<DomInfo>;

const emptyAncestorInfo: AncestorDomInfo = {};

export function getInvalidDomNesting(viewCtx: ViewCtx) {
  const component = viewCtx.component;
  const valNodesInPath: ValNode[] = [];
  const issues: InvalidDomNestingLintIssue[] = [];
  const rec = (element: Element, ancestorInfo: AncestorDomInfo) => {
    // We stop the recursion if we encounter a rich text element
    // As we are in the dom the structure in the canvas to rich text
    // could be `p div` which would be an invalid nesting, but the
    // generated code won't have this nesting, we assume that rich text
    // won't generate invalid nesting
    if (Array.from(element.classList).includes("__wab_rich_text")) {
      return;
    }
    const selectable = viewCtx.dom2val($(element));
    if (selectable && isValNode(selectable)) {
      valNodesInPath.push(selectable);
    }

    const tag = element.tagName.toLowerCase();
    const invalidAncestor = getInvalidAncestor(tag, ancestorInfo);
    const domInfo: DomInfo = {
      element,
      valNode:
        valNodesInPath.length > 0
          ? valNodesInPath[valNodesInPath.length - 1]
          : undefined,
    };
    if (invalidAncestor) {
      const ancestorValNode = ensure(
        invalidAncestor.valNode,
        "Ancestor valNode should exist"
      );
      const ancestorTpl = ancestorValNode.tpl;
      const ancestorComponent =
        ancestorValNode.valOwner?.tpl.component ?? component;

      const descendantValNode = ensure(
        domInfo.valNode,
        "Descendant valNode should exist"
      );
      const descendantTpl = descendantValNode.tpl;
      const descendantComponent =
        descendantValNode.valOwner?.tpl.component ?? component;

      issues.push({
        key: makeIssueKey(component, ancestorTpl, descendantTpl),
        type: TYPE,
        ancestorComponent,
        ancestorTpl,
        component: descendantComponent,
        descendantTpl,
      });
    }

    const newInfo = updatedAncestorInfo(ancestorInfo, domInfo, tag);

    Array.from(element.children).forEach((child) => {
      rec(child, newInfo);
    });

    if (selectable && isValNode(selectable)) {
      valNodesInPath.pop();
    }
  };

  const body = viewCtx.canvasCtx.$body().get(0);

  rec(body, emptyAncestorInfo);

  return issues;
}

function makeIssueKey(
  component: Component,
  ancestorTpl: TplNode,
  descendantTpl: TplNode
) {
  return `${TYPE}-${component.uuid}-${ancestorTpl.uuid}-${descendantTpl.uuid}`;
}
