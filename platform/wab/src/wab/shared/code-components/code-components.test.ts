import { unwrap } from "@/wab/commons/neverthrow-utils";
import { parseMasterPkg } from "@/wab/server/pkg-mgr";
import { TplMgr } from "@/wab/shared/TplMgr";
import { FastBundler } from "@/wab/shared/bundler";
import {
  CodeComponentsRegistry,
  _testonly,
  componentMetaToComponentParams,
  getNewProps,
  makePlumeComponentMeta,
  mkCodeComponent,
  parseStyles,
} from "@/wab/shared/code-components/code-components";
import { arrayRemove } from "@/wab/shared/collections";
import { only, uncheckedCast } from "@/wab/shared/common";
import { PlumeComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { syncGlobalContexts } from "@/wab/shared/core/project-deps";
import { createSite } from "@/wab/shared/core/sites";
import { unbundleSite } from "@/wab/shared/core/tagged-unbundle";
import {
  Component,
  ProjectDependency,
  PropParam,
  Site,
  StateChangeHandlerParam,
  StateParam,
} from "@/wab/shared/model/classes";
import type { GlobalContextMeta } from "@plasmicapp/host";
import type { CodeComponentMeta } from "@plasmicapp/host/registerComponent";

const { addNewRegisteredComponents, findDuplicateAriaParams } = _testonly;

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
      (c) => c.name === "TextInput",
    ) as PlumeComponent;
    expect(plumeComponent).toBeInstanceOf(Component);
    expect(plumeComponent.plumeInfo).toBeDefined();
    plumeNameParam = plumeComponent.params.find(
      (p) => p.variable.name === "name",
    ) as PropParam;
    expect(plumeNameParam).toBeInstanceOf(PropParam);
    plumeValueParam = plumeComponent.params.find(
      (p) => p.variable.name === "value",
    ) as StateParam;
    expect(plumeValueParam).toBeInstanceOf(StateParam);
    plumeOnChangeParam = plumeComponent.params.find(
      (p) => p.variable.name === "onChange",
    ) as PropParam;
    expect(plumeOnChangeParam).toBeInstanceOf(PropParam);
    plumeIsDisabledParam = plumeComponent.params.find(
      (p) => p.variable.name === "Is Disabled",
    ) as StateParam;
    expect(plumeIsDisabledParam).toBeInstanceOf(StateParam);
    plumeOnIsDisabledChangeParam = plumeComponent.params.find(
      (p) => p.variable.name === "On Is Disabled change",
    ) as StateChangeHandlerParam;
    expect(plumeOnIsDisabledChangeParam).toBeInstanceOf(
      StateChangeHandlerParam,
    );
    plumeAriaLabelParam = plumeComponent.params.find(
      (p) => p.variable.name === "aria-label",
    ) as PropParam;
    expect(plumeAriaLabelParam).toBeInstanceOf(PropParam);
    plumeAriaLabelledByParam = plumeComponent.params.find(
      (p) => p.variable.name === "aria-labelledby",
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
        getNewProps(site, plumeComponent, plumePluginComponentMeta),
      ).newProps.map((p) => p.variable.name);
      expect(paramNames).toBeEmpty();
    });
    it("returns all params for a component with no params", () => {
      plumeComponent.params = [];
      const paramNames = unwrap(
        getNewProps(site, plumeComponent, plumePluginComponentMeta),
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
      arrayRemove(plumeComponent.params, plumeValueParam);
      arrayRemove(plumeComponent.params, plumeAriaLabelParam);
      const paramNames = unwrap(
        getNewProps(site, plumeComponent, plumePluginComponentMeta),
      ).newProps.map((p) => p.variable.name);
      expect(paramNames).toEqual(["value", "aria-label"]);
    });
  });

  describe("findDuplicateAriaParams", () => {
    it("returns empty array for 0 params", () => {
      arrayRemove(plumeComponent.params, plumeAriaLabelParam);
      arrayRemove(plumeComponent.params, plumeAriaLabelledByParam);
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
        plumeAriaLabelledByParam.uid,
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
        dupAriaLabelParams.every((p) => p.uid > plumeAriaLabelParam.uid),
      ).toBeTrue();
      expect(
        dupAriaLabelledByParams.every(
          (p) => p.uid > plumeAriaLabelledByParam.uid,
        ),
      ).toBeTrue();
    });
  });
});

