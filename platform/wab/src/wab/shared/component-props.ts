import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { getLinkedCodeProps } from "@/wab/shared/cached-selectors";
import {
  StudioPropType,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import {
  isCodeComponent,
  isContextCodeComponent,
  isHostLessCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import { Component, Param, TplComponent } from "@/wab/shared/model/classes";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";

export function getComponentPropTypes(
  viewCtx: ViewCtx,
  component: Component
): Record<string, StudioPropType<any>> {
  if (isCodeComponent(component)) {
    return viewCtx.getCodeComponentMeta(component)?.props ?? {};
  } else if (isPlumeComponent(component)) {
    return (
      getPlumeEditorPlugin(component)?.codeComponentMeta?.(component)?.props ??
      {}
    );
  } else {
    return {};
  }
}

function getContextComponentPropTypes(
  studioCtx: StudioCtx,
  component: Component
): Record<string, StudioPropType<any>> {
  if (isCodeComponent(component)) {
    return (
      (isHostLessCodeComponent(component)
        ? studioCtx.getHostLessContextsMap()
        : studioCtx.getRegisteredContextsMap()
      ).get(component.name)?.meta.props ?? {}
    );
  } else {
    return {};
  }
}

export const inferPropTypeFromParam = (
  studioCtx: StudioCtx,
  viewCtx: ViewCtx | undefined,
  tpl: TplComponent,
  param: Param
): StudioPropType<any> => {
  let propType = wabTypeToPropType(param.type);
  // code components can have more advanced prop types.
  if (viewCtx) {
    if (isCodeComponent(tpl.component) || isPlumeComponent(tpl.component)) {
      const propTypes = getComponentPropTypes(viewCtx, tpl.component);
      return param.variable.name in propTypes
        ? propTypes[param.variable.name]
        : propType;
    } else {
      const maybeLinkedProp = getLinkedCodeProps(tpl.component).get(
        param.variable.name
      );
      if (maybeLinkedProp) {
        const [innerTpl, linkedProp] = maybeLinkedProp;
        const propTypes = getComponentPropTypes(viewCtx, innerTpl.component);
        return linkedProp.variable.name in propTypes
          ? propTypes[linkedProp.variable.name]
          : propType;
      }
    }
  } else if (isContextCodeComponent(tpl.component)) {
    propType = getContextComponentPropTypes(studioCtx, tpl.component)[
      param.variable.name
    ];
  }
  return propType;
};
