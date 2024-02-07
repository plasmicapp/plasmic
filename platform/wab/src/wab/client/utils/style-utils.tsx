import { ExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { isGlobalVariant } from "@/wab/shared/Variants";

export const isStylePropSet =
  (expsProvider: ExpsProvider) =>
  (...properties: string[]) =>
    properties.some(
      (prop) => expsProvider.definedIndicator(prop).source !== "none"
    );

export const makeVariantedStylesHelperFromCurrentCtx = (
  studioCtx: StudioCtx
) => {
  const vc = makeVariantsController(studioCtx);
  return new VariantedStylesHelper(
    studioCtx.site,
    vc?.getActiveNonBaseVariants().filter((v) => isGlobalVariant(v)),
    vc?.getTargetedVariants().filter((v) => isGlobalVariant(v))
  );
};
