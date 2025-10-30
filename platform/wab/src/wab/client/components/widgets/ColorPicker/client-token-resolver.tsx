import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { StyleTokenValue } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  TokenResolver,
  TokenValueResolver,
  makeTokenResolver,
} from "@/wab/shared/core/site-style-tokens";
import { FinalToken } from "@/wab/shared/core/tokens";
import { StyleToken } from "@/wab/shared/model/classes";

const RE_VARIABLE_REF = /var\((--[^)]+)\)/;

/**
 * Returns a TokenValueResolver that also consults the DOM to dereference
 * css variable references. This is for style tokens whose values
 * are set to `var(--MY-WEIRD-TOKEN)`.
 *
 * The css variable may be resolved from a few different places, and
 * we check in this order:
 *
 * 1. The artboard of the currently-focused ViewCtx
 * 2. The artboard of _any_ ViewCtx in the StudioCtx
 * 3. The parent window (the app host frame containing the studio iframe)
 *
 * We always try to read the css property value from document.documentElement
 * (so, only works for css properties defined via `:root {}`).
 */
export function useClientTokenResolver(): TokenValueResolver {
  const sc = useStudioCtx();
  const vc = sc.focusedViewCtx();
  // depend on first render observable
  vc?.isFirstRenderComplete;
  const resolver = makeTokenResolver(sc.site);
  return makeClientTokenResolver(resolver, vc ?? sc);
}

function extractReferencedVariable(value: string) {
  const m = value.match(RE_VARIABLE_REF);
  return m ? m[1] : undefined;
}
function makeClientTokenResolver(
  resolver: TokenResolver,
  clientCtx: StudioCtx | ViewCtx | undefined
): TokenValueResolver {
  const studioCtx =
    clientCtx instanceof ViewCtx ? clientCtx.studioCtx : clientCtx;
  const viewCtx =
    clientCtx instanceof ViewCtx ? clientCtx : studioCtx?.viewCtxs[0];

  const getTokenElement = (token: StyleToken) => {
    // If viewCtx exists, then use the artboard document. Else, use the parent
    // document; we are in studio frame, so the parent document is the
    // top-level custom host frame.
    const doc = viewCtx ? viewCtx.canvasCtx.doc() : window.parent.document;
    if (token.isRegistered && studioCtx && token.regKey) {
      const reg = studioCtx.getTokenRegistration(token);
      if (reg?.selector) {
        const elt = doc.querySelector(reg.selector);
        if (elt) {
          return elt as HTMLElement;
        }
      }
    }
    return doc.documentElement;
  };
  return (
    token: FinalToken<StyleToken>,
    vsh?: VariantedStylesHelper
  ): StyleTokenValue => {
    const { value, token: resolvedToken } = resolver(token, vsh);
    const refVarName = extractReferencedVariable(value);
    if (!refVarName) {
      return value;
    }

    const elt = getTokenElement(resolvedToken.base);
    const variableValue = getCssVariableValue(elt, refVarName);
    if (variableValue) {
      return variableValue;
    }

    return value;
  };
}

function getCssVariableValue(
  elt: HTMLElement,
  name: string
): StyleTokenValue | undefined {
  const win = elt.ownerDocument.defaultView;
  if (!win) {
    return undefined;
  }
  const value = win.getComputedStyle(elt).getPropertyValue(name).trim();
  return value.length === 0 ? undefined : (value as StyleTokenValue);
}
