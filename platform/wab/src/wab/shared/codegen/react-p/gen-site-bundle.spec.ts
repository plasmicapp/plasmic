import {
  getCodeComponentsUsedByExport,
  getSiteComponentsToExport,
} from "@/wab/shared/codegen/react-p/gen-site-bundle";
import {
  CodeComponent,
  ComponentType,
  mkComponent,
} from "@/wab/shared/core/components";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplComponentX, mkTplTagX } from "@/wab/shared/core/tpls";
import { CodeComponentMeta } from "@/wab/shared/model/classes";

function mkCodeComponent(name: string) {
  return mkComponent({
    name,
    type: ComponentType.Code,
    tplTree: mkTplTagX("div"),
    codeComponentMeta: {
      importPath: "./components",
      importName: null,
      defaultExport: false,
    } as CodeComponentMeta,
  }) as CodeComponent;
}

function mkComponentUsing(name: string, codeComponent: CodeComponent) {
  return mkComponent({
    name,
    type: ComponentType.Plain,
    tplTree: (baseVariant) =>
      mkTplComponentX({ component: codeComponent, baseVariant }),
  });
}

describe("getCodeComponentsUsedByExport", () => {
  it("limits partial exports to the selected component dependency closure", () => {
    const site = createSite();
    const selectedCodeComponent = mkCodeComponent("SelectedCodeComponent");
    const unrelatedCodeComponent = mkCodeComponent("Invalid component name");
    const selectedComponent = mkComponentUsing(
      "SelectedComponent",
      selectedCodeComponent
    );
    const unrelatedComponent = mkComponentUsing(
      "UnrelatedComponent",
      unrelatedCodeComponent
    );
    site.components.push(
      selectedComponent,
      unrelatedComponent,
      selectedCodeComponent,
      unrelatedCodeComponent
    );

    const components = getSiteComponentsToExport(site, {
      componentIdOrNames: [selectedComponent.uuid],
      componentExportOpts: {
        codeComponentStubs: false,
        hostLessComponentsConfig: "package",
      },
      includePages: true,
    });

    expect(components).toEqual([selectedComponent]);
    expect(getCodeComponentsUsedByExport(site, components)).toEqual([
      selectedCodeComponent,
    ]);
  });
});
