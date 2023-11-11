import { Button as BaseButton } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  Registerable,
  registerComponentHelper,
} from "./utils";

export { BaseButton };

export function registerButton(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseButton>
) {
  registerComponentHelper(
    loader,
    BaseButton,
    {
      name: "plasmic-react-aria-button",
      displayName: "BaseButton",
      importPath: "@plasmicpkgs/react-aria/registerButton",
      importName: "BaseButton",
      props: {
        children: {
          type: "slot",
        },
      },
    },
    overrides
  );
}
