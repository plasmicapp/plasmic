import { CodeComponentMeta, NextJsPlasmicComponentLoader } from "@plasmicapp/loader-nextjs";
import * as React from "react";

type ComponentRegistrationMap = Map<string, {
  component: React.ComponentType<unknown>,
  meta: CodeComponentMeta<unknown>,
  devName: string,
}>;

/**
 * Registers with altered names so they don't conflict with names on production.
 *
 * This function overrides the loader's methods to do this.
 */
export function registerWithDevMeta(loader: NextJsPlasmicComponentLoader, register: () => void) {
  using _registerGlobalContext = override(loader, "registerGlobalContext", orig => (context, meta) => {
    const devMeta = {
      ...meta,
      name: toDevName(meta.name),
      displayName: toDevDisplayName(meta.displayName),
    };
    console.debug(`Registering global context "${meta.name}" with dev meta:`, devMeta);
    orig(context, devMeta);
  });
  using _registerFunction = override(loader, "registerFunction", orig => (fn, meta) => {
    const devMeta = {
      ...meta,
      name: toDevName(meta.name),
      displayName: toDevDisplayName(meta.displayName),
    };
    console.debug(`Registering function "${meta.name}" with dev meta:`, devMeta);
    orig(fn, devMeta);
  });
  using _registerToken = override(loader, "registerToken", orig => (token) => {
    const devToken = {
      ...token,
      name: toDevName(token.name),
      displayName: toDevDisplayName(token.displayName),
    };
    console.debug(`Registering token "${token.name}" with dev meta:`, devToken);
    orig(devToken);
  });
  using _registerTrait = override(loader, "registerTrait", orig => (trait, meta) => {
    const devTrait = toDevName(trait);
    const devMeta = {
      ...meta,
      label: toDevDisplayName(meta.label),
    };
    console.debug(`Registering trait "${trait}" as "${devTrait}" with dev meta:`, devMeta);
    orig(devTrait, devMeta);
  });

  // registerComponent is different from the others.
  // registerComponent metas may have references to each other, such as
  // `allowedComponents` or `defaultValue`, but there is no guarantee that
  // on the ordering of registrations. Therefore, we must first collect all
  // component names, then call the original registerComponent with knowledge
  // of all registered components.
  const componentRegMap: ComponentRegistrationMap = new Map();
  using registerComponent = override(loader, "registerComponent", orig => <T extends React.ComponentType<any>>(component: T, meta: CodeComponentMeta<React.ComponentProps<T>>) => {
    componentRegMap.set(
      meta.name,
      {
        component,
        meta: meta as CodeComponentMeta<unknown>,
        devName: toDevName(meta.name),
      })
  })

  register();

  componentRegMap.forEach(({ component, meta, devName }) => {
    const codeComponentMeta = meta;
    const devMeta = {
      ...codeComponentMeta,
      name: devName,
      displayName: toDevDisplayName(codeComponentMeta.displayName),
      props: replacePropsWithDevNames(meta.props, componentRegMap, new Set()),
    };
    console.debug(`Registering component "${meta.name}" with dev meta:`, devMeta);
    registerComponent.orig(component, devMeta);
  });
}

/**
 * Helper function to override a method. Dispose to restore.
 *
 * Useful when you want to override while using the original method.
 */
function override<Object, MethodName extends keyof Object>(
  obj: Object,
  name: MethodName,
  override: (orig: Object[MethodName]) => Object[MethodName]
): { orig: Object[MethodName] } & Disposable {
  const orig = (obj[name] as Function).bind(obj);
  obj[name] = override(orig);
  return {
    orig,
    [Symbol.dispose]: () => {
      obj[name] = orig;
    }
  }
}

function toDevName(name: string) {
  // needs to be a valid JavaScript identifier
  return `${name}$dev`;
}

function toDevDisplayName(name: string | undefined) {
  return name ? `[dev] ${name}` : name;
}

function replacePropsWithDevNames<T extends object>(node: T, regMap: ComponentRegistrationMap, visited: Set<object>): T {
  if (visited.has(node)) {
    return node;
  }
  visited.add(node);

    if (Array.isArray(node)) {
      node.forEach((childNode, index) => {
        // Handles:
        //   allowedComponents: [ "REPLACE-ME" ]
        if (typeof childNode === "string") {
          const reg = regMap.get(childNode);
          if (reg) {
            node[index] = reg.devName;
          }
        }

        if (typeof childNode === "object" && childNode !== null) {
          replacePropsWithDevNames(childNode, regMap, visited);
        }
      })
    } else {
      // Handles:
      //   defaultValue: {
      //     type: "component",
      //     name: "REPLACE-ME",
      //     props: { ... }
      //   }
      if ("type" in node && node.type === "component" && "name" in node && typeof node.name === "string") {
        const reg = regMap.get(node.name);
        if (reg) {
          node.name = reg.devName;
        }
      }

      Object.values(node)
        .forEach(childNode => {
          if (typeof childNode === "object" && childNode !== null) {
            replacePropsWithDevNames(childNode, regMap, visited);
          }
        })
    }

  return node;
}
