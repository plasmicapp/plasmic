import { mkDataToken } from "@/wab/commons/DataToken";
import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { VariantGroupType, mkBaseVariant } from "@/wab/shared/Variants";
import { arrayReplaceAt } from "@/wab/shared/collections";
import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ParamExportType, mkParam } from "@/wab/shared/core/lang";
import { UNINITIALIZED_VALUE, createSite } from "@/wab/shared/core/sites";
import { mkTplComponent, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  ComponentVariantGroup,
  CustomCode,
  CustomFunction,
  GlobalVariantGroup,
  Mixin,
  PageHref,
  PageMeta,
  ProjectDependency,
  RawText,
  RuleSet,
  Site,
  StyleMarker,
  StyleToken,
  StyleTokenOverride,
  TplTag,
  Variant,
  VariantedValue,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  ChangeLogEntry,
  calculateSemVer,
  compareSites,
  getExternalChangeData,
} from "@/wab/shared/site-diffs";
import L from "lodash";

// Using it as a LIFO stack, where i=0 is the latest
const sites: Site[] = [];

const depStyleToken = mkStyleToken({
  name: "primary",
  type: "Color",
  value: "rgb(0,0,0)",
});
const depStyleToken2 = mkStyleToken({
  name: "secondary",
  type: "Color",
  value: "rgb(0,0,0)",
});
beforeEach(() => {
  const depSite = createSite();
  depSite.styleTokens = [...depSite.styleTokens, depStyleToken];
  depSite.styleTokens = [...depSite.styleTokens, depStyleToken2];
  const site = createSite();
  site.projectDependencies = [
    ...site.projectDependencies,
    new ProjectDependency({
      name: "dep",
      projectId: "123",
      uuid: "123",
      pkgId: "123",
      version: "0.0.1",
      site: depSite,
    }),
  ];
  sites.unshift(site);
});

afterEach(() => {
  // Clear `sites` array
  while (sites.length > 0) {
    sites.pop();
  }
});

const nextSite = () => {
  sites.unshift(L.cloneDeep(sites[0]));
  return sites[0];
};

const compareCheck = (
  releaseType: string,
  numChanges?: number,
  compareIndex?: number,
) => {
  let result: ChangeLogEntry[] = [];
  if (compareIndex) {
    result = compareSites(sites[compareIndex], sites[0]);
  } else {
    result = compareSites(sites[1], sites[0]);
  }
  if (numChanges) {
    expect(result.length).toEqual(numChanges);
  }
  expect(calculateSemVer(result)).toEqual(releaseType);
};

