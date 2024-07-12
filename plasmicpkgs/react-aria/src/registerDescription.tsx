import { BaseText, registerText } from "./registerText";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
} from "./utils";

export const DESCRIPTION_COMPONENT_NAME = makeComponentName("description");

export function registerDescription(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseText>
) {
  return registerText(loader, {
    ...overrides,
    name: DESCRIPTION_COMPONENT_NAME,
    displayName: "Aria Description",
    props: {
      slot: {
        type: "string",
        hidden: () => true,
        defaultValue: "description",
      },
    },
  });
}
