// Utilities used by generated code
import _classNames from "classnames";
export const classNames = _classNames;
export { omit, pick } from "./common";
export { HTMLElementRefOf, StrictProps } from "./react-utils";
export {
  createPlasmicElementProxy,
  deriveRenderOpts,
  Flex,
  hasVariant,
  makeFragment,
  mergeVariantsWithStates,
  MultiChoiceArg,
  SingleBooleanChoiceArg,
  SingleChoiceArg,
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
export { genTranslatableString, Trans } from "./render/translation";
export { useTrigger } from "./render/triggers";
export * from "./states/helpers";
export {
  $State,
  default as useDollarState,
  useCanvasDollarState,
} from "./states/valtio";