describe("compareSites / calculateSemVer", () => {
  // site.components
  const newTpl = (_name?: string) => {
    return mkTplTagX("tag");
  };
  const newComponent = (name: string) => {
    return mkComponent({
      name,
      tplTree: newTpl(),
      type: ComponentType.Plain,
    });
  };
  it("semver-components", () => {
    // - add new components
    let site = nextSite();
    site.components = [newComponent("component1"), ...site.components];
    site.components = [newComponent("component2"), ...site.components];
    // site.components[i].params (Slots)
    // - add new slots
    site.components[0].params = [
      mkParam({
        name: "name",
        type: typeFactory.num(),
        exportType: ParamExportType.External,
        paramType: "prop",
      }),
      ...site.components[0].params,
    ];
    // site.components[i].variants
    // - add new variants
    site.components[0].variants = [
      mkBaseVariant(),
      ...site.components[0].variants,
    ];
    // site.components[i].variantGroups
    // - add new variantgroups
    site.components[0].variantGroups = [
      new ComponentVariantGroup({
        uuid: mkShortId(),
        param: mkParam({
          name: "name",
          type: typeFactory.num(),
          exportType: ParamExportType.External,
          paramType: "state",
        }),
        variants: [],
        multi: false,
        type: "component",
        linkedState: UNINITIALIZED_VALUE,
      }),
      ...site.components[0].variantGroups,
    ];
    // site.components[i].variantGroups[j].variants
    // - add new variants to the variant groups
    site.components[0].variantGroups[0].variants = [
      new Variant({
        uuid: mkShortId(),
        name: "name",
        selectors: null,
        parent: null,
        mediaQuery: null,
        description: "description",
        forTpl: null,
        codeComponentName: null,
        codeComponentVariantKeys: null,
      }),
      ...site.components[0].variantGroups[0].variants,
    ];
    // site.components[i].tplTree
    // - add to the TplTree
    $$$(site.components[0].tplTree).append(newTpl());
    compareCheck("minor", 2); // 2 new components

    // - naming a previously unnamed TplNode
    ((nextSite().components[0].tplTree as TplTag).children[0] as TplTag).name =
      "tplName";
    // we effectively renamed "tag" to "tplName" ("tag" was the default name)
    compareCheck("major", 1);

    // Make a bunch of patch changes that we don't explicitly track
    site = nextSite();
    site.components[0].params[0].exportType = ParamExportType.ToolsOnly;
    site.components[0].variants[0].description = "newDescription";
    site.components[0].variantGroups[0].variants[0].description =
      "newDescription";
    ((site.components[0].tplTree as TplTag).children[0] as TplTag).tag =
      "newTag";
    compareCheck("patch", 0); // Currently not including patch changes

    // Make some patch changes we do check
    nextSite().components[0].variants[0].selectors = ["Hover"];
    compareCheck("patch", 1);

    // Renaming
    nextSite().components[0].params[0].variable.name = "newName";
    compareCheck("major", 1);
    nextSite().components[0].variantGroups[0].variants[0].name = "newName";
    compareCheck("major", 1);
    nextSite().components[0].variantGroups[0].param.variable.name = "newName";
    compareCheck("major", 1);
    ((nextSite().components[0].tplTree as TplTag).children[0] as TplTag).name =
      "newName";
    compareCheck("major", 1);

    // switching who is named newName results in no change.  Add two more
    // tags, so we don't get "tag" as a name.  Also reset first tag back to "tag"
    // instead of newTag, so that we don't get newTag as a name either
    site = nextSite();
    ((site.components[0].tplTree as TplTag).children[0] as TplTag).tag = "tag";
    $$$(site.components[0].tplTree).append(newTpl());
    $$$(site.components[0].tplTree).append(newTpl());
    $$$(site.components[0].tplTree).append(newTpl());
    site = nextSite();
    ((site.components[0].tplTree as TplTag).children[0] as TplTag).name = "";
    ((site.components[0].tplTree as TplTag).children[1] as TplTag).name =
      "newName";
    compareCheck("patch", 2);

    // Updating VariantSetting should only generate patch changes
    site = nextSite();

    const firstChild = () =>
      (site.components[0].tplTree as TplTag).children[0] as TplTag;
    const secondChild = () =>
      (site.components[0].tplTree as TplTag).children[1] as TplTag;

    ensureBaseVariantSetting(site.components[0], firstChild());
    ensureBaseVariantSetting(site.components[0], secondChild());

    site = nextSite();
    {
      const rs = firstChild().vsettings[0].rs;
      rs.values = { ...rs.values, left: "0px" };
    }
    secondChild().vsettings[0].text = new RawText({
      text: "Hello",
      markers: [
        new StyleMarker({
          position: 1,
          length: 2,
          rs: new RuleSet({
            values: { "font-weight": "300" },
            mixins: [],
            animations: null,
          }),
        }),
      ],
    });
    compareCheck("patch", 2);

    // Changing text is a patch change
    site = nextSite();
    (secondChild().vsettings[0].text as RawText).text = "Ohhai";
    compareCheck("patch", 1);

    // Changing text style is a patch change
    site = nextSite();
    {
      const rs = (
        (secondChild().vsettings[0].text as RawText).markers[0] as StyleMarker
      ).rs;
      rs.values = { ...rs.values, "font-weight": "600" };
    }
    compareCheck("patch", 1);

    // Setting attr is a patch change
    site = nextSite();
    {
      const vs = firstChild().vsettings[0];
      vs.attrs = {
        ...vs.attrs,
        title: new CustomCode({
          code: JSON.stringify("Hello"),
          fallback: undefined,
        }),
      };
    }
    compareCheck("patch", 1);

    // Removing
    {
      const component = nextSite().components[0];
      component.params = component.params.slice(1);
    }
    compareCheck("major", 1);

    // removing an style variant is only a patch change
    {
      const component = nextSite().components[0];
      component.variants = component.variants.slice(1);
    }
    compareCheck("patch", 1);

    {
      const group = nextSite().components[0].variantGroups[0];
      group.variants = group.variants.slice(1);
    }
    compareCheck("major", 1);
    {
      const component = nextSite().components[0];
      component.variantGroups = component.variantGroups.slice(1);
    }
    compareCheck("major", 1);

    // Deleting an unnamed element is patch
    {
      const tplTree = nextSite().components[0].tplTree as TplTag;
      tplTree.children = tplTree.children.slice(1);
    }
    compareCheck("patch", 1);

    // Deleting a named element ("newName") is major
    {
      const tplTree = nextSite().components[0].tplTree as TplTag;
      tplTree.children = tplTree.children.slice(1);
    }
    compareCheck("major", 1);

    // Make sure we are escalating "major" version bumps over "minor" and "patch"
    compareCheck("major", undefined, 12);

    // - indirect component changes
    const oldSite = nextSite();
    $$$(oldSite.components[0].tplTree).append(
      mkTplComponent(oldSite.components[1], oldSite.components[0].variants[0]),
    );

    $$$(nextSite().components[1].tplTree).append(newTpl());
    compareCheck("minor", 2);
    return;
  });

  // site.globalVariantGroups
  it("semver-pageHref", () => {
    let site = nextSite();
    const page = mkComponent({
      name: "page",
      tplTree: newTpl(),
      type: ComponentType.Page,
      pageMeta: new PageMeta({
        path: "/blog/[slug]",
        params: {},
        query: {},
        title: null,
        description: "",
        canonical: null,
        roleId: null,
        openGraphImage: null,
      }),
    });
    const component = newComponent("component1");
    $$$(component.tplTree).append(newTpl());
    site.components = [page, ...site.components];
    site.components = [component, ...site.components];
    const link = () =>
      (site.components[0].tplTree as TplTag).children[0] as TplTag;
    ensureBaseVariantSetting(site.components[0], link());
    {
      const vs = link().vsettings[0];
      vs.attrs = {
        ...vs.attrs,
        href: new PageHref({
          page: site.components[1],
          params: {
            slug: new CustomCode({ code: "($state.slug)", fallback: null }),
          },
          query: {},
          fragment: null,
          encode: true,
        }),
      };
    }
    compareCheck("minor");

    const href = () => link().vsettings[0].attrs["href"] as PageHref;

    // Toggling encode is a patch change
    site = nextSite();
    href().encode = false;
    compareCheck("patch", 1);

    // Changing a param expr is a patch change
    site = nextSite();
    {
      const pageHref = href();
      pageHref.params = {
        ...pageHref.params,
        slug: new CustomCode({
          code: "($state.otherSlug)",
          fallback: null,
        }),
      };
    }
    compareCheck("patch", 1);

    // Adding a query param is a patch change
    site = nextSite();
    {
      const pageHref = href();
      pageHref.query = {
        ...pageHref.query,
        ref: new CustomCode({
          code: JSON.stringify("nav"),
          fallback: null,
        }),
      };
    }
    compareCheck("patch", 1);

    // Setting a fragment is a patch change
    site = nextSite();
    href().fragment = new CustomCode({
      code: JSON.stringify("top"),
      fallback: null,
    });
    compareCheck("patch", 1);

    // No change
    site = nextSite();
    compareCheck("patch", 0);
  });

  it("semver-globalVariantGroups", () => {
    // - add new VariantGroup
    {
      const s = nextSite();
      s.globalVariantGroups = [
        new GlobalVariantGroup({
          uuid: mkShortId(),
          param: mkParam({
            name: "name",
            type: typeFactory.text(),
            exportType: ParamExportType.External,
            paramType: "globalVariantGroup",
          }),
          variants: [],
          multi: false,
          type: VariantGroupType.GlobalUserDefined,
        }),
        ...s.globalVariantGroups,
      ];
    }
    compareCheck("minor", 1);
    // site.globalVariantGroups[i].variants
    // - add new Variant to that group
    {
      const group = nextSite().globalVariantGroups[0];
      group.variants = [
        new Variant({
          uuid: mkShortId(),
          name: "name",
          selectors: null,
          parent: null,
          mediaQuery: null,
          description: "description",
          forTpl: null,
          codeComponentName: null,
          codeComponentVariantKeys: null,
        }),
        ...group.variants,
      ];
    }
    compareCheck("minor", 1);
    // - start mucking around interface-neutral props
    const vg = nextSite().globalVariantGroups[0];
    const v = vg.variants[0];
    vg.type = VariantGroupType.GlobalScreen;
    v.description = "newDesc";
    compareCheck("patch", 0); // Currently not including patch changes
    // - rename the Variant
    vg.type = VariantGroupType.GlobalUserDefined;
    v.name = "newName";
    compareCheck("major", 1);
    // - delete the Variant
    {
      const group = nextSite().globalVariantGroups[0];
      group.variants = group.variants.slice(1);
    }
    compareCheck("major", 1);
    // - delete the VariantGroup
    {
      const s = nextSite();
      s.globalVariantGroups = s.globalVariantGroups.slice(1);
    }
    compareCheck("major", 1);
    return;
  });

  // site.mixins
  it("semver-mixins", () => {
    // - Add new mixin
    {
      const s = nextSite();
      s.mixins = [
        new Mixin({
          name: "mixin",
          rs: new RuleSet({
            values: {},
            mixins: [],
            animations: null,
          }),
          preview: null,
          uuid: mkShortId(),
          forTheme: false,
          variantedRs: [],
        }),
        ...s.mixins,
      ];
    }
    compareCheck("minor", 1);
    // - change mixin preview
    nextSite().mixins[0].preview = "newpreview";
    compareCheck("patch", 0); // Currently not including patch changes
    // - rename mixin
    nextSite().mixins[0].name = "newMixinName";
    compareCheck("major", 1);
    // - add new mixin and delete previous mixin
    {
      const s = nextSite();
      s.mixins = arrayReplaceAt(
        s.mixins,
        0,
        new Mixin({
          name: "mixin2",
          rs: new RuleSet({
            values: {},
            mixins: [],
            animations: null,
          }),
          preview: null,
          uuid: mkShortId(),
          forTheme: false,
          variantedRs: [],
        }),
      );
    }
    compareCheck("major", 2);
    // - use mixin on component and change mixin value for indirect changes
    const oldSite = nextSite();
    oldSite.components = [newComponent("component1"), ...oldSite.components];
    oldSite.components[0].variants = [
      mkBaseVariant(),
      ...oldSite.components[0].variants,
    ];
    $$$(oldSite.components[0].tplTree).append(newTpl());
    const children = (oldSite.components[0].tplTree as TplTag)
      .children[0] as TplTag;
    ensureBaseVariantSetting(oldSite.components[0], children);
    children.vsettings[0].rs.mixins = [oldSite.mixins[0]];
    nextSite().mixins[0].rs = new RuleSet({
      values: {
        "background-color": "rgb(0, 0, 0)",
      },
      mixins: [],
      animations: null,
    });
    compareCheck("patch", 2);
    return;
  });

  // site.dataTokens
  it("semver-data-tokens", () => {
    // - Add new data token
    {
      const s = nextSite();
      s.dataTokens = [
        mkDataToken({
          name: "Data Token 1",
          value: "123",
        }),
        ...s.dataTokens,
      ];
    }
    compareCheck("minor", 1);
    // - change data token value
    nextSite().dataTokens[0].value = "456";
    compareCheck("patch", 1);
    // - rename data token
    nextSite().dataTokens[0].name = "New Data Token 1";
    compareCheck("major", 1);
    // - add new data token and delete previous data token
    {
      const s = nextSite();
      s.dataTokens = arrayReplaceAt(
        s.dataTokens,
        0,
        mkDataToken({
          name: "Data Token 2",
          value: "789",
        }),
      );
    }
    compareCheck("major", 2);
    return;
  });

  // site.customFunctions
  it("semver-custom-functions", () => {
    {
      const s = nextSite();
      s.customFunctions = [
        new CustomFunction({
          importPath: "@plasmicapp/test-functions",
          importName: "getProduct",
          defaultExport: false,
          namespace: "commerce",
          displayName: "Get product",
          params: [],
          isQuery: true,
          isMutation: false,
        }),
        ...s.customFunctions,
      ];
    }
    compareCheck("minor", 1);

    nextSite().customFunctions[0].displayName = "Load product";
    compareCheck("major", 1);

    {
      const s = nextSite();
      s.customFunctions = s.customFunctions.slice(1);
    }
    compareCheck("major", 1);
  });

  // site.styleTokens
  it("semver-styleTokens", () => {
    // - Add new token
    {
      const s = nextSite();
      s.styleTokens = [
        new StyleToken({
          name: "sampleToken",
          type: "Color",
          uuid: mkShortId(),
          value: "rgb(0,0,0)",
          variantedValues: [],
          isRegistered: false,
          regKey: undefined,
        }),
        ...s.styleTokens,
      ];
    }
    compareCheck("minor", 1);
    // - change token value
    nextSite().styleTokens[0].value = "rgb(255,255,255)";
    compareCheck("patch", 0); // Currently not including patch changes
    // - rename token
    nextSite().styleTokens[0].name = "newTokenName";
    compareCheck("major", 1);
    // - add varianted value
    {
      const token = nextSite().styleTokens[0];
      token.variantedValues = [
        ...token.variantedValues,
        new VariantedValue({
          variants: [mkBaseVariant()],
          value: "rgb(255,255,255)",
        }),
      ];
    }
    compareCheck("patch", 1);
    // - change varianted value
    nextSite().styleTokens[0].variantedValues[0].value = "rgb(0,255,0)";
    compareCheck("patch", 1);
    // - add new token and delete previous token
    {
      const s = nextSite();
      s.styleTokens = arrayReplaceAt(
        s.styleTokens,
        0,
        new StyleToken({
          name: "token2",
          type: "Color",
          uuid: mkShortId(),
          value: "rgb(0,0,0)",
          variantedValues: [],
          isRegistered: false,
          regKey: undefined,
        }),
      );
    }
    compareCheck("major", 2);
    // - use token on component and change token value for indirect changes
    const oldSite = nextSite();
    oldSite.components = [newComponent("component1"), ...oldSite.components];
    oldSite.components[0].variants = [
      mkBaseVariant(),
      ...oldSite.components[0].variants,
    ];
    $$$(oldSite.components[0].tplTree).append(newTpl());
    const children = (oldSite.components[0].tplTree as TplTag)
      .children[0] as TplTag;
    ensureBaseVariantSetting(oldSite.components[0], children);
    children.vsettings[0].rs.values = {
      ...children.vsettings[0].rs.values,
      "background-color": mkTokenRef(oldSite.styleTokens[0]),
    };
    nextSite().styleTokens[0].value = "rgb(0, 0, 0)";
    compareCheck("patch", 2);

    return;
  });

  it("refreshes token dictionaries between comparisons", () => {
    const prev = sites[0];
    const token = mkStyleToken({ name: "color", type: "Color", value: "red" });
    prev.components = [...prev.components, newComponent("component")];
    const tpl = prev.components[0].tplTree;
    ensureBaseVariantSetting(prev.components[0], tpl);
    tpl.vsettings[0].rs.values = {
      ...tpl.vsettings[0].rs.values,
      color: mkTokenRef(token),
    };
    const curr = nextSite();
    expect(compareSites(prev, curr)).toEqual([]);
    curr.styleTokens = [...curr.styleTokens, token];
    expect(
      compareSites(prev, curr).some((entry) => entry.description === "updated"),
    ).toBe(true);
    curr.styleTokens = [];
    expect(compareSites(prev, curr)).toEqual([]);
    curr.styleTokens = [...curr.styleTokens, token];
    prev.styleTokens = [...prev.styleTokens, L.cloneDeep(token)];
    expect(compareSites(prev, curr)).toEqual([]);
    token.value = "blue";
    expect(
      compareSites(prev, curr).some((entry) => entry.description === "updated"),
    ).toBe(true);
  });

  // site.styleTokenOverrides
  it("semver-styleTokensOverrides", () => {
    // - Add new override
    {
      const s = nextSite();
      s.styleTokenOverrides = [
        new StyleTokenOverride({
          token: depStyleToken,
          value: "rgb(255,0,0)",
          variantedValues: [],
        }),
        ...s.styleTokenOverrides,
      ];
    }
    compareCheck("minor", 1);
    // - change override value
    nextSite().styleTokenOverrides[0].value = "rgb(255,255,255)";
    compareCheck("patch", 0); // Currently not including patch changes
    // - add override varianted value
    {
      const override = nextSite().styleTokenOverrides[0];
      override.variantedValues = [
        ...override.variantedValues,
        new VariantedValue({
          variants: [mkBaseVariant()],
          value: "rgb(255,255,255)",
        }),
      ];
    }
    compareCheck("patch", 1);
    // - change override varianted value
    nextSite().styleTokenOverrides[0].variantedValues[0].value = "rgb(0,255,0)";
    compareCheck("patch", 1);
    // - add new override on another token and delete previous override
    {
      const s = nextSite();
      s.styleTokenOverrides = arrayReplaceAt(
        s.styleTokenOverrides,
        0,
        new StyleTokenOverride({
          token: depStyleToken2,
          value: "rgb(0,255,0)",
          variantedValues: [],
        }),
      );
    }
    compareCheck("major", 2);
    // - use token on component and change token value for indirect changes
    const oldSite = nextSite();
    oldSite.components = [newComponent("component1"), ...oldSite.components];
    oldSite.components[0].variants = [
      mkBaseVariant(),
      ...oldSite.components[0].variants,
    ];
    $$$(oldSite.components[0].tplTree).append(newTpl());
    const children = (oldSite.components[0].tplTree as TplTag)
      .children[0] as TplTag;
    ensureBaseVariantSetting(oldSite.components[0], children);
    children.vsettings[0].rs.values = {
      ...children.vsettings[0].rs.values,
      "background-color": mkTokenRef(oldSite.styleTokenOverrides[0].token),
    };
    nextSite().styleTokenOverrides[0].value = "rgb(0, 0, 0)";
    compareCheck("patch", 2);

    return;
  });

  it("semver-importedProjects", () => {
    const importedProject = new ProjectDependency({
      name: "Core",
      pkgId: "core-pkg-id",
      projectId: "core-project-id",
      version: "0.0.1",
      uuid: "core-uuid",
      site: createSite(),
    });

    // - added dep
    {
      const s = nextSite();
      s.projectDependencies = [importedProject, ...s.projectDependencies];
    }
    compareCheck("minor", 1);

    // - removed dep
    {
      const s = nextSite();
      s.projectDependencies = s.projectDependencies.slice(1);
    }
    compareCheck("major", 1);
  });
});

