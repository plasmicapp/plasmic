import { serializeUseGlobalVariants } from "@/wab/shared/codegen/react-p/global-variants";
import {
  makeCreateUseGlobalVariantsName,
  makePlasmicModulePrelude,
  makeProjectModuleFileName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { getReactWebPackageName } from "@/wab/shared/codegen/react-p/utils";
import { ExportOpts, ProjectModuleBundle } from "@/wab/shared/codegen/types";
import { makeGlobalVariantGroupImportTemplate } from "@/wab/shared/codegen/variants";
import { allGlobalVariantGroups } from "@/wab/shared/core/sites";
import { Site } from "@/wab/shared/model/classes";
import { uniqBy } from "lodash";
import type { SetRequired } from "type-fest";

export function makeProjectModuleBundle(
  site: Site,
  projectId: string,
  exportOpts: SetRequired<Partial<ExportOpts>, "targetEnv">
): ProjectModuleBundle {
  const globalVariantGroups = new Set(
    uniqBy(
      allGlobalVariantGroups(site, {
        includeDeps: "all",
        excludeEmpty: true,
        excludeInactiveScreenVariants: true,
      }),
      (vg) => vg.param.variable.name
    )
  );

  const globalVariantImports =
    globalVariantGroups.size === 0
      ? ""
      : `
          ${[...globalVariantGroups]
            .map((vg) =>
              makeGlobalVariantGroupImportTemplate(vg, ".", exportOpts)
            )
            .join("\n")}
        `;

  const module = `${makePlasmicModulePrelude(projectId)}
  
    import { ${makeCreateUseGlobalVariantsName()} } from "${getReactWebPackageName(
    exportOpts
  )}";
    ${globalVariantImports}
  
    ${serializeUseGlobalVariants(globalVariantGroups)}
  `;

  return {
    id: projectId,
    module,
    fileName: makeProjectModuleFileName(projectId, exportOpts),
  };
}
