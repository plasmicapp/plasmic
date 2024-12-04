import {
  makeArgsTypeName,
  makeComponentRenderIdFileName,
  makePlasmicComponentName,
  makePlasmicSuperContextName,
  makeVariantsArgTypeName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { ExportOpts } from "@/wab/shared/codegen/types";
import { getSuperComponents } from "@/wab/shared/core/components";
import { Component } from "@/wab/shared/model/classes";

export function serializePlasmicSuperContext(ctx: SerializerBaseContext) {
  const { component } = ctx;
  if (component.subComps.length === 0) {
    return "";
  }
  return `const ${makePlasmicSuperContextName(
    component
  )} = React.createContext<undefined|{variants: ${makeVariantsArgTypeName(
    component
  )}, args: ${makeArgsTypeName(component)}}>(undefined);`;
}

export function makeSuperCompImports(component: Component, opts: ExportOpts) {
  const superComps = getSuperComponents(component);

  return superComps
    .map(
      (superComp) => `
    import SUPER__${makePlasmicComponentName(superComp)} from "./${
        opts.idFileNames
          ? makeComponentRenderIdFileName(superComp)
          : makePlasmicComponentName(superComp)
      }";  // plasmic-import: ${superComp.uuid}/render
  `
    )
    .join("\n");
}
