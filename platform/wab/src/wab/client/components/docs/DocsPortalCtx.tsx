import { parseRoute } from "@/wab/client/cli-routes";
import {
  resolveCollisionsForComponentProp,
  serializeToggledComponent,
  updateComponentCode,
} from "@/wab/client/components/docs/serialize-docs-preview";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { withProvider } from "@/wab/commons/components/ContextUtil";
import { toClassName, toVarName } from "@/wab/shared/codegen/util";
import { ensure, spawn } from "@/wab/shared/common";
import {
  isCodeComponent,
  isFrameComponent,
  isSubComponent,
} from "@/wab/shared/core/components";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { TplNamable } from "@/wab/shared/core/tpls";
import { Component, ImageAsset, Param } from "@/wab/shared/model/classes";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { History } from "history";
import { action, makeObservable, observable } from "mobx";
import React from "react";

export type DocsTabKey = "intro" | "components" | "images";

export type IconToggleProp = "title" | "color" | "width" | "height";

export class DocsPortalCtx {
  private focusedComponent = observable.box<Component | undefined>(undefined);
  private componentToCode = observable.map<Component, string>();
  private componentToToggles = observable.map<Component, Map<Param, any>>();
  private focusedElement = observable.box<TplNamable | undefined>(undefined);

  private focusedIcon = observable.box<ImageAsset | undefined>(undefined);
  private iconToCode = observable.map<ImageAsset, string>();
  private iconToToggles = observable.map<
    ImageAsset,
    Map<IconToggleProp, string>
  >();

  private _xDocsTabKey = observable.box<DocsTabKey | undefined>();

  private codegenType = observable.box<"loader" | "codegen">("loader");

  constructor(public studioCtx: StudioCtx) {
    makeObservable(this, {
      setFocusedComponent: action,
      setFocusedElement: action,
      setComponentToggle: action,
      setComponentCustomCode: action,
      setCodegenType: action,
      setFocusedIcon: action,
      setIconToggle: action,
      setIconCustomCode: action,
      setComponentOverride: action,
      updateComponentCustomCode: action,
      updateStateFromRoute: action,
      resetFocus: action,
      resetComponentToggles: action,
      resetIconToggles: action,
    });
  }

  tryGetFocusedComponent() {
    return this.focusedComponent.get();
  }

  getFocusedComponent() {
    return ensure(this.focusedComponent.get(), "missing focusedComponent");
  }

  getCodegenType() {
    return this.codegenType.get();
  }

  setCodegenType(type: "loader" | "codegen") {
    this.codegenType.set(type);
    spawn(this.studioCtx.appCtx.api.addStorageItem("codegenType", type));
    this.resetComponentCustomCode();
  }

  useLoader() {
    return this.getCodegenType() === "loader";
  }

  setFocusedComponent(component: Component) {
    this.focusedComponent.set(component);
    this.focusedElement.set(undefined);
    this.focusedIcon.set(undefined);
    if (!this.getComponentCustomCode(component)) {
      this.setComponentCustomCode(
        component,
        "// Try directly editing this code to pass in different props and overrides\n" +
          serializeToggledComponent(
            component,
            this.getComponentToggles(component),
            this.useLoader()
          )
      );
    }
  }

  getFocusedNode() {
    return this.focusedElement.get();
  }

  setFocusedElement(node: TplNamable | undefined) {
    this.focusedElement.set(node);
  }

  getComponentCustomCode(component: Component) {
    return this.componentToCode.get(component);
  }

  setComponentCustomCode(component: Component, code: string | null) {
    if (code == null) {
      this.componentToCode.delete(component);
    } else {
      this.componentToCode.set(component, code);
    }
  }

  resetComponentCustomCode() {
    this.componentToCode.forEach((_, key) => this.componentToCode.delete(key));
  }

