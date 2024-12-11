// Utilities used by generated code
import _classNames from "classnames";
export { PlasmicTranslator } from "@plasmicapp/host";
export {
  PlasmicPageGuard,
  withPlasmicPageGuard,
} from "./auth/PlasmicPageGuard";
export { omit, pick } from "./common";
export { HTMLElementRefOf, StrictProps } from "./react-utils";
export {
  Flex,
  MultiChoiceArg,
  SingleBooleanChoiceArg,
  SingleChoiceArg,
  createPlasmicElementProxy,
  deriveRenderOpts,
  hasVariant,
  makeFragment,
  mergeVariantsWithStates,
  wrapWithClassName,
} from "./render/elements";
export { ensureGlobalVariants } from "./render/global-variants";
export { PlasmicHead, plasmicHeadMeta } from "./render/PlasmicHead";
export { PlasmicIcon } from "./render/PlasmicIcon";
export { PlasmicImg } from "./render/PlasmicImg";
export { PlasmicLink } from "./render/PlasmicLink";
export { PlasmicSlot, renderPlasmicSlot } from "./render/PlasmicSlot";
export { createUseScreenVariants } from "./render/screen-variants";
export {
  PlasmicDataSourceContextProvider,
  PlasmicRootProvider,
  useCurrentUser,
  useIsSSR,
} from "./render/ssr";
export { Stack } from "./render/Stack";
export {
  Trans,
  genTranslatableString,
  usePlasmicTranslator,
} from "./render/translation";
export { useTrigger } from "./render/triggers";
export * from "./states";
// Using any while classnames package is not updated to have the correct types exported
export const classNames: any = _classNames;
