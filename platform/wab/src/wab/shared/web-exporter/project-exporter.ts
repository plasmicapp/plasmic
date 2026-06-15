import { derefTokenRefs, isTokenRef } from "@/wab/commons/StyleToken";
import { isPageComponent } from "@/wab/shared/core/components";
import {
  siteFinalStyleTokensAllDeps,
  siteFinalStyleTokensDirectDeps,
} from "@/wab/shared/core/site-style-tokens";
import { allGlobalVariantGroups } from "@/wab/shared/core/sites";
import { generateKeyframesRule } from "@/wab/shared/core/styles";
import { FinalToken, toFinalToken } from "@/wab/shared/core/tokens";
import { parseScreenSpec } from "@/wab/shared/css-size";
import {
  AnimationSequence,
  Component,
  Site,
  StyleToken,
  StyleTokenOverride,
  VariantedValue,
  isKnownStyleToken,
} from "@/wab/shared/model/classes";
import {
  XmlAttrs,
  XmlObject,
  indentXmlTextBlock,
  toXml,
} from "@/wab/shared/web-exporter/xml-utils";

/**
 * Serialize project-level information to XML based on the requested filters.
 *
 * Produces a flattened view of the project: each requested section lists the
 * project's own resources plus the resources of every imported (direct
 * dependency) project. Imported resources carry a `fromProject` attribute
 * with the imported project's id, which can be mapped to a name via the
 * always-included list of imported projects.
 *
 * @param site - The Site model of the project to serialize.
 * @param opts - The project's id plus boolean filters for which sections to
 *   include.
 */
export function serializeProject(
  site: Site,
  opts: {
    projectId: string;
    components?: boolean;
    screenBreakpoints?: boolean;
    globalVariants?: boolean;
    tokens?: boolean;
    animations?: boolean;
  }
): string {
  const projectChildren: XmlObject[] = [{ _attr: { id: opts.projectId } }];

  if (opts.components) {
    const components: XmlObject[] = [];
    const pushComponents = (comps: Component[], fromProject?: string) =>
      components.push(
        ...comps.map((comp) => {
          const attrs: XmlAttrs = {
            name: comp.name,
            uuid: comp.uuid,
            type: comp.type,
          };
          if (isPageComponent(comp) && comp.pageMeta.path) {
            attrs.path = comp.pageMeta.path;
          }
          if (fromProject) {
            attrs.fromProject = fromProject;
          }
          return { component: { _attr: attrs } };
        })
      );
    pushComponents(site.components);
    for (const dep of site.projectDependencies) {
      pushComponents(dep.site.components, dep.projectId);
    }
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
    const groupToDepProjectId = new Map(
      site.projectDependencies.flatMap((dep) =>
        dep.site.globalVariantGroups.map(
          (group) => [group, dep.projectId] as const
        )
      )
    );
    const groupElements = allGlobalVariantGroups(site, {
      includeDeps: "direct",
      excludeInactiveScreenVariants: true,
    }).map((group) => {
      const attrs: XmlAttrs = {
        name: group.param.variable.name,
        uuid: group.uuid,
      };
      const fromProject = groupToDepProjectId.get(group);
      if (fromProject) {
        attrs.fromProject = fromProject;
      }
      const variants = group.variants.map((variant) => ({
        variant: { _attr: { name: variant.name, uuid: variant.uuid } },
      }));
      return { group: [{ _attr: attrs }, ...variants] };
    });
    projectChildren.push({ globalVariantGroups: groupElements });
  }

  if (opts.tokens) {
    const allFinalTokens = siteFinalStyleTokensAllDeps(site);
    const tokenToDepProjectId = new Map(
      site.projectDependencies.flatMap((dep) =>
        dep.site.styleTokens.map((token) => [token, dep.projectId] as const)
      )
    );
    const tokenElements = siteFinalStyleTokensDirectDeps(site).map(
      (finalToken) => ({
        token: buildTokenXmlBody(finalToken.base, allFinalTokens, {
          override: finalToken.override,
          fromProject: tokenToDepProjectId.get(finalToken.base),
        }),
      })
    );
    projectChildren.push({ tokens: tokenElements });
  }

  if (opts.animations) {
    const animationElements: XmlObject[] = [];
    const pushAnimations = (
      sequences: AnimationSequence[],
      fromProject?: string
    ) =>
      animationElements.push(
        ...sequences.map((sequence) => {
          const attrs: XmlAttrs = {
            name: sequence.name,
            uuid: sequence.uuid,
          };
          if (fromProject) {
            attrs.fromProject = fromProject;
          }
          return { animation: { _attr: attrs } };
        })
      );
    pushAnimations(site.animationSequences);
    for (const dep of site.projectDependencies) {
      pushAnimations(dep.site.animationSequences, dep.projectId);
    }
    projectChildren.push({ animations: animationElements });
  }

  for (const dep of site.projectDependencies) {
    projectChildren.push({
      "imported-project": {
        _attr: { id: dep.projectId, name: dep.name },
      },
    });
  }

  return toXml({ project: projectChildren });
}

