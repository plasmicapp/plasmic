import { mkDataToken } from "@/wab/commons/DataToken";
import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { VariantGroupType, mkBaseVariant } from "@/wab/shared/Variants";
import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ParamExportType, mkParam } from "@/wab/shared/core/lang";
import { UNINITIALIZED_VALUE, createSite } from "@/wab/shared/core/sites";
import { mkTplComponent, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  ComponentVariantGroup,
  CustomCode,
  GlobalVariantGroup,
  Mixin,
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
  depSite.styleTokens.push(depStyleToken);
  depSite.styleTokens.push(depStyleToken2);
  const site = createSite();
  site.projectDependencies.push(
    new ProjectDependency({
      name: "dep",
      projectId: "123",
      uuid: "123",
      pkgId: "123",
      version: "0.0.1",
      site: depSite,
    })
  );
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
  compareIndex?: number
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
    site.components.unshift(newComponent("component1"));
    site.components.unshift(newComponent("component2"));
    // site.components[i].params (Slots)
    // - add new slots
    site.components[0].params.unshift(
      mkParam({
        name: "name",
        type: typeFactory.num(),
        exportType: ParamExportType.External,
        paramType: "prop",
      })
    );
    // site.components[i].variants
    // - add new variants
    site.components[0].variants.unshift(mkBaseVariant());
    // site.components[i].variantGroups
    // - add new variantgroups
    site.components[0].variantGroups.unshift(
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
      })
    );
    // site.components[i].variantGroups[j].variants
    // - add new variants to the variant groups
    site.components[0].variantGroups[0].variants.unshift(
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
      })
    );
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
    firstChild().vsettings[0].rs.values["left"] = "0px";
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
    (
      (secondChild().vsettings[0].text as RawText).markers[0] as StyleMarker
    ).rs.values["font-weight"] = "600";
    compareCheck("patch", 1);

    // Setting attr is a patch change
    site = nextSite();
    firstChild().vsettings[0].attrs["title"] = new CustomCode({
      code: JSON.stringify("Hello"),
      fallback: undefined,
    });
    compareCheck("patch", 1);

    // Removing
    nextSite().components[0].params.shift();
    compareCheck("major", 1);

    // removing an style variant is only a patch change
    nextSite().components[0].variants.shift();
    compareCheck("patch", 1);

    nextSite().components[0].variantGroups[0].variants.shift();
    compareCheck("major", 1);
    nextSite().components[0].variantGroups.shift();
    compareCheck("major", 1);

    // Deleting an unnamed element is patch
    (nextSite().components[0].tplTree as TplTag).children.shift();
    compareCheck("patch", 1);

    // Deleting a named element ("newName") is major
    (nextSite().components[0].tplTree as TplTag).children.shift();
    compareCheck("major", 1);

    // Make sure we are escalating "major" version bumps over "minor" and "patch"
    compareCheck("major", undefined, 12);

    // - indirect component changes
    const oldSite = nextSite();
    $$$(oldSite.components[0].tplTree).append(
      mkTplComponent(oldSite.components[1], oldSite.components[0].variants[0])
    );

    $$$(nextSite().components[1].tplTree).append(newTpl());
    compareCheck("minor", 2);
    return;
  });

  // site.globalVariantGroups
  it("semver-globalVariantGroups", () => {
    // - add new VariantGroup
    nextSite().globalVariantGroups.unshift(
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
      })
    );
    compareCheck("minor", 1);
    // site.globalVariantGroups[i].variants
    // - add new Variant to that group
    nextSite().globalVariantGroups[0].variants.unshift(
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
      })
    );
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
    nextSite().globalVariantGroups[0].variants.shift();
    compareCheck("major", 1);
    // - delete the VariantGroup
    nextSite().globalVariantGroups.shift();
    compareCheck("major", 1);
    return;
  });

  // site.mixins
  it("semver-mixins", () => {
    // - Add new mixin
    nextSite().mixins.unshift(
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
      })
    );
    compareCheck("minor", 1);
    // - change mixin preview
    nextSite().mixins[0].preview = "newpreview";
    compareCheck("patch", 0); // Currently not including patch changes
    // - rename mixin
    nextSite().mixins[0].name = "newMixinName";
    compareCheck("major", 1);
    // - add new mixin and delete previous mixin
    nextSite().mixins[0] = new Mixin({
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
    });
    compareCheck("major", 2);
    // - use mixin on component and change mixin value for indirect changes
    const oldSite = nextSite();
    oldSite.components.unshift(newComponent("component1"));
    oldSite.components[0].variants.unshift(mkBaseVariant());
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
    nextSite().dataTokens.unshift(
      mkDataToken({
        name: "Data Token 1",
        value: "123",
      })
    );
    compareCheck("minor", 1);
    // - change data token value
    nextSite().dataTokens[0].value = "456";
    compareCheck("patch", 1);
    // - rename data token
    nextSite().dataTokens[0].name = "New Data Token 1";
    compareCheck("major", 1);
    // - add new data token and delete previous data token
    nextSite().dataTokens[0] = mkDataToken({
      name: "Data Token 2",
      value: "789",
    });
    compareCheck("major", 2);
    return;
  });

  // site.styleTokens
  it("semver-styleTokens", () => {
    // - Add new token
    nextSite().styleTokens.unshift(
      new StyleToken({
        name: "sampleToken",
        type: "Color",
        uuid: mkShortId(),
        value: "rgb(0,0,0)",
        variantedValues: [],
        isRegistered: false,
        regKey: undefined,
      })
    );
    compareCheck("minor", 1);
    // - change token value
    nextSite().styleTokens[0].value = "rgb(255,255,255)";
    compareCheck("patch", 0); // Currently not including patch changes
    // - rename token
    nextSite().styleTokens[0].name = "newTokenName";
    compareCheck("major", 1);
    // - add varianted value
    nextSite().styleTokens[0].variantedValues.push(
      new VariantedValue({
        variants: [mkBaseVariant()],
        value: "rgb(255,255,255)",
      })
    );
    compareCheck("patch", 1);
    // - change varianted value
    nextSite().styleTokens[0].variantedValues[0].value = "rgb(0,255,0)";
    compareCheck("patch", 1);
    // - add new token and delete previous token
    nextSite().styleTokens[0] = new StyleToken({
      name: "token2",
      type: "Color",
      uuid: mkShortId(),
      value: "rgb(0,0,0)",
      variantedValues: [],
      isRegistered: false,
      regKey: undefined,
    });
    compareCheck("major", 2);
    // - use token on component and change token value for indirect changes
    const oldSite = nextSite();
    oldSite.components.unshift(newComponent("component1"));
    oldSite.components[0].variants.unshift(mkBaseVariant());
    $$$(oldSite.components[0].tplTree).append(newTpl());
    const children = (oldSite.components[0].tplTree as TplTag)
      .children[0] as TplTag;
    ensureBaseVariantSetting(oldSite.components[0], children);
    children.vsettings[0].rs.values["background-color"] = mkTokenRef(
      oldSite.styleTokens[0]
    );
    nextSite().styleTokens[0].value = "rgb(0, 0, 0)";
    compareCheck("patch", 2);

    return;
  });

  // site.styleTokenOverrides
  it("semver-styleTokensOverrides", () => {
    // - Add new override
    nextSite().styleTokenOverrides.unshift(
      new StyleTokenOverride({
        token: depStyleToken,
        value: "rgb(255,0,0)",
        variantedValues: [],
      })
    );
    compareCheck("minor", 1);
    // - change override value
    nextSite().styleTokenOverrides[0].value = "rgb(255,255,255)";
    compareCheck("patch", 0); // Currently not including patch changes
    // - add override varianted value
    nextSite().styleTokenOverrides[0].variantedValues.push(
      new VariantedValue({
        variants: [mkBaseVariant()],
        value: "rgb(255,255,255)",
      })
    );
    compareCheck("patch", 1);
    // - change override varianted value
    nextSite().styleTokenOverrides[0].variantedValues[0].value = "rgb(0,255,0)";
    compareCheck("patch", 1);
    // - add new override on another token and delete previous override
    nextSite().styleTokenOverrides[0] = new StyleTokenOverride({
      token: depStyleToken2,
      value: "rgb(0,255,0)",
      variantedValues: [],
    });
    compareCheck("major", 2);
    // - use token on component and change token value for indirect changes
    const oldSite = nextSite();
    oldSite.components.unshift(newComponent("component1"));
    oldSite.components[0].variants.unshift(mkBaseVariant());
    $$$(oldSite.components[0].tplTree).append(newTpl());
    const children = (oldSite.components[0].tplTree as TplTag)
      .children[0] as TplTag;
    ensureBaseVariantSetting(oldSite.components[0], children);
    children.vsettings[0].rs.values["background-color"] = mkTokenRef(
      oldSite.styleTokenOverrides[0].token
    );
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
    nextSite().projectDependencies.unshift(importedProject);
    compareCheck("minor", 1);

    // - removed dep
    nextSite().projectDependencies.shift();
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
