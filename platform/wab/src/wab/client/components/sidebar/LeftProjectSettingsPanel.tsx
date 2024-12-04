import ListItem from "@/wab/client/components/ListItem";
import { promptDeleteDep } from "@/wab/client/components/modals/UpgradeDepModal";
import { PropValueEditorContext } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import {
  getValueSetState,
  LabeledItemRow,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { Matcher } from "@/wab/client/components/view-common";
import { SimpleReorderableList } from "@/wab/client/components/widgets/SimpleReorderableList";
import PlasmicLeftSettingsPanel from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicLeftSettingsPanel";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import {
  getPropTypeType,
  isPlainObjectPropType,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import { makeGlobalContextPropName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { paramToVarName } from "@/wab/shared/codegen/util";
import {
  ensure,
  isOneOf,
  maybe,
  moveIndex,
  spawn,
  swallow,
} from "@/wab/shared/common";
import {
  findVariantGroupForParam,
  getComponentDisplayName,
  getParamDisplayName,
  getRealParams,
  isContextCodeComponent,
  isHostLessCodeComponent,
} from "@/wab/shared/core/components";
import { asCode, codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { ComponentPropOrigin } from "@/wab/shared/core/lang";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { tryGetTplOwnerComponent } from "@/wab/shared/core/tpls";
import { DefinedIndicatorType } from "@/wab/shared/defined-indicator";
import {
  Component,
  isKnownExpr,
  ProjectDependency,
  TplComponent,
} from "@/wab/shared/model/classes";
import { isRenderFuncParam, isSlot } from "@/wab/shared/SlotUtils";
import { Menu, notification, Tooltip } from "antd";
import L from "lodash";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";

type ComponentDependency = {
  component: Component;
  projectDependency: ProjectDependency | undefined;
};

const LeftProjectSettingsPanel = observer(function LeftProjectSettingsPanel_() {
  const studioCtx = useStudioCtx();
  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);

  const globalContextDependencies = walkDependencyTree(studioCtx.site, "all")
    .filter(
      (dep) =>
        dep.site.components.filter((c) => isContextCodeComponent(c)).length > 0
    )
    .map((dep) => {
      return {
        dep,
        globalContexts: dep.site.components.filter((c) =>
          isContextCodeComponent(c)
        ),
      };
    });

  const contexts = L.uniqWith(
    [
      ...studioCtx.site.components.filter((c) => isContextCodeComponent(c)),
      ...globalContextDependencies.flatMap((dep) => dep.globalContexts),
    ],
    (a, b) => a.name === b.name
  );

  const tplComponents = studioCtx.site.globalContexts;

  const orderedContexts: ComponentDependency[] = [];
  for (const tpl of tplComponents) {
    orderedContexts.push({
      component: ensure(
        contexts.find((c) => c === tpl.component),
        "Couldn't find context for component " + tpl.component.name
      ),
      projectDependency: globalContextDependencies.find((dep) =>
        dep.globalContexts.find((c) => c === tpl.component)
      )?.dep,
    });
  }

  return (
    <PlasmicLeftSettingsPanel
      root={{
        props: {
          "data-test-id": "settings-tab",
        } as any,
      }}
      leftSearchPanel={{
        searchboxProps: {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          autoFocus: true,
        },
      }}
      content={
        <ContextsList
          studioCtx={studioCtx}
          contexts={orderedContexts}
          tplComponents={tplComponents}
          matcher={matcher}
        />
      }
    />
  );
});

const ContextsList = observer(function ContextsList_(props: {
  studioCtx: StudioCtx;
  contexts: ComponentDependency[];
  tplComponents: TplComponent[];
  matcher: Matcher;
}) {
  const { studioCtx, matcher, contexts, tplComponents } = props;

  const readOnly = studioCtx.getLeftTabPermission("settings") === "readable";
  const filteredContexts = contexts.filter((c) =>
    matcher.matches(getComponentDisplayName(c.component))
  );

  const filteredTplComponents = props.tplComponents.filter((tpl) =>
    matcher.matches(getComponentDisplayName(tpl.component))
  );

  return (
    <SimpleReorderableList
      onReordered={(fromIndex, toIndex) =>
        studioCtx.changeUnsafe(() => {
          const moveIndexFromArray = (
            firstIndex: number,
            secondIndex: number,
            realArray: any[],
            array: any[]
          ) => {
            const fromRealIndex = realArray.indexOf(array[firstIndex]);

            const toRealIndex = realArray.indexOf(array[secondIndex]);

            moveIndex(realArray, fromRealIndex, toRealIndex);
          };
          moveIndexFromArray(fromIndex, toIndex, contexts, filteredContexts);
          moveIndexFromArray(
            fromIndex,
            toIndex,
            tplComponents,
            filteredTplComponents
          );
        })
      }
      customDragHandle
    >
      {filteredContexts.map((c, idx) => (
        <ContextRow
          key={filteredTplComponents[idx].uuid}
          studioCtx={studioCtx}
          context={c}
          tplComponent={filteredTplComponents[idx]}
          matcher={matcher}
          readOnly={readOnly}
        />
      ))}
    </SimpleReorderableList>
  );
});

const ContextRow = observer(function ContextRow_(props: {
  studioCtx: StudioCtx;
  context: ComponentDependency;
  tplComponent: TplComponent;
  matcher: Matcher;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  readOnly?: boolean;
}) {
  const {
    studioCtx,
    context,
    tplComponent,
    matcher,
    isDragging,
    dragHandleProps,
    readOnly,
  } = props;
  const [isVisible, setIsVisible] = React.useState(false);
  const hasParams =
    getRealParams(tplComponent.component).filter(
      (param) => param.origin !== ComponentPropOrigin.ReactHTMLAttributes
    ).length > 0;
  const componentName = getComponentDisplayName(context.component);

  React.useEffect(() => {
    const dispose = autorun(() => {
      const forceOpenProp = studioCtx.forceOpenProp;
      if (forceOpenProp) {
        const [c] = forceOpenProp;
        if (c === tplComponent.component) {
          setIsVisible(true);
        }
      }
    });
    return dispose;
  }, [studioCtx]);

  const menu =
    context.projectDependency && !readOnly ? (
      <Menu>
        <Menu.Item
          key="delete"
          onClick={async () => {
            const hostLessDependents =
              studioCtx.projectDependencyManager.getHostLessPackageDependents(
                ensure(
                  context.projectDependency,
                  "Should only show this menu if there is a dependency for the context"
                ).pkgId
              );

            if (hostLessDependents.length > 0) {
              notification.error({
                message: `Cannot remove package, the package is a dependency of the following packages: ${hostLessDependents.join(
                  ","
                )}`,
              });
              return;
            }

            const answer = await promptDeleteDep({
              studioCtx: studioCtx,
              curDep: ensure(
                context.projectDependency,
                "Should only show this menu if there is a dependency for the context"
              ),
            });

            if (answer) {
              await studioCtx.projectDependencyManager.removeByPkgId(
                ensure(
                  context.projectDependency,
                  "Should only show this menu if there is a dependency for the context"
                ).pkgId
              );
            }
          }}
        >
          Delete package
        </Menu.Item>
      </Menu>
    ) : undefined;

  return (
    <>
      <SidebarModal
        title={componentName + " props"}
        show={isVisible}
        onClose={() => setIsVisible(false)}
      >
        <ContextPropEditor
          studioCtx={studioCtx}
          tpl={tplComponent}
          readOnly={readOnly}
        />
      </SidebarModal>
      <ListItem
        key={tplComponent.uuid}
        isDragging={isDragging}
        isDraggable={!readOnly}
        dragHandleProps={dragHandleProps}
        menu={menu}
        hideIcon
        onClickMain={() => {
          if (hasParams) {
            setIsVisible(true);
          }
        }}
      >
        {matcher.boldSnippets(componentName)}
      </ListItem>
    </>
  );
});

const ContextPropEditor = observer(function ContextPropEditor_(props: {
  studioCtx: StudioCtx;
  tpl: TplComponent;
  readOnly?: boolean;
}) {
  const { studioCtx, tpl, readOnly } = props;

  const component = tryGetTplOwnerComponent(tpl) ?? null;

  const componentProps = Object.fromEntries(
    tpl.vsettings[0].args
      .filter(
        (arg) =>
          !isSlot(arg.param) &&
          !findVariantGroupForParam(tpl.component, arg.param)
      )
      .map((arg) => [
        paramToVarName(tpl.component, arg.param),
        tryExtractJson(
          asCode(arg.expr, {
            projectFlags: studioCtx.projectFlags(),
            component,
            inStudio: true,
          })
        ),
      ])
  );

  const params = getRealParams(tpl.component).filter((param) => {
    const propType = (
      isHostLessCodeComponent(tpl.component)
        ? studioCtx.getHostLessContextsMap()
        : studioCtx.getRegisteredContextsMap()
    ).get(tpl.component.name)?.meta.props[param.variable.name];
    const propTypeType = getPropTypeType(propType);
    if (
      propTypeType &&
      isOneOf(propTypeType, [
        "styleScopeClass",
        "themeResetClass",
        "themeStyles",
      ])
    ) {
      return false;
    }
    if (isPlainObjectPropType(propType) && propType.type !== "slot") {
      const objPropType = propType;
      return !swallow(() =>
        objPropType.hidden?.(componentProps, null, { path: [] })
      );
    }
    return param.origin !== ComponentPropOrigin.ReactHTMLAttributes;
  });
  const contextDescription =
    tpl.component.codeComponentMeta?.description ?? undefined;

  return (
    <SidebarSection key={tpl.component.uuid} noBorder>
      {(renderMaybeCollapsibleRows) => (
        <div className="pt-m">
          {contextDescription && (
            <div className="flex flex-col dimfg regular mb-xlg">
              <StandardMarkdown>{contextDescription}</StandardMarkdown>
              <div className="Separator" />
            </div>
          )}
          {renderMaybeCollapsibleRows([
            ...params.map((p) => {
              const propType =
                (isHostLessCodeComponent(tpl.component)
                  ? studioCtx.getHostLessContextsMap()
                  : studioCtx.getRegisteredContextsMap()
                ).get(tpl.component.name)?.meta.props[p.variable.name] ??
                wabTypeToPropType(p.type);
              const label = getParamDisplayName(tpl.component, p);
              const labelNode = p.about ? (
                <Tooltip title={p.about}>
                  <span>{label}</span>
                </Tooltip>
              ) : (
                label
              );

              const tplMgr = studioCtx.tplMgr();
              const arg = tpl.vsettings[0].args.find(
                (_arg) => _arg.param === p
              );
              const curExpr =
                maybe(arg, (x) => x.expr) || p.defaultExpr || undefined;
              const definedIndicator: DefinedIndicatorType =
                curExpr === p.defaultExpr || (!curExpr && !p.defaultExpr)
                  ? { source: "none" }
                  : {
                      source: "setNonVariable",
                      prop: p.variable.name,
                      value: "",
                    };

              const exprLit = curExpr
                ? tryExtractJson(curExpr) ?? curExpr
                : undefined;
              return {
                collapsible:
                  isPlainObjectPropType(propType) &&
                  propType.type !== "slot" &&
                  !!propType.advanced,
                content: (
                  <PropValueEditorContext.Provider
                    value={{
                      tpl,
                      componentPropValues: componentProps,
                      ccContextData: {},
                      env: {},
                    }}
                  >
                    <LabeledItemRow
                      key={p.uuid}
                      label={labelNode}
                      definedIndicator={definedIndicator}
                      menu={
                        definedIndicator.source.includes("set") ? (
                          <Menu>
                            <Menu.Item
                              onClick={async () =>
                                studioCtx.change(
                                  ({ success }) =>
                                    tplMgr.delArg(
                                      tpl,
                                      tpl.vsettings[0],
                                      p.variable
                                    ) && success()
                                )
                              }
                            >
                              Unset {label}
                            </Menu.Item>
                          </Menu>
                        ) : undefined
                      }
                    >
                      <PropValueEditor
                        attr={p.variable.name}
                        propType={propType}
                        disabled={readOnly}
                        value={exprLit}
                        valueSetState={getValueSetState(definedIndicator)}
                        label={label}
                        onChange={(expr) => {
                          if (expr == null && exprLit == null) {
                            return;
                          }
                          const newExpr = isKnownExpr(expr)
                            ? expr
                            : codeLit(expr);
                          spawn(
                            studioCtx.change(({ success }) => {
                              tplMgr.setArg(
                                tpl,
                                tpl.vsettings[0],
                                p.variable,
                                newExpr
                              );
                              return success();
                            })
                          );
                          studioCtx.closeGlobalContextNotificationForStarters();
                        }}
                      />
                    </LabeledItemRow>
                  </PropValueEditorContext.Provider>
                ),
              };
            }),
            {
              collapsible: true,
              content: (
                <div className="mt-lg">
                  <div className="Separator mv-sm" />
                  <div className="flex flex-col dimfg regular">
                    <h4 className="code">
                      {makeGlobalContextPropName(tpl.component)}
                    </h4>
                    <p>
                      This is the name you would use in{" "}
                      <code>PlasmicRootProvider</code> to override the global
                      context props from your code. This is useful for
                      overriding the context for (say) different
                      staging/production environment deployments.
                    </p>
                    <pre>
                      <code>
                        {`
<PlasmicRootProvider
  globalContextsProps={{
    ${makeGlobalContextPropName(tpl.component)}: {
      // prop overrides here
${tpl.component.params
  .filter((p) => !isRenderFuncParam(p))
  .map((p) => `      ${paramToVarName(tpl.component, p)}: ...,`)
  .join("\n")}
    }
  }}
>
                      `.trim()}
                      </code>
                    </pre>
                    <a
                      target={"__blank"}
                      href={
                        "https://docs.plasmic.app/learn/global-contexts/#prop-override"
                      }
                    >
                      Read the full docs
                    </a>
                  </div>
                </div>
              ),
            },
          ])}
        </div>
      )}
    </SidebarSection>
  );
});

export default LeftProjectSettingsPanel;