describe("parseStyles", () => {
  it("cycles transition lists without rewriting timing functions", () => {
    expect(
      parseStyles(
        {
          transitionProperty: " opacity , transform, filter ",
          transitionTimingFunction:
            "cubic-bezier(0.1,  0.2, 0.3, 1), steps(4, jump-end)",
          transitionDuration: "100ms, 200ms",
        },
        "component",
        {},
      ),
    ).toEqual({
      styles: {
        "transition-property": "opacity, transform, filter",
        "transition-timing-function":
          "cubic-bezier(0.1,  0.2, 0.3, 1), steps(4, jump-end), cubic-bezier(0.1,  0.2, 0.3, 1)",
        "transition-duration": "100ms, 200ms, 100ms",
        "transition-delay": "0s, 0s, 0s",
      },
      warnings: [],
    });
  });

  it("cycles background longhands across images with quoted commas", () => {
    expect(
      parseStyles(
        {
          backgroundImage:
            'url("one, image.png"), url("two.png"), url("three.png")',
          backgroundPosition: "left top, right bottom",
          backgroundRepeat: "no-repeat",
        },
        "component",
        {},
      ),
    ).toEqual({
      styles: {
        background:
          'url("one, image.png") left top no-repeat, url("two.png") right bottom no-repeat, url("three.png") left top no-repeat',
      },
      warnings: [],
    });
  });
});

describe("addNewRegisteredComponents", () => {
  const meta = {
    name: "AuthContext",
    importPath: "",
    props: { domain: "string" },
    __isContext: true,
  } as unknown as GlobalContextMeta<any>;

  function mkCtx(
    site: Site,
    tplMgr: TplMgr,
  ): Parameters<typeof addNewRegisteredComponents>[0] {
    return {
      site,
      codeComponentsRegistry: new CodeComponentsRegistry(
        uncheckedCast<Window>({
          __PlasmicContextRegistry: [{ component: () => null, meta }],
        }),
        {},
      ),
      change: async (f) => f(),
      observeComponents: () => true,
      getRootSubReact: () => {
        throw new Error("unused");
      },
      tplMgr: () => tplMgr,
      getPlumeSite: () => undefined,
    };
  }

  it("adds a global context entry for a new context", async () => {
    const site = createSite();
    const tplMgr = new TplMgr({ site });
    const newComponents = (
      await addNewRegisteredComponents(mkCtx(site, tplMgr), {} as any)
    )._unsafeUnwrap();

    const context = only(newComponents);
    expect(site.components).toContain(context);
    expect(context.params.map((p) => p.variable.name)).toContain("domain");
    const tpl = only(site.globalContexts);
    expect(tpl.component).toBe(context);
    expect(only(tpl.vsettings).args).toEqual([]);
  });

  it("takes over a dependency's global context entry and keeps its args", async () => {
    const depSite = createSite();
    const depContext = mkCodeComponent(meta.name, meta, {});
    depContext.params = componentMetaToComponentParams(
      depSite,
      meta,
    )._unsafeUnwrap();
    new TplMgr({ site: depSite }).attachComponent(depContext);
    const dep = new ProjectDependency({
      name: "Lib",
      pkgId: "lib-pkg-id",
      projectId: "lib-project-id",
      version: "0.0.1",
      uuid: "lib-uuid",
      site: depSite,
    });

    const site = createSite({ projectDependencies: [dep] });
    const tplMgr = new TplMgr({ site });
    syncGlobalContexts(dep, site);
    const tpl = only(site.globalContexts);
    const domainParam = only(
      depContext.params.filter((p) => p.variable.name === "domain"),
    );
    tplMgr.setArg(
      tpl,
      only(tpl.vsettings),
      domainParam.variable,
      codeLit("example.com"),
    );

    const newComponents = (
      await addNewRegisteredComponents(mkCtx(site, tplMgr), {} as any)
    )._unsafeUnwrap();

    const siteContext = only(newComponents);
    expect(site.globalContexts).toEqual([tpl]);
    expect(tpl.component).toBe(siteContext);
    const arg = only(only(tpl.vsettings).args);
    expect(siteContext.params).toContain(arg.param);
    expect(arg.param.variable.name).toBe("domain");
    expect(arg.expr).toMatchObject({ code: '"example.com"' });
  });
});
