import { removeFromArray } from "@/wab/commons/collections";
import { unwrap } from "@/wab/commons/failable-utils";
import { parseMasterPkg } from "@/wab/server/pkg-mgr";
import { FastBundler } from "@/wab/shared/bundler";
import {
  _testonly,
  getNewProps,
  makePlumeComponentMeta,
} from "@/wab/shared/code-components/code-components";
import { PlumeComponent } from "@/wab/shared/core/components";
import { createSite } from "@/wab/shared/core/sites";
import { unbundleSite } from "@/wab/shared/core/tagged-unbundle";
import {
  Component,
  PropParam,
  Site,
  StateChangeHandlerParam,
  StateParam,
} from "@/wab/shared/model/classes";
import type { CodeComponentMeta } from "@plasmicapp/host";

const { findDuplicateAriaParams } = _testonly;

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
      ).newProps.map((p) => p.variable.name);
      expect(paramNames).toBeEmpty();
    });
    it("returns all params for a component with no params", () => {
      plumeComponent.params = [];
      const paramNames = unwrap(
        getNewProps(site, plumeComponent, plumePluginComponentMeta)
      ).newProps.map((p) => p.variable.name);
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
      ).newProps.map((p) => p.variable.name);
      expect(paramNames).toEqual(["value", "aria-label"]);
    });
  });

  describe("findDuplicateAriaParams", () => {
    it("returns empty array for 0 params", () => {
      removeFromArray(plumeComponent.params, plumeAriaLabelParam);
      removeFromArray(plumeComponent.params, plumeAriaLabelledByParam);
      expect(findDuplicateAriaParams(plumeComponent)).toBeEmpty();
    });
    it("returns empty array for 1 params", () => {
      expect(plumeComponent.params).toContain(plumeAriaLabelParam);
      expect(plumeComponent.params).toContain(plumeAriaLabelledByParam);
      expect(findDuplicateAriaParams(plumeComponent)).toBeEmpty();
    });
    it("returns the param with higher uid for 2 params", () => {
      const dupAriaLabelParam = new PropParam({ ...plumeAriaLabelParam });
      const dupAriaLabelledByParam = new PropParam({
        ...plumeAriaLabelledByParam,
      });
      plumeComponent.params.push(dupAriaLabelParam);
      plumeComponent.params.push(dupAriaLabelledByParam);
      expect(findDuplicateAriaParams(plumeComponent)).toEqual([
        dupAriaLabelParam,
        dupAriaLabelledByParam,
      ]);
      expect(dupAriaLabelParam.uid).toBeGreaterThan(plumeAriaLabelParam.uid);
      expect(dupAriaLabelledByParam.uid).toBeGreaterThan(
        plumeAriaLabelledByParam.uid
      );
    });
    it("returns the params with 2 highest uids for 3 params", () => {
      const dupAriaLabelParams = [
        new PropParam({ ...plumeAriaLabelParam }),
        new PropParam({ ...plumeAriaLabelParam }),
      ];
      const dupAriaLabelledByParams = [
        new PropParam({ ...plumeAriaLabelledByParam }),
        new PropParam({ ...plumeAriaLabelledByParam }),
      ];
      plumeComponent.params.push(...dupAriaLabelParams);
      plumeComponent.params.push(...dupAriaLabelledByParams);
      expect(findDuplicateAriaParams(plumeComponent)).toEqual([
        ...dupAriaLabelParams,
        ...dupAriaLabelledByParams,
      ]);
      expect(
        dupAriaLabelParams.every((p) => p.uid > plumeAriaLabelParam.uid)
      ).toBeTrue();
      expect(
        dupAriaLabelledByParams.every(
          (p) => p.uid > plumeAriaLabelledByParam.uid
        )
      ).toBeTrue();
    });
  });
});
