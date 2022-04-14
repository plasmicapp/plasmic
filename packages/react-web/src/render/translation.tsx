import React from "react";

export type PlasmicTranslator = (
  str: string,
  opts?: {
    components?: {
      [key: string]: React.ReactElement;
    };
  }
) => React.ReactNode;

export const PlasmicTranslatorContext =
  React.createContext<PlasmicTranslator | undefined>(undefined);

export interface TransProps {
  children?: React.ReactNode;
}

function isIterable(val: any): val is Iterable<any> {
  return val != null && typeof val[Symbol.iterator] === "function";
}

export function genTranslatableString(elt: React.ReactNode) {
  const components: {
    [key: string]: React.ReactElement;
  } = {};
  let componentsCount = 0;

  const getText = (node: React.ReactNode): string => {
    if (!node) {
      return "";
    }
    if (
      typeof node === "number" ||
      typeof node === "boolean" ||
      typeof node === "string"
    ) {
      return node.toString();
    }
    if (typeof node !== "object") {
      return "";
    }
    if (Array.isArray(node) || isIterable(node)) {
      return Array.from(node)
        .map((child) => getText(child))
        .filter((child) => !!child)
        .join("");
    }
    const nodeChildren: React.ReactNode =
      (hasKey(node, "props") &&
        hasKey(node.props, "children") &&
        (node.props.children as React.ReactNode | undefined)) ||
      (hasKey(node, "children") && node.children) ||
      [];
    const contents = `${React.Children.toArray(nodeChildren)
      .map((child) => getText(child))
      .filter((child) => !!child)
      .join("")}`;
    if (React.isValidElement(node) && node.type === React.Fragment) {
      return contents;
    }
    const componentId = componentsCount;
    componentsCount++;
    components[`t${componentId}`] = React.isValidElement(node)
      ? React.cloneElement(node as any, {
          key: componentId,
          children: undefined,
        })
      : (node as never);
    return `<t${componentId}>${contents}</t${componentId}>`;
  };

  const str = getText(elt);
  return {
    str,
    components,
    componentsCount,
  };
}

export function Trans({ children }: TransProps) {
  const _t = React.useContext(PlasmicTranslatorContext);
  if (!_t) {
    warnNoTranslationFunctionAtMostOnce();
    return children;
  }

  const { str, components, componentsCount } = genTranslatableString(children);
  return _t(str, componentsCount > 0 ? { components } : undefined);
}

let hasWarned = false;
function warnNoTranslationFunctionAtMostOnce() {
  if (!hasWarned) {
    console.warn(
      "Using Plasmic Translation but no translation function has been provided"
    );
    hasWarned = true;
  }
}

function hasKey<K extends string>(v: any, key: K): v is Record<K, any> {
  return typeof v === "object" && v !== null && key in v;
}