/**
 * Serialize a single style token to XML.
 * If the token references another token, adds a resolvedValue attribute.
 * Each entry in `variantedValues` becomes a `<varianted-value>` child element.
 * A local override of the token in `opts.site` is serialized as an `<override>`
 * child element carrying the override's value and per-variant values.
 */
export function serializeToken(
  token: StyleToken,
  opts: { site: Site }
): string {
  const allFinalTokens = siteFinalStyleTokensAllDeps(opts.site);
  const override = toFinalToken(token, opts.site).override;
  return toXml({
    token: buildTokenXmlBody(token, allFinalTokens, { override }),
  });
}

/**
 * Build the XML body for a given token such as
 *
 * <token name="primary" uuid="GbeqJmcjyAx1" type="Color" value="#FF0000">
 *  <override value="#FF00F2">
 *    <varianted-value variantUuids="urXIBjAV77e0" value="yellow"/>
 *    <varianted-value variantUuids="czWZnfsRHMAB" value="blue"/>
 *  </override>
 * </token>
 */
function buildTokenXmlBody(
  token: StyleToken | StyleTokenOverride,
  allFinalTokens: ReadonlyArray<FinalToken<StyleToken>>,
  opts: {
    override?: StyleTokenOverride | null;
    fromProject?: string;
  } = {}
): XmlObject[] | { _attr: XmlAttrs } {
  const attrs: XmlAttrs = {};
  if (isKnownStyleToken(token)) {
    attrs.name = token.name;
    attrs.uuid = token.uuid;
    attrs.type = token.type;
  }
  if (token.value != null) {
    attrs.value = token.value;
    if (isTokenRef(token.value)) {
      attrs.resolvedValue = derefTokenRefs(allFinalTokens, token.value);
    }
  }

  const children: XmlObject[] = [];
  for (const vv of token.variantedValues) {
    children.push({
      "varianted-value": {
        _attr: buildVariantedValueAttrs(vv, allFinalTokens),
      },
    });
  }
  if (opts.override) {
    children.push({
      override: buildTokenXmlBody(opts.override, allFinalTokens),
    });
  }

  if (opts.fromProject) {
    attrs.fromProject = opts.fromProject;
  }

  if (children.length === 0) {
    return { _attr: attrs };
  }
  return [{ _attr: attrs }, ...children];
}

function buildVariantedValueAttrs(
  vv: VariantedValue,
  allFinalTokens: ReadonlyArray<FinalToken<StyleToken>>
): XmlAttrs {
  const attrs: XmlAttrs = {
    variantUuids: vv.variants.map((v) => v.uuid).join(","),
    value: vv.value,
  };
  if (isTokenRef(vv.value)) {
    attrs.resolvedValue = derefTokenRefs(allFinalTokens, vv.value);
  }
  return attrs;
}

/**
 * Serialize a single animation sequence to XML with its full @keyframes
 * rule as text content.
 */
export function serializeAnimationSequence(
  sequence: AnimationSequence
): string {
  return toXml({
    animation: [
      { _attr: { name: sequence.name, uuid: sequence.uuid } },
      indentXmlTextBlock(generateKeyframesRule(sequence), 0),
    ],
  });
}

/**
 * Serialize an invalid/missing resource reference to XML.
 */
export function serializeInvalidResource(
  uuid: string,
  type:
    | "component"
    | "token"
    | "tpl"
    | "globalVariant"
    | "variantGroup"
    | "variant"
    | "variantedValue"
    | "animation",
  message: string
): string {
  return toXml({ "invalid-resource": [{ _attr: { uuid, type } }, message] });
}
