import { VariantedStylesHelper } from "../../shared/VariantedStylesHelper";
import { isGlobalVariant } from "../../shared/Variants";
import { ExpsProvider } from "../components/style-controls/StyleComponent";
import { makeVariantsController } from "../components/variants/VariantsController";
import { StudioCtx } from "../studio-ctx/StudioCtx";

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
