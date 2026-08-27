import { replaceAllTokenRefs } from "@/wab/commons/StyleToken";
import { BackgroundLayer } from "@/wab/shared/core/bg-styles";
import {
  siteFinalColorTokens,
  siteFinalStyleTokensAllDeps,
  TokenValueResolver,
} from "@/wab/shared/core/site-style-tokens";
import { allMixins } from "@/wab/shared/core/sites";
import { CssVarResolver } from "@/wab/shared/core/styles";
import { Site } from "@/wab/shared/model/classes";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";

export const resolvedBackgroundImageCss = (
  bgImg: BackgroundLayer["image"],
  clientTokenResolver: TokenValueResolver,
  site: Site,
  vsh?: VariantedStylesHelper
) => {
  let cssValue = bgImg.showCss();

  // First try resolving with client token resolver.
  // Client token resolver is needed for registered style tokens that have a selector.
  cssValue = replaceAllTokenRefs(cssValue, (tokenId) => {
    const token = siteFinalColorTokens(site, {
      includeDeps: "all",
    }).find((t) => t.uuid === tokenId);
    if (token) {
      return clientTokenResolver(token, vsh);
    } else {
      return undefined;
    }
  });

  const resolver = new CssVarResolver(
    siteFinalStyleTokensAllDeps(site),
    allMixins(site, { includeDeps: "all" }),
    site.imageAssets,
    site.activeTheme,
    {},
    vsh
  );
  return resolver.resolveTokenRefs(cssValue);
};