describe("getExternalChangeData", () => {
  it("should return empty arrays when there are no changes", () => {
    const changeLog: ChangeLogEntry[] = [];
    const result = getExternalChangeData(changeLog);

    expect(result.importedProjectsChanged).toEqual([]);
    expect(result.pagesChanged).toEqual([]);
  });

  it("should detect changes to imported projects", () => {
    const changeLog: ChangeLogEntry[] = [
      {
        releaseType: "minor",
        parentComponent: "global",
        oldValue: null,
        newValue: {
          type: "Imported Project",
          name: "Project A",
          pkgId: "pkg-a",
          version: "1.0.0",
        },
        description: "added",
      },
      {
        releaseType: "minor",
        parentComponent: "global",
        oldValue: null,
        newValue: {
          type: "Imported Project",
          name: "Project A",
          pkgId: "pkg-a",
          version: "1.0.0",
        },
        description: "added",
      },
      {
        releaseType: "major",
        parentComponent: "global",
        oldValue: {
          type: "Imported Project",
          name: "Project B",
          pkgId: "pkg-b",
          version: "1.0.0",
        },
        newValue: null,
        description: "removed",
      },
    ];

    const result = getExternalChangeData(changeLog);

    expect(result.importedProjectsChanged).toEqual(["Project A", "Project B"]);
    expect(result.pagesChanged).toEqual([]);
  });

  it("should detect changes to page components", () => {
    const changeLog: ChangeLogEntry[] = [
      {
        releaseType: "minor",
        parentComponent: "global",
        oldValue: null,
        newValue: {
          type: "Component",
          componentType: "page",
          uuid: "uuid-1",
          name: "Page A",
          path: "/page-a",
        },
        description: "added",
      },
      {
        releaseType: "minor",
        parentComponent: "global",
        oldValue: null,
        newValue: {
          type: "Component",
          componentType: "page",
          uuid: "uuid-1",
          name: "Page A",
          path: "/page-a",
        },
        description: "added",
      },
      {
        releaseType: "major",
        parentComponent: "global",
        oldValue: {
          type: "Component",
          componentType: "page",
          uuid: "uuid-2",
          name: "Page B",
          path: "/page-b",
        },
        newValue: null,
        description: "removed",
      },
    ];

    const result = getExternalChangeData(changeLog);

    expect(result.importedProjectsChanged).toEqual([]);
    expect(result.pagesChanged).toEqual(["/page-a", "/page-b"]);
  });

  it("should detect changes to parent components with paths", () => {
    const changeLog: ChangeLogEntry[] = [
      {
        releaseType: "patch",
        parentComponent: {
          name: "Parent Page",
          uuid: "uuid-parent",
          componentType: "page",
          path: "/parent-page",
        },
        oldValue: null,
        newValue: {
          type: "Param",
          name: "param1",
        },
        description: "added",
      },
    ];

    const result = getExternalChangeData(changeLog);

    expect(result.importedProjectsChanged).toEqual([]);
    expect(result.pagesChanged).toEqual(["/parent-page"]);
  });

  it("should handle mixed changes", () => {
    const changeLog: ChangeLogEntry[] = [
      {
        releaseType: "minor",
        parentComponent: "global",
        oldValue: null,
        newValue: {
          type: "Imported Project",
          name: "Project A",
          pkgId: "pkg-a",
          version: "1.0.0",
        },
        description: "added",
      },
      {
        releaseType: "major",
        parentComponent: "global",
        oldValue: {
          type: "Component",
          componentType: "page",
          uuid: "uuid-1",
          name: "Page A",
          path: "/page-a",
        },
        newValue: null,
        description: "removed",
      },
      {
        releaseType: "patch",
        parentComponent: {
          name: "Parent Page",
          uuid: "uuid-parent",
          componentType: "page",
          path: "/parent-page",
        },
        oldValue: null,
        newValue: {
          type: "Param",
          name: "param1",
        },
        description: "added",
      },
    ];

    const result = getExternalChangeData(changeLog);

    expect(result.importedProjectsChanged).toEqual(["Project A"]);
    expect(result.pagesChanged).toEqual(["/page-a", "/parent-page"]);
  });
});
