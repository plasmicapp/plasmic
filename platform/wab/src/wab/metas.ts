import { isKnownType, Param } from "@/wab/classes";
import { ensure, tuple } from "@/wab/common";
import L from "lodash";
// import { componentMetasStr as ReactMetasStr } from "./component-metas/react-meta-gen";
import {
  CompressedReactMeta,
  compressedReactMetaString,
} from "@/wab/component-metas/react-meta-gen-compressed";
import { ParamExportType } from "@/wab/lang";
import { convertTsToWabType, typeFactory } from "@/wab/shared/core/model-util";
import { cloneType } from "@/wab/tpls";

export interface ComponentMeta {
  component: string;
  props: PropMeta[];
}

export interface PropMeta {
  name: string;
  enumValues?: Array<string | boolean | number>;
  type?: Param["type"];
  // react-metas uses null, others leave undefined.
  origin?: string | null | number;
  description?: string;
  required?: boolean;
}

/**
 * Clean up some garbage Typescript types.
 *
 * There shouldn't be a defaultValue where there's no value, etc.
 */
function adjust(props: PropMeta[]): PropMeta[] {
  const propNames = new Set(props.map((prop) => prop.name));
  return props.filter((prop) =>
    prop.name === "defaultChecked"
      ? propNames.has("checked")
      : prop.name === "defaultValue"
      ? propNames.has("value")
      : prop.name === "onChange"
      ? propNames.has("value") || propNames.has("checked")
      : true
  );
}

function mkMapForPkg(metas: ComponentMeta[]) {
  return {
    components: new Map(
      metas.map(
        ({ component, props }) =>
          tuple(
            component,
            L.sortBy(adjust(props), (prop) => prop.name.toLowerCase())
          ) as [string, PropMeta[]]
      )
    ),
  };
}

let reactMetas: { components: Map<string, PropMeta[]> } | undefined = undefined;
export function getReactMetas() {
  if (!reactMetas) {
    const uncompressedReactMeta = uncompressReactMeta(
      JSON.parse(compressedReactMetaString)
    );

    // Ensures that the uncompressed data is the same as the original one
    // const parsed = JSON.parse(ReactMetasStr);
    // assert(L.isEqual(parsed, uncompressedReactMeta));

    // Parsed output is almost ComponentMeta[]; we need to turn PropMeta.type
    // from string to actual Type reference
    for (const compMeta of uncompressedReactMeta) {
      for (const prop of compMeta.props) {
        if (!isKnownType(prop.type)) {
          // The same prop can be used by different tags, so the type
          // might be already converted.
          prop.type = convertTsToWabType(prop.type);
        }
      }
    }
    reactMetas = mkMapForPkg(uncompressedReactMeta);
  }
  return reactMetas;
}

function genParamsForTag(tag: string, props: PropMeta[]) {
  return props.map((prop) => ({
    name: prop.name,
    type: (prop.type && cloneType(prop.type)) ?? typeFactory.any(),
    exportType: ParamExportType.ToolsOnly,
  }));
}

type MetaParam = Pick<Param, "type" | "exportType"> & { name: string };

const majorInputProps = new Set([
  "placeholder",
  "type",
  "value",
  "defaultValue",
  "disabled",
  "checked",
  "defaultChecked",
]);

const majorProps = new Set([
  "children",
  "onClick",
  "onChange",
  "title",
  "src",
  "onMouseEnter",
  "onMouseLeave",
  "href",
]);

const expandedLabels: { [key: string]: string } = {
  title: "Hover text",
  href: "Destination",
  children: "Contents",
  target: "Open in new tab?",
};

export const alwaysVisibleHTMLAttributes = new Set([
  "alt", // img
  "loading", // img
  "checked", // input[type=checkbox|radio]
  "disabled", // input
  "placeholder", // input
  "value", // input
  "href", // a
  "target", // a
]);

function isBaseOrigin(origin: string) {
  return [
    "AllHTMLAttributes",
    "HTMLAttributes",
    "AriaAttributes",
    "SVGAttributes",
    "DOMAttributes",
  ].some((prefix) => origin.startsWith(prefix));
}

export class MetaSvc {
  private tagNameToParams: Record<string, MetaParam[]> = {};
  private tagNameToEventHandlers: Record<string, string[]> = {};

  paramsForTag(tag: string): MetaParam[] {
    if (!L.has(this.tagNameToParams, tag)) {
      this.tagNameToParams[tag] = genParamsForTag(
        tag,
        ensure(
          getReactMetas().components.get(tag),
          `react metas not found for tag ${tag}`
        )
      );
    }
    return ensure(
      this.tagNameToParams[tag],
      `params not generated for tag ${tag}`
    );
  }

  eventHandlersForTag(tag: string): string[] {
    if (!L.has(this.tagNameToEventHandlers, tag)) {
      this.tagNameToEventHandlers[tag] = ensure(
        getReactMetas().components.get(tag),
        `react metas not found for tag ${tag}`
      )
        .filter((propMeta) => propMeta.name.startsWith("on"))
        .map((propMeta) => propMeta.name);
    }
    return ensure(
      this.tagNameToEventHandlers[tag],
      `handler functions not generated for tag ${tag}`
    );
  }

  /**
   * If the prop is just something from a "base origin" (see isBaseOrigin),
   * then we use the isMajorProp whitelist. Otherwise, for any other props that
   * are more unique to specific tags, always show them.
   */
  isMajorProp(tag: string, prop: string): boolean {
    switch (tag) {
      case "form":
        if (prop === "onSubmit") {
          return true;
        }
        break;
    }
    return this.isMajorComponentProp(tag, prop);
  }

  isMajorComponentProp(tag: string, prop: string) {
    const propMetas = ensure(
      getReactMetas().components.get(tag),
      `react metas not found for tag ${tag}`
    );
    return (
      majorProps.has(prop) ||
      majorInputProps.has(prop) ||
      // isBaseOrigin check only works if the react props factory wasn't just directly using HTMLAttributes
      (propMetas.some((propMeta) => propMeta.origin === "HTMLAttributes") &&
        !!propMetas.find(
          (propMeta) =>
            propMeta.name === prop &&
            (!propMeta.origin ||
              (L.isString(propMeta.origin) && !isBaseOrigin(propMeta.origin)))
        ))
    );
  }

  expandLabel(tag: string): string | undefined {
    return expandedLabels[tag] || L.startCase(tag);
  }
}

function uncompressReactMeta(compressedReactMeta: CompressedReactMeta) {
  const { key2prop, tag2keys, largeCliques } = compressedReactMeta;
  const res: any[] = [];
  Object.entries(tag2keys).forEach(([tag, keys]) => {
    const props: any[] = [];
    keys.forEach((key) =>
      props.push(ensure(key2prop[key], `prop not found for key ${key}`))
    );
    largeCliques.forEach((clique) => {
      if (clique.tags.includes(tag)) {
        clique.keys.forEach((key) =>
          props.push(ensure(key2prop[key], `prop not found for key ${key}`))
        );
      }
    });
    function lexicographicalComp(a: string, b: string) {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    res.push({
      component: tag,
      props: props.sort((prop1, prop2) =>
        lexicographicalComp(prop1.name, prop2.name)
      ),
    });
  });
  return res;
}

export const metaSvc = new MetaSvc();
