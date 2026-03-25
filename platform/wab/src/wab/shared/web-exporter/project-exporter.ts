import { derefTokenRefs, isTokenRef } from "@/wab/commons/StyleToken";
import { isPageComponent } from "@/wab/shared/core/components";
import { siteFinalStyleTokensAllDeps } from "@/wab/shared/core/site-style-tokens";
import { parseScreenSpec } from "@/wab/shared/css-size";
import { Site, StyleToken } from "@/wab/shared/model/classes";
import {
  XmlAttrs,
  XmlObject,
  toXml,
} from "@/wab/shared/web-exporter/xml-utils";

/**
 * Serialize project-level information to XML based on the requested filters.
 *
 * @param site - The Site model.
 * @param opts - Boolean filters for which sections to include.
 */
export function serializeProject(
  site: Site,
  opts: {
    components?: boolean;
    screenBreakpoints?: boolean;
    globalVariants?: boolean;
    tokens?: boolean;
  }
): string {
  const projectChildren: XmlObject[] = [];

  if (opts.components) {
    const components = site.components.map((comp) => {
      const attrs: XmlAttrs = {
        name: comp.name,
        uuid: comp.uuid,
        type: comp.type,
      };
      if (isPageComponent(comp) && comp.pageMeta.path) {
        attrs.path = comp.pageMeta.path;
      }
      return { component: { _attr: attrs } };
    });
    projectChildren.push({ components });
  }

  if (opts.screenBreakpoints) {
    const screenGroup = site.activeScreenVariantGroup;
    if (screenGroup) {
      const breakpointElements = screenGroup.variants.map((variant) => {
        const attrs: XmlAttrs = {
          name: variant.name,
          uuid: variant.uuid,
        };
        if (variant.mediaQuery) {
          const spec = parseScreenSpec(variant.mediaQuery);
          if (spec.minWidth) {
            attrs.minWidth = String(spec.minWidth);
          }
          if (spec.maxWidth) {
            attrs.maxWidth = String(spec.maxWidth);
          }
        }
        return { screenBreakpoint: { _attr: attrs } };
      });
      projectChildren.push({ screenBreakpoints: breakpointElements });
    }
  }

  if (opts.globalVariants) {
    const groupElements = site.globalVariantGroups.map((group) => {
      const variants = group.variants.map((variant) => ({
        variant: { _attr: { name: variant.name, uuid: variant.uuid } },
      }));
      return {
        group: [
          { _attr: { name: group.param.variable.name, uuid: group.uuid } },
          ...variants,
        ],
      };
    });
    projectChildren.push({ globalVariantGroups: groupElements });
  }

  if (opts.tokens) {
    const allFinalTokens = siteFinalStyleTokensAllDeps(site);
    const tokenElements = site.styleTokens.map((token) => {
      const attrs: XmlAttrs = {
        name: token.name,
        uuid: token.uuid,
        type: token.type,
        value: token.value,
      };
      if (isTokenRef(token.value)) {
        attrs.resolvedValue = derefTokenRefs(allFinalTokens, token.value);
      }
      return { token: { _attr: attrs } };
    });
    projectChildren.push({ tokens: tokenElements });
  }

  return toXml({ project: projectChildren });
}

/**
 * Serialize a single style token to XML.
 * If the token references another token, adds a resolvedValue attribute.
 */
export function serializeToken(
  token: StyleToken,
  opts: { site: Site }
): string {
  const attrs: XmlAttrs = {
    name: token.name,
    uuid: token.uuid,
    type: token.type,
    value: token.value,
  };
  if (isTokenRef(token.value)) {
    const allFinalTokens = siteFinalStyleTokensAllDeps(opts.site);
    attrs.resolvedValue = derefTokenRefs(allFinalTokens, token.value);
  }
  return toXml({ token: { _attr: attrs } });
}

/**
 * Serialize an invalid/missing resource reference to XML.
 */
export function serializeInvalidResource(
  uuid: string,
  type: "component" | "token" | "tpl" | "globalVariant",
  message: string
): string {
  return toXml({ "invalid-resource": [{ _attr: { uuid, type } }, message] });
}
