import { removeFromArray } from "@/wab/commons/collections";
import { isSlot } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  getBuiltinComponentRegistrations,
  isBuiltinCodeComponent,
} from "@/wab/shared/code-components/builtin-code-components";
import {
  CodeComponentSyncCallbackFns,
  CodeComponentsRegistry,
  attachRenderableTplSlots,
  compareComponentPropsWithMeta,
  compareComponentStatesWithMeta,
  createStyleTokenFromRegistration,
  customFunctionId,
  extractDefaultSlotContents,
  getNewProps,
  mkCodeComponent,
  syncCodeComponents,
} from "@/wab/shared/code-components/code-components";
import { assert, ensure } from "@/wab/shared/common";
import {
  CodeComponent,
  isCodeComponent,
  isContextCodeComponent,
  isHostLessCodeComponent,
} from "@/wab/shared/core/components";
import { createSite, writeable } from "@/wab/shared/core/sites";
import { addComponentState } from "@/wab/shared/core/states";
import { mkTplComponent } from "@/wab/shared/core/tpls";
import {
  HostLessPackageInfo,
  Site,
  ensureKnownPropParam,
} from "@/wab/shared/model/classes";
import {
  ComponentMeta,
  ComponentRegistration,
  GlobalContextMeta,
} from "@plasmicapp/host";
import path from "path";
import React from "react";
import { failable, failableAsync } from "ts-failable";

let componentsUpdatingSlotContents = new WeakSet<CodeComponent>();

const ccServerCallbackFns: CodeComponentSyncCallbackFns = {
  onReset: () => {
    componentsUpdatingSlotContents = new WeakSet();
  },
  onMissingCodeComponents: async (_ctx, missingComponents, missingContexts) =>
    failableAsync(async ({ success }) =>
      // Not using `failure` because it should be a fatal error anyways
      success(
        assert(
          [...missingComponents, ...missingContexts].filter(
            (c) => !isBuiltinCodeComponent(c)
          ).length === 0,
          () =>
            "Hostless package removed components " +
            [...missingComponents, ...missingContexts]
              .map((c) => c.name)
              .join(", ")
        )
      )
    ),
  onInvalidReactVersion: async (_ctx, hostLessPkgInfo) =>
    failableAsync(async ({ success }) =>
      // Not using `failure` because it should be a fatal error anyways
      success(
        assert(
          false,
          `${hostLessPkgInfo.name} requires a React version >= ${hostLessPkgInfo.minimumReactVersion}. Current version is ${React.version}`
        )
      )
    ),
  onInvalidComponentImportNames: (components) =>
    assert(
      false,
      () =>
        "Hostless package registered components with invalid importNames: " +
        components.join(", ")
    ),
  onStaleProps: async (ctx) => {
    const changes = ctx.site.components
      .filter(isCodeComponent)
      .map((c) => {
        // Should be safe to ensure, because `fixMissingCodeComponents` should
        // fix all missing code components in the site before loading it.
        const { meta } = ensure(
          ctx.codeComponentsRegistry
            .getRegisteredComponentsAndContextsMap()
            .get(c.name),
          "Missing code component " + c.name
        );
        const maybeError = compareComponentPropsWithMeta(ctx.site, c, meta);
        if (maybeError.result.isError) {
          throw maybeError.result.error;
        }
        const diff = maybeError.result.value;
        return {
          component: c,
          ...diff,
        };
      })
      .filter(({ addedProps, updatedProps, removedProps }) =>
        [addedProps, updatedProps, removedProps].some((i) => i.length > 0)
      );
    changes.forEach(({ addedProps, updatedProps, component }) => {
      const affectedSlots = [
        ...addedProps,
        ...updatedProps.flatMap(({ before, after }) => [before, after]),
      ].filter((param) => isSlot(param));
      if (affectedSlots.length > 0) {
        componentsUpdatingSlotContents.add(component);
      }
    });
    return true;
  },
  onNewDefaultComponents: (message) =>
    assert(
      false,
      () =>
        "Hostless packages shouldn't use default components, however: " +
        message
    ),
  onSchemaToTplWarnings: (warnings) =>
    assert(
      false,
      warnings.map((w) => `${w.message} - ${w.description}`).join("\n")
    ),
  onSchemaToTplError: (err) => {
    throw err;
  },
  onElementStyleWarnings: (warnings) =>
    assert(
      false,
      warnings.map((w) => `${w.message} - ${w.description}`).join("\n")
    ),
  onInvalidJsonForDefaultValue: (message) => assert(false, message),
};