  setComponentToggle(component: Component, param: Param, value: any) {
    if (value == null) {
      this.getComponentToggles(component).delete(param);
    } else {
      this.getComponentToggles(component).set(param, value);
    }
    const isVariant = !!component.variantGroups.find((g) => g.param === param);
    this.updateComponentCustomCode(
      component,
      resolveCollisionsForComponentProp(
        component,
        toVarName(param.variable.name),
        isVariant ? "variant" : "arg"
      ),
      value,
      false,
      param
    );
  }

  setComponentOverride(
    component: Component,
    key: string,
    innerPath: string[],
    value: string,
    isRootProp: boolean
  ) {
    this.updateComponentCustomCode(
      component,
      [
        ...resolveCollisionsForComponentProp(
          component,
          key,
          isRootProp ? "rootProp" : "override"
        ),
        ...innerPath,
      ],
      value,
      true
    );
  }

  updateComponentCustomCode(
    component: Component,
    path: string[],
    value: any,
    isValueSerialized: boolean,
    param?: Param
  ) {
    const code = updateComponentCode(
      this,
      path,
      value,
      isValueSerialized,
      param
    );
    this.setComponentCustomCode(component, code);
  }

  getComponentToggles(component: Component) {
    if (!this.componentToToggles.has(component)) {
      this.componentToToggles.set(component, observable.map());
    }
    return ensure(
      this.componentToToggles.get(component),
      `missing ${component} in componentToToggles`
    );
  }

  getComponentToggle(component: Component, param: Param) {
    return this.getComponentToggles(component).get(param);
  }

  resetComponentToggles(component: Component) {
    this.componentToToggles.delete(component);
    this.componentToCode.delete(component);
  }

  tryGetFocusedIcon() {
    return this.focusedIcon.get();
  }

  getFocusedIcon() {
    return ensure(this.focusedIcon.get(), "missing focusedIcon");
  }

  setFocusedIcon(icon: ImageAsset) {
    this.focusedIcon.set(icon);
    this.focusedElement.set(undefined);
    this.focusedComponent.set(undefined);
  }

  resetFocus() {
    this.focusedComponent.set(undefined);
    this.focusedElement.set(undefined);
    this.focusedIcon.set(undefined);
  }

  getIconToggles(icon: ImageAsset) {
    if (!this.iconToToggles.has(icon)) {
      this.iconToToggles.set(icon, observable.map());
    }
    return ensure(
      this.iconToToggles.get(icon),
      `missing ${icon} in iconToToggles`
    );
  }

  getIconToggle(icon: ImageAsset, prop: IconToggleProp) {
    return this.getIconToggles(icon).get(prop);
  }

  setIconToggle(
    icon: ImageAsset,
    prop: IconToggleProp,
    value: string | null | undefined
  ) {
    if (value == null) {
      this.getIconToggles(icon).delete(prop);
    } else {
      this.getIconToggles(icon).set(prop, value);
    }
    this.iconToCode.delete(icon);
  }

  resetIconToggles(icon: ImageAsset) {
    this.iconToToggles.delete(icon);
    this.iconToCode.delete(icon);
  }

  getIconCustomCode(icon: ImageAsset) {
    return this.iconToCode.get(icon);
  }

  setIconCustomCode(icon: ImageAsset, code: string | null) {
    if (code == null) {
      this.iconToCode.delete(icon);
    } else {
      this.iconToCode.set(icon, code);
    }
  }

