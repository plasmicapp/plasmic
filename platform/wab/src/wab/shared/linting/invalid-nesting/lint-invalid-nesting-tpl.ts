import {
  Component,
  isKnownRenderExpr,
  isKnownTplSlot,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
} from "@/wab/classes";

import { switchType } from "@/wab/common";
import { isCodeComponent } from "@/wab/components";
import {
  AncestorInfo,
  ANCESTOR_INFO_KEYS,
  findInvalidAncestorForTag,
  getInvalidAncestor,
  updatedAncestorInfo,
} from "@/wab/shared/linting/invalid-nesting/reactValidateDomNesting";
import { InvalidTplNestingLintIssue } from "@/wab/shared/linting/lint-types";
import { lintIssuesEquals } from "@/wab/shared/linting/lint-utils";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { getSlotArgs } from "@/wab/shared/SlotUtils";
import { isTplTag, walkTpls } from "@/wab/tpls";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { comparer } from "mobx";

const TYPE = "invalid-tpl-nesting";

interface TplInfo {
  tpl: TplTag;
  component: Component;
  tplComponent?: TplComponent;
}

type AncestorTplInfo = AncestorInfo<TplInfo>;

const emptyAncestorInfo: AncestorTplInfo = {};

export const lintSite = maybeComputedFn(
  function lintSite(site: Site) {
    const issues: InvalidTplNestingLintIssue[] = [];
    for (const comp of site.components) {
      issues.push(...lintComponent(comp));
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintTagNesting",
  }
);

interface ComponentAncestorInfo {
  infoByTag: Map<string, TplInfo>;
  infoBySlot: Map<string, AncestorTplInfo>;
}

const getAncestorInfoOfComponent = maybeComputedFn(
  function getAncestorInfoOfComponent(
    component: Component
  ): ComponentAncestorInfo {
    const infoByTag: Map<string, TplInfo> = new Map();
    const infoBySlot: Map<string, AncestorTplInfo> = new Map();
    if (isCodeComponent(component)) {
      return {
        infoByTag,
        infoBySlot,
      };
    }
    const ancestorInfoStack: AncestorTplInfo[] = [emptyAncestorInfo];
    walkTpls(component.tplTree, {
      pre: (tpl) => {
        if (isKnownTplSlot(tpl)) {
          infoBySlot.set(
            tpl.param.variable.name,
            ancestorInfoStack[ancestorInfoStack.length - 1]
          );
          return false;
        }
        if (isTplTag(tpl)) {
          ancestorInfoStack.push(
            updatedAncestorInfo(
              ancestorInfoStack[ancestorInfoStack.length - 1],
              {
                tpl,
                component,
              },
              tpl.tag
            )
          );
          infoByTag.set(tpl.tag, {
            tpl,
            component,
          });
        }
        return;
      },
      post: (tpl) => {
        if (isTplTag(tpl)) {
          ancestorInfoStack.pop();
        }
      },
    });
    return {
      infoByTag,
      infoBySlot,
    };
  },
  {
    keepAlive: false,
    equals: comparer.structural,
    name: "getAncestorInfoOfComponent",
  }
);

/**
 * validate the nesting of the template tree of a given component
 * should only list issues that happen because of the structure of component.tplTree
 * so component.tplTree is what implies in the relation of ancestor/descendant
 */
const lintComponent = maybeComputedFn(
  function lintComponent(component: Component) {
    const issues: InvalidTplNestingLintIssue[] = [];

    const rec = (tpl: TplNode, ancestorInfo: AncestorTplInfo) => {
      if (isTplTag(tpl)) {
        const invalidAncestor = getInvalidAncestor(tpl.tag, ancestorInfo);
        if (invalidAncestor) {
          issues.push({
            key: makeIssueKey(
              component,
              invalidAncestor.tplComponent ?? invalidAncestor.tpl,
              invalidAncestor.tpl,
              tpl,
              tpl
            ),
            type: TYPE,
            ancestorComponent: component,
            // Always try to point to the tplComponent if it exists
            ancestorTpl: invalidAncestor.tplComponent ?? invalidAncestor.tpl,
            component,
            descendantTpl: tpl,
          });
        }
      }
      switchType(tpl)
        .when(TplTag, (node) => {
          node.children.forEach((child) => {
            rec(
              child,
              updatedAncestorInfo(
                ancestorInfo,
                { tpl: node, component },
                node.tag
              )
            );
          });
        })
        .when(TplComponent, (node) => {
          const { infoByTag, infoBySlot } = getAncestorInfoOfComponent(
            node.component
          );
          Array.from(infoByTag.entries()).forEach(([tag, info]) => {
            const invalidAncestor = findInvalidAncestorForTag(
              tag,
              ancestorInfo
            );
            if (invalidAncestor) {
              // We reached a case where there is a tag inside the component which
              // triggers an invalid nesting.
              issues.push({
                key: makeIssueKey(
                  component,
                  invalidAncestor.tplComponent ?? invalidAncestor.tpl,
                  invalidAncestor.tpl,
                  node,
                  info.tpl
                ),
                type: TYPE,
                ancestorComponent: component,
                ancestorTpl:
                  invalidAncestor.tplComponent ?? invalidAncestor.tpl,
                component,
                descendantTpl: node,
              });
            }
          });
          getSlotArgs(node).forEach((arg) => {
            if (isKnownRenderExpr(arg.expr)) {
              // It may not exist in the case of code components
              const slotInfo =
                infoBySlot.get(arg.param.variable.name) ?? emptyAncestorInfo;
              ANCESTOR_INFO_KEYS.forEach((key) => {
                if (slotInfo[key]) {
                  // Update the instance of tplComponent that we should point to
                  slotInfo[key].tplComponent = node;
                }
              });
              const newAncestorInfo = {
                ...ancestorInfo,
                ...slotInfo,
              };
              arg.expr.tpl.forEach((child) => {
                rec(child, newAncestorInfo);
              });
            }
          });
        })
        .when(TplSlot, (node) => {
          node.defaultContents.forEach((child) => {
            rec(child, ancestorInfo);
          });
        })
        .result();
    };

    rec(component.tplTree, emptyAncestorInfo);
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintTagNestingComponent",
  }
);

function makeIssueKey(
  component: Component,
  ancestorComponent: TplNode,
  ancestorTpl: TplNode,
  descendantComponent: TplNode,
  descendantTpl: TplNode
) {
  return `${TYPE}-${component.uuid}-${ancestorComponent.uuid}-${ancestorTpl.uuid}-${descendantComponent.uuid}-${descendantTpl.uuid}`;
}