export async function createSiteForHostlessProject(
  hostLessPackageInfo: HostLessPackageInfo
) {
  const site = createSite({
    hostLessPackageInfo: new HostLessPackageInfo(hostLessPackageInfo),
  });
  await withFreshRegistries(async () => {
    // First read the dependency packages, keeping track of the components that
    // the dependencies registered
    for (const dep of hostLessPackageInfo.deps) {
      loadServerPackage(dep);
    }

    const depComponents = [...(globalThis.__PlasmicComponentRegistry ?? [])];
    const depContexts = [...(globalThis.__PlasmicContextRegistry ?? [])];
    const depTokens = [...(globalThis.__PlasmicTokenRegistry ?? [])];

    // Next, load the actual package
    loadServerPackage(hostLessPackageInfo.name);

    // read the registered components/contexts/tokens, filtering out the ones
    // registered by the dependencies
    const registeredComponents = (
      globalThis.__PlasmicComponentRegistry ?? []
    ).filter((x) => !depComponents.includes(x));
    const registeredContexts = (
      globalThis.__PlasmicContextRegistry ?? []
    ).filter((x) => !depContexts.includes(x));
    registeredContexts.forEach((cc) => ((cc.meta as any).__isContext = true));

    const registeredTokens = (globalThis.__PlasmicTokenRegistry ?? []).filter(
      (x) => !depTokens.includes(x)
    );

    // create code components
    const componentToMeta = new Map<
      CodeComponent,
      ComponentMeta<any> | GlobalContextMeta<any>
    >();

    [...registeredComponents, ...registeredContexts].forEach(({ meta }) => {
      const component = mkCodeComponent(meta.name, meta, {});
      component.codeComponentMeta.isHostLess = true;

      site.components.push(component);
      componentToMeta.set(component, meta);
    });

    site.globalContexts.push(
      ...site.components
        .filter(isContextCodeComponent)
        .map((component) => mkTplComponent(component, site.globalVariant))
    );

    // add props and default value to slots
    site.components.filter(isCodeComponent).forEach((c) => {
      const meta = componentToMeta.get(c)!;
      const newProps = getNewProps(site, c, meta);
      if (!newProps.result.isError) {
        c.params = newProps.result.value.newProps;
        attachRenderableTplSlots(c);
      } else {
        throw newProps.result.error;
      }

      const newStates = compareComponentStatesWithMeta(site, c, meta);
      if (!newStates.result.isError) {
        // Only need to deal with addedStates, since we're creating a fresh component
        newStates.result.value.addedStates.forEach((state) => {
          addComponentState(site, c, state);
          writeable(state.param).state = state;
          ensureKnownPropParam(state.onChangeParam);
        });
      } else {
        throw newStates.result.error;
      }

      const slotContents = extractDefaultSlotContents(meta);
      c.codeComponentMeta.defaultSlotContents = slotContents;
    });
    site.components
      .filter(isCodeComponent)
      .forEach((c) => (c.codeComponentMeta.isHostLess = true));

    for (const tokenReg of registeredTokens) {
      const token = createStyleTokenFromRegistration(tokenReg);
      site.styleTokens.push(token);
    }
  });

  return site;
}

/**
 * Updates site, a hostless package site, by evaluating the latest hostless canvas package
 * and updating the site component's metadata
 */
