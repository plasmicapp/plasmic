import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { VariantGroupType, mkBaseVariant } from "@/wab/shared/Variants";
import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ParamExportType, mkParam } from "@/wab/shared/core/lang";
import { UNINITIALIZED_VALUE, createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import {
  ComponentVariantGroup,
  CustomCode,
  GlobalVariantGroup,
  Mixin,
  RawText,
  RuleSet,
  Site,
  StyleMarker,
  StyleToken,
  TplTag,
  Variant,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  ChangeLogEntry,
  calculateSemVer,
  compareSites,
} from "@/wab/shared/site-diffs";
import L from "lodash";

// Using it as a LIFO stack, where i=0 is the latest
const sites: Site[] = [];

beforeEach(() => {
  sites.unshift(createSite());
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
  it("semver-components", () => {
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
      }),
      preview: null,
      uuid: mkShortId(),
      forTheme: false,
      variantedRs: [],
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
    return;
  });
});
