import { BaseText, registerText } from "./registerText";
import { CodeComponentMetaOverrides, Registerable } from "./utils";

export function registerDescription(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseText>
) {
  registerText(loader, {
    ...overrides,
    displayName: "BaseDescription",
    props: {
      slot: { type: "string", hidden: () => true, defaultValue: "description" },
    },
  });
}