export async function updateHostlessPackage(
  site: Site,
  projectName: string,
  plumeSite: Site
) {
  await withFreshRegistries(async () => {
    const existingComponents = site.components
      .filter((c) => !isBuiltinCodeComponent(c))
      .map((c) => c.uuid);
    const existingLibraries = site.codeLibraries.map((c) => c.name);
    const existingCustomFunctions = site.customFunctions.map((f) =>
      customFunctionId(f)
    );
    const existingParamsByComponent = Object.fromEntries(
      site.components.map(
        (c) =>
          [
            c.uuid,
            {
              slots: c.params
                .filter((p) => isSlot(p))
                .map((p) => p.variable.name),
              nonSlots: c.params
                .filter((p) => !isSlot(p))
                .map((p) => p.variable.name),
            },
          ] as const
      )
    );

    const pkgInfo = ensure(
      site.hostLessPackageInfo,
      () => "Expected hostless package"
    );
    console.log(`UPDATING ${pkgInfo.name}`);

    for (const dep of pkgInfo.deps) {
      console.log(`\tLoading dependency ${dep}`);
      loadServerPackage(dep);
    }

    const importedComponentNames = new Set(
      [
        ...globalThis.__PlasmicComponentRegistry,
        ...globalThis.__PlasmicContextRegistry,
      ].map(({ meta }: ComponentRegistration) => meta.name)
    );

    console.log(`\tLoading main package ${pkgInfo.name}`);
    loadServerPackage(pkgInfo.name);

    console.log(
      "\tRegistry has:",
      globalThis.__PlasmicComponentRegistry
        .map(({ meta }) => meta.name)
        .join(",")
    );

    const tplMgr = new TplMgr({ site });

    ccServerCallbackFns.onReset?.();

    const result = await syncCodeComponents(
      {
        change: async (f) => failable((args) => f(args)),
        observeComponents: (_) => true,
        codeComponentsRegistry: new CodeComponentsRegistry(
          globalThis,
          getBuiltinComponentRegistrations()
        ),
        getPlumeSite: () => plumeSite,
        getRootSubReact: () => React,
        site,
        tplMgr: () => tplMgr,
      },
      ccServerCallbackFns,
      { force: true }
    );
    if (result.result.isError) {
      throw result.result.error;
    }

    // Delete global contexts from imported packages
    const toDeleteComponents = site.components.filter(
      (c) => importedComponentNames.has(c.name) || isBuiltinCodeComponent(c)
    );
    tplMgr.removeComponentGroup(toDeleteComponents);
    toDeleteComponents.forEach((c) => {
      if (site.globalContexts.some((tpl) => tpl.component === c)) {
        removeFromArray(
          site.globalContexts,
          site.globalContexts.find((tpl) => tpl.component === c)
        );
      }
    });

    site.components
      .filter(isCodeComponent)
      .forEach((c) => (c.codeComponentMeta.isHostLess = true));

    console.log(
      "\tRegistered:",
      site.components.map((c) => c.name)
    );

    // Clear site default styles
    site.themes.forEach((theme) => {
      theme.styles = [];
      theme.defaultStyle.rs.values = {};
    });

    // Assert we have at least one component and marked as hostless or we
    // have a code library
    assert(
      site.components.some((c) => isHostLessCodeComponent(c)) ||
        site.codeLibraries.length > 0 ||
        site.customFunctions.length > 0,
      () => "No hostless component in site"
    );

    // Assert all existing components have been preserved
    existingComponents.forEach((uuid) => {
      const component = site.components.find((c) => c.uuid === uuid);
      assert(component, () => `Component with uuid ${uuid} has been removed!`);
      const { slots, nonSlots } = existingParamsByComponent[uuid];
      slots.forEach((slot) => {
        assert(
          component.params.some((p) => isSlot(p) && p.variable.name === slot),
          () => `Deleted slot ${slot} of component ${component.name}`
        );
      });
      nonSlots.forEach((param) => {
        assert(
          component.params.some((p) => !isSlot(p) && p.variable.name === param),
          () => `Deleted param ${param} of component ${component.name}`
        );
      });
    });

    // Assert all custom functions and code libraries have been preserved
    const newLibraries = new Set(site.codeLibraries.map((c) => c.name));
    const newCustomFunctions = new Set(
      site.customFunctions.map((f) => customFunctionId(f))
    );
    existingLibraries.forEach((lib) => {
      /*assert(
        newLibraries.has(lib),
        () => `Code Library ${lib} has been removed!`
      );*/
    });
    existingCustomFunctions.forEach((f) => {
      /*assert(
        newCustomFunctions.has(f),
        () => `Custom Function ${f} has been removed!`
      );*/
    });
  });
}

async function withFreshRegistries(func: () => Promise<void>) {
  if (!globalThis.__PlasmicComponentRegistry) {
    globalThis.__PlasmicComponentRegistry = [];
  }
  if (!globalThis.__PlasmicContextRegistry) {
    globalThis.__PlasmicContextRegistry = [];
  }
  if (!globalThis.__PlasmicTokenRegistry) {
    globalThis.__PlasmicTokenRegistry = [];
  }
  if (!globalThis.__PlasmicFunctionsRegistry) {
    globalThis.__PlasmicFunctionsRegistry = [];
  }
  if (!globalThis.__PlasmicLibraryRegistry) {
    globalThis.__PlasmicLibraryRegistry = [];
  }
  assert(
    globalThis.__PlasmicComponentRegistry.length === 0,
    () => "__PlasmicComponentRegistry is not empty"
  );
  assert(
    globalThis.__PlasmicContextRegistry.length === 0,
    () => "__PlasmicContextRegistry is not empty"
  );
  assert(
    globalThis.__PlasmicTokenRegistry.length === 0,
    () => "__PlasmicTokenRegistry is not empty"
  );
  assert(
    globalThis.__PlasmicFunctionsRegistry.length === 0,
    () => "__PlasmicFunctionsRegistry is not empty"
  );
  assert(
    globalThis.__PlasmicLibraryRegistry.length === 0,
    () => "__PlasmicLibraryRegistry is not empty"
  );

  try {
    await func();
  } finally {
    // clear registry
    globalThis.__PlasmicComponentRegistry = [];
    globalThis.__PlasmicContextRegistry = [];
    globalThis.__PlasmicTokenRegistry = [];
    globalThis.__PlasmicFunctionsRegistry = [];
    globalThis.__PlasmicLibraryRegistry = [];
  }
}

function loadServerPackage(pkg: string) {
  const pkgPath = path.resolve(
    path.join(
      __dirname,
      `../../../../../canvas-packages/build-server/${pkg}.js`
    )
  );
  console.log(`\tLoading ${pkg} from ${pkgPath}`);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkgModule = require(pkgPath);
  if (!pkgModule.register) {
    throw new Error(
      `Package ${pkg} does not have a register function exported`
    );
  }
  pkgModule.register();
}
