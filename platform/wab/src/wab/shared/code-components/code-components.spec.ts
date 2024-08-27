import { removeFromArray } from "@/wab/commons/collections";
import { unwrap } from "@/wab/commons/failable-utils";
import { parseMasterPkg } from "@/wab/server/pkg-mgr";
import { FastBundler } from "@/wab/shared/bundler";
import {
  getNewProps,
  makePlumeComponentMeta,
  maybeNormParamName,
} from "@/wab/shared/code-components/code-components";
import {
  ComponentType,
  mkComponent,
  PlumeComponent,
} from "@/wab/shared/core/components";
import { mkParam, ParamExportType } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { unbundleSite } from "@/wab/shared/core/tagged-unbundle";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import {
  Component,
  PropParam,
  Site,
  StateChangeHandlerParam,
  StateParam,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import type { CodeComponentMeta } from "@plasmicapp/host";

describe("code-components", () => {
  // Unbundle plume-master-pkg.json and pick out TextInput
  // plus some of its interesting params to test.
  let plumeComponent: PlumeComponent;
  let plumeNameParam: PropParam;
  let plumeValueParam: StateParam;
  let plumeOnChangeParam: PropParam;
  let plumeIsDisabledParam: StateParam;
  let plumeOnIsDisabledChangeParam: StateChangeHandlerParam;
  let plumeAriaLabelParam: PropParam;
  let plumeAriaLabelledByParam: PropParam;

  // These come from the Plume plugin system
  let plumePluginComponentMeta: CodeComponentMeta<unknown>;

  let site: Site;

  beforeEach(() => {
    const {
      master: [projectId, bundle],
    } = parseMasterPkg("plume");
    const unbundled = unbundleSite(new FastBundler(), projectId, bundle, []);
    const plumeSite = unbundled.site;
    expect(unbundled.depPkgs).toBeEmpty();
    plumeComponent = plumeSite.components.find(
      (c) => c.name === "TextInput"
    ) as PlumeComponent;
    expect(plumeComponent).toBeInstanceOf(Component);
    expect(plumeComponent.plumeInfo).toBeDefined();
    plumeNameParam = plumeComponent.params.find(
      (p) => p.variable.name === "name"
    ) as PropParam;
    expect(plumeNameParam).toBeInstanceOf(PropParam);
    plumeValueParam = plumeComponent.params.find(
      (p) => p.variable.name === "value"
    ) as StateParam;
    expect(plumeValueParam).toBeInstanceOf(StateParam);
    plumeOnChangeParam = plumeComponent.params.find(
      (p) => p.variable.name === "onChange"
    ) as PropParam;
    expect(plumeOnChangeParam).toBeInstanceOf(PropParam);
    plumeIsDisabledParam = plumeComponent.params.find(
      (p) => p.variable.name === "Is Disabled"
    ) as StateParam;
    expect(plumeIsDisabledParam).toBeInstanceOf(StateParam);
    plumeOnIsDisabledChangeParam = plumeComponent.params.find(
      (p) => p.variable.name === "On Is Disabled change"
    ) as StateChangeHandlerParam;
    expect(plumeOnIsDisabledChangeParam).toBeInstanceOf(
      StateChangeHandlerParam
    );
    plumeAriaLabelParam = plumeComponent.params.find(
      (p) => p.variable.name === "aria-label"
    ) as PropParam;
    expect(plumeAriaLabelParam).toBeInstanceOf(PropParam);
    plumeAriaLabelledByParam = plumeComponent.params.find(
      (p) => p.variable.name === "aria-labelledby"
    ) as PropParam;
    expect(plumeAriaLabelledByParam).toBeInstanceOf(PropParam);

    plumePluginComponentMeta = makePlumeComponentMeta(plumeComponent);
    expect(Object.keys(plumePluginComponentMeta.props)).toEqual([
      "value",
      "name",
      "aria-label",
      "aria-labelledby",
      "onChange",
      "type",
    ]);

    site = createSite();
    site.components.push(plumeComponent);
  });

  describe("getNewProps", () => {
    it("returns no params for the full component", () => {
      const paramNames = unwrap(
        getNewProps(site, plumeComponent, plumePluginComponentMeta)
      ).map((p) => p.variable.name);
      expect(paramNames).toBeEmpty();
    });
    it("returns all params for a component with no params", () => {
      plumeComponent.params = [];
      const paramNames = unwrap(
        getNewProps(site, plumeComponent, plumePluginComponentMeta)
      ).map((p) => p.variable.name);
      expect(paramNames).toEqual([
        "value",
        "name",
        "aria-label",
        "aria-labelledby",
        "onChange",
        "type",
      ]);
    });
    it("returns missing params", () => {
      removeFromArray(plumeComponent.params, plumeValueParam);
      removeFromArray(plumeComponent.params, plumeAriaLabelParam);
      const paramNames = unwrap(
        getNewProps(site, plumeComponent, plumePluginComponentMeta)
      ).map((p) => p.variable.name);
      expect(paramNames).toEqual(["value", "aria-label"]);
    });
  });

  describe("maybeNormParamName", () => {
    it("returns the name for plain components", () => {
      const component = mkComponent({
        name: "my component",
        type: ComponentType.Plain,
        tplTree: mkTplTagX("div", {}),
      });
      const param = mkParam({
        name: "My slot",
        type: typeFactory.renderable(),
        exportType: ParamExportType.External,
        paramType: "slot",
      });
      expect(maybeNormParamName(component, param)).toEqual("My slot");
    });
    it("returns the name for code components", () => {
      const component = mkComponent({
        name: "my code component",
        type: ComponentType.Code,
        tplTree: mkTplTagX("div", {}),
      });
      const param = mkParam({
        name: "children",
        type: typeFactory.renderable(),
        exportType: ParamExportType.External,
        paramType: "slot",
      });
      expect(maybeNormParamName(component, param)).toEqual("children");
    });
    describe("for Plume components", () => {
      it("camelCases most Plume params", () => {
        expect(maybeNormParamName(plumeComponent, plumeNameParam)).toEqual(
          "name"
        );
        expect(
          maybeNormParamName(plumeComponent, plumeIsDisabledParam)
        ).toEqual("isDisabled");
        expect(
          maybeNormParamName(plumeComponent, plumeOnIsDisabledChangeParam)
        ).toEqual("onIsDisabledChange");
      });
      it("does not touch aria- params", () => {
        expect(maybeNormParamName(plumeComponent, plumeAriaLabelParam)).toEqual(
          "aria-label"
        );
        expect(
          maybeNormParamName(plumeComponent, plumeAriaLabelledByParam)
        ).toEqual("aria-labelledby");
      });
    });
  });
});
