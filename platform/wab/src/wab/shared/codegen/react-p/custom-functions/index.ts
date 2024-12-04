import {
  allCustomFunctions,
  customFunctionsAndLibsUsedByComponent,
} from "@/wab/shared/cached-selectors";
import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { CustomFunctionConfig } from "@/wab/shared/codegen/types";
import { ensure } from "@/wab/shared/common";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { CodeLibrary, CustomFunction, Site } from "@/wab/shared/model/classes";
import { groupBy } from "lodash";

export function customFunctionImportAlias(customFunction: CustomFunction) {
  const customFunctionPrefix = `__fn_`;
  return customFunction.namespace
    ? `${customFunctionPrefix}${customFunction.namespace}__${customFunction.importName}`
    : `${customFunctionPrefix}${customFunction.importName}`;
}

export function codeLibraryImportAlias(lib: CodeLibrary) {
  const libPrefix = `__lib_`;
  return `${libPrefix}${lib.jsIdentifier}`;
}

export function codeLibraryFnImportAlias(lib: CodeLibrary, fn: string) {
  const libPrefix = `__lib_`;
  return `${libPrefix}${lib.jsIdentifier}__${fn}`;
}

export function serializeCustomFunctionsAndLibs(ctx: SerializerBaseContext) {
  const { customFunctions, codeLibraries } =
    customFunctionsAndLibsUsedByComponent(ctx.site, ctx.component);

  if (!customFunctions.length && !codeLibraries.length) {
    return {
      customFunctionsAndLibsImport: "",
      serializedCustomFunctionsAndLibs: "const $$ = {};",
    };
  }

  const customFunctionToOwnerSite = new Map<CustomFunction, Site>();
  allCustomFunctions(ctx.site).forEach(({ customFunction, site }) =>
    customFunctionToOwnerSite.set(customFunction, site)
  );

  let importLoaderRegistry = false;

  // The custom functions can be imported differntly depending on the
  // `exportOpts`:
  // - If `useCustomFunctionsStub` is set, it means we will import the functions
  //   from a common "stub". It happens in:
  //      - Live preview: We just read all code fuctions from `window` and
  //        export them from `./custom-functions`.
  //      - Loader: For user-registered functions, we import them from the
  //        `@plasmicapp/loader-runtime-registry`, but for hostless functions,
  //        we actually import from the usual `importPath` from our servers
  //        (similar to what we do for code components).
  // - If `useCustomFunctionsStub` is not set, we need to use the `importPath`:
  //      - For user-generated functions, the path might be a relative path, so
  //        we defer to `cli/` to generate the final path.
  //      - For hostless functions, we can always import directly from the NPM
  //        package in the `importPath`.
  let customFunctionsAndLibsImport = [
    ...customFunctions.map((fn) => {
      const ownerSite = ensure(
        customFunctionToOwnerSite.get(fn),
        () => `No ownerSite for CustomFunction ${customFunctionId(fn)}`
      );

      if (ctx.exportOpts.useCustomFunctionsStub) {
        // Use the functions stub module for user registered functions.
        if (ctx.exportOpts.isLivePreview) {
          return `import { ${customFunctionImportAlias(
            fn
          )} } from "./custom-functions";`;
        }
        // For hostless custom functions, we only do that in live preview.
        if (!isHostLessPackage(ownerSite)) {
          importLoaderRegistry = true;
          return `const { ${customFunctionImportAlias(
            fn
          )} } = registeredCustomFunctions;`;
        }
      }
      // We need to import from the `importPath`. For hostless functions,
      // we can reference the import paths directly. But, for codegen, we
      // generate a dummy path and fix it up in the `cli/`.
      const importPath = isHostLessPackage(ownerSite)
        ? `"${fn.importPath}";`
        : `"./importPath__${customFunctionId(
            fn
          )}"; // plasmic-import: ${customFunctionId(fn)}/customFunction`;
      return `import ${
        fn.defaultExport
          ? customFunctionImportAlias(fn)
          : `{ ${fn.importName} as ${customFunctionImportAlias(fn)} }`
      } from ${importPath}`;
    }),
    ...codeLibraries.map(([lib, imports]) => {
      // We only support "hostless" code libraries, so we never generate imports
      // from `@plasmicapp/loader-runtime-registry` and also never need to defer
      // to `cli/` to fix relative import paths.
      // The only cases we need to handle are:
      // - Live preview: import the whole lib from the same
      //   "./custom-functions" module.
      // - Loader / codegen: import from the `importPath` NPM package.
      if (ctx.exportOpts.isLivePreview) {
        return `import { ${codeLibraryImportAlias(
          lib
        )} } from "./custom-functions";`;
      } else {
        // For tree shaking, if we know which functions will be used, we can
        // import only those
        return `import ${
          Array.isArray(imports)
            ? `{ ${imports
                .map(
                  (importedFn) =>
                    `${importedFn} as ${codeLibraryFnImportAlias(
                      lib,
                      importedFn
                    )}`
                )
                .join(", ")} }`
            : lib.importType === "namespace"
            ? `* as ${codeLibraryImportAlias(lib)}` // namespace import
            : lib.importType === "default"
            ? `${codeLibraryImportAlias(lib)}` // default import
            : `{ ${lib.namedImport} as ${codeLibraryImportAlias(lib)} }` // named import
        } from "${lib.importPath}";`;
      }
    }),
  ].join("\n");

  if (importLoaderRegistry) {
    customFunctionsAndLibsImport = `import { functions as registeredCustomFunctions } from "@plasmicapp/loader-runtime-registry";
${customFunctionsAndLibsImport}`;
  }

  const serializedCustomFunctionsAndLibs = `const $$ = {
    ${[
      ...customFunctions.filter((f) => !f.namespace),
      ...Object.values(
        groupBy(
          customFunctions.filter((f) => !!f.namespace),
          (f) => f.namespace
        )
      ),
    ]
      .map((functionOrGroup) =>
        !Array.isArray(functionOrGroup)
          ? `${functionOrGroup.importName}: ${customFunctionImportAlias(
              functionOrGroup
            )},`
          : `${functionOrGroup[0].namespace}: {
          ${functionOrGroup
            .map((fn) => `${fn.importName}: ${customFunctionImportAlias(fn)},`)
            .join("\n")}
        },`
      )
      .join("\n")}
    ${codeLibraries
      .map(
        ([lib, imports]) =>
          `${lib.jsIdentifier}: ${
            imports === "all" || ctx.exportOpts.isLivePreview
              ? codeLibraryImportAlias(lib)
              : `{
            ${imports
              .map(
                (importedFn) =>
                  `${importedFn}: ${codeLibraryFnImportAlias(lib, importedFn)},`
              )
              .join("\n")}
          }`
          },`
      )
      .join("\n")}
  };`;

  return { customFunctionsAndLibsImport, serializedCustomFunctionsAndLibs };
}

export function exportCustomFunctionConfig(
  customFunction: CustomFunction
): CustomFunctionConfig {
  return {
    id: customFunctionId(customFunction),
    name: customFunction.importName,
    namespace: customFunction.namespace,
    importPath: customFunction.importPath,
    defaultExport: customFunction.defaultExport,
  };
}