  updateStateFromRoute(history: History, path: string) {
    const projectId = this.studioCtx.siteInfo.id;
    const components = this.studioCtx.site.components.filter(
      (c) => !isFrameComponent(c) && !isCodeComponent(c) && !isSubComponent(c)
    );
    const icons = this.studioCtx.site.imageAssets.filter(
      (icon) => icon.type === ImageAssetType.Icon && !!icon.dataUri
    );
    const matchDocs = parseRoute(APP_ROUTES.projectDocs, path, false);
    if (!matchDocs) {
      // Not a Docs Portal URL
      return;
    }

    const matchComponent = parseRoute(APP_ROUTES.projectDocsComponent, path);
    const matchIcon = parseRoute(APP_ROUTES.projectDocsIcon, path);
    const matchComponents = parseRoute(APP_ROUTES.projectDocsComponents, path);
    const matchIcons = parseRoute(APP_ROUTES.projectDocsIcons, path);
    const matchCodegenType = parseRoute(
      APP_ROUTES.projectDocsCodegenType,
      path
    );
    const codegenType = [
      matchComponent,
      matchIcon,
      matchComponents,
      matchIcons,
      matchCodegenType,
    ].find((match) => match?.params.codegenType)?.params.codegenType;

    // No codegen type selected, show the intro tab.
    if (!codegenType) {
      this._xDocsTabKey.set("intro");
      this.resetFocus();
      return;
    }

    this.setCodegenType(codegenType);

    const replace = (pathname: string) => {
      this.studioCtx.appCtx.history.replace(pathname);
    };

    const accessComponents = () => {
      if (components.length !== 0) {
        // Redirects to first component
        replace(
          fillRoute(APP_ROUTES.projectDocsComponent, {
            projectId: projectId,
            componentIdOrClassName:
              toClassName(components[0].name) || components[0].uuid,
            codegenType,
          })
        );
      } else {
        if (matchComponents) {
          this._xDocsTabKey.set("components");
          this.resetFocus();
        } else {
          // Redirects to docs/components
          replace(
            fillRoute(APP_ROUTES.projectDocsComponents, {
              projectId: projectId,
              codegenType,
            })
          );
        }
      }
    };
    const accessIcons = () => {
      if (icons.length !== 0) {
        // Redirects to first icon
        replace(
          fillRoute(APP_ROUTES.projectDocsIcon, {
            projectId: projectId,
            iconIdOrClassName: toClassName(icons[0].name) || icons[0].uuid,
            codegenType,
          })
        );
      } else {
        if (matchIcons) {
          this._xDocsTabKey.set("images");
          this.resetFocus();
        } else {
          // Redirects to docs/icons
          replace(
            fillRoute(APP_ROUTES.projectDocsIcons, {
              projectId: projectId,
              codegenType,
            })
          );
        }
      }
    };

    if (matchComponent) {
      const componentIdOrClassName =
        matchComponent.params.componentIdOrClassName;
      const component = components.find(
        (value) =>
          value.uuid === componentIdOrClassName ||
          toClassName(value.name) === componentIdOrClassName
      );
      if (!component) {
        accessComponents();
      } else {
        this.setFocusedComponent(component);
        this._xDocsTabKey.set("components");
      }
    } else if (matchIcon) {
      const iconIdOrClassName = matchIcon.params.iconIdOrClassName;
      const icon = icons.find(
        (value) =>
          value.uuid === iconIdOrClassName ||
          toClassName(value.name) === iconIdOrClassName
      );
      if (!icon) {
        replace(
          fillRoute(APP_ROUTES.projectDocs, {
            projectId: projectId,
          })
        );
      } else {
        this.setFocusedIcon(icon);
        this._xDocsTabKey.set("images");
      }
    } else if (matchComponents) {
      // docs/components -> docs/component/firstComponent
      accessComponents();
    } else if (matchIcons) {
      // docs/icons -> docs/icon/firstIcon
      accessIcons();
    } else {
      this.resetFocus();
      this.docsTabKey = "intro";
    }
  }

  get docsTabKey() {
    return this._xDocsTabKey.get();
  }

  set docsTabKey(key: DocsTabKey | undefined) {
    this._xDocsTabKey.set(key);
  }
}

const DocsPortalCtxContext = React.createContext<DocsPortalCtx | undefined>(
  undefined
);
export const providesDocsPortalCtx = withProvider(
  DocsPortalCtxContext.Provider
);
export const useDocsPortalCtx = () =>
  ensure(
    React.useContext(DocsPortalCtxContext),
    "missing DocsPortalCtxContext"
  );

export function codegenTypeToRoute(
  codegenType: "cms" | "codegen"
): "codegen" | "loader" {
  return codegenType === "cms" ? "loader" : codegenType;
}
