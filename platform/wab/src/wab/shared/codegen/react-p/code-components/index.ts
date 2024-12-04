import {
  CodeComponentWithHelpers,
  isCodeComponentWithHelpers,
} from "@/wab/shared/code-components/code-components";
import { isTplRootWithCodeComponentVariants } from "@/wab/shared/code-components/variants";
import {
  getImportedCodeComponentHelperName,
  getImportedComponentName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { ImportAliasesMap } from "@/wab/shared/codegen/react-p/types";
import { ExportOpts } from "@/wab/shared/codegen/types";
import { assert } from "@/wab/shared/common";
import {
  getCodeComponentHelperImportName,
  isHostLessCodeComponent,
} from "@/wab/shared/core/components";
import { Component, TplNode } from "@/wab/shared/model/classes";

export function generateCodeComponentsHelpersFromRegistry(
  components: Component[],
  aliases: ImportAliasesMap,
  opts: ExportOpts
) {
  return components
    .filter(
      (c) =>
        isCodeComponentWithHelpers(c) &&
        !(
          isHostLessCodeComponent(c) &&
          opts.hostLessComponentsConfig === "package"
        )
    )
    .map((c) => {
      assert(isCodeComponentWithHelpers(c), "checked before");
      return `const ${getImportedCodeComponentHelperName(
        aliases,
        c
      )} = getCodeComponentHelper__${getImportedComponentName(aliases, c)}()`;
    });
}

export function serializeCodeComponentVariantsTriggers(tplRoot: TplNode) {
  if (!isTplRootWithCodeComponentVariants(tplRoot)) {
    return "";
  }

  const ccVariantKeys = Object.keys(
    tplRoot.component.codeComponentMeta.variants
  );

  return `
    const [$ccVariants, setDollarCcVariants] = React.useState<Record<string, boolean>>({
      ${ccVariantKeys.map((key) => `${key}: false`).join(",\n")}
    });
    const updateVariant = React.useCallback((changes: Record<string, boolean>) => {
      setDollarCcVariants((prev) => {
        if (!Object.keys(changes).some((k) => prev[k] !== changes[k])) {
          return prev;
        }
        return { ...prev, ...changes }
      });
    }, []);
  `;
}

export function makeCodeComponentHelperImportName(
  c: CodeComponentWithHelpers,
  opts: ExportOpts,
  aliases: ImportAliasesMap
) {
  if (opts.useCodeComponentHelpersRegistry && !isHostLessCodeComponent(c)) {
    return `{ getCodeComponentHelper as getCodeComponentHelper__${getImportedComponentName(
      aliases,
      c
    )}}`;
  } else {
    return `{ ${getCodeComponentHelperImportName(
      c
    )} as ${getImportedCodeComponentHelperName(aliases, c)}}`;
  }
}
