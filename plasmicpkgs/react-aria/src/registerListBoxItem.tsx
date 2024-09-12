import { PlasmicElement } from "@plasmicapp/host";
import React, { useEffect, useState } from "react";
import { ListBox, ListBoxItem } from "react-aria-components";
import { PlasmicListBoxContext } from "./contexts";
import { DESCRIPTION_COMPONENT_NAME } from "./registerDescription";
import { TEXT_COMPONENT_NAME } from "./registerText";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

const LIST_BOX_ITEM_VARIANTS = [
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
  "selected" as const,
  "disabled" as const,
];

const { variants, withObservedValues } = pickAriaComponentVariants(
  LIST_BOX_ITEM_VARIANTS
);

export interface BaseListBoxControlContextData {
  hasDuplicateId: boolean;
}

export interface BaseListBoxItemProps
  extends React.ComponentProps<typeof ListBoxItem>,
    HasControlContextData<BaseListBoxControlContextData>,
    WithVariants<typeof LIST_BOX_ITEM_VARIANTS> {
  id?: string;
  children?: React.ReactNode;
}

export function BaseListBoxItem(props: BaseListBoxItemProps) {
  const { children, setControlContextData, updateVariant, id, ...rest } = props;
  const listboxContext = React.useContext(PlasmicListBoxContext);
  const isStandalone = !listboxContext;

  /**
   * Ids of each listboxitem inside a listbox have to be unique. Otherwise, the items won't show up in the listbox.
   * This is particularly important to ensure, because the most common use case would be to apply Repeat Element to the listbox item.
   * The ids of each repeated item will initially be the same (until the user changes the id prop of the listboxitem).
   *
   * The registerId, therefore, is the unique id of the listboxitem.
   * It is the id registered with the listbox context, so that it can auto-generate a unique id if it identifies a duplicate.
   */
  const [registeredId, setRegisteredId] = useState<string | undefined>();

  useEffect(() => {
    if (!listboxContext) {
      return;
    }

    const localId = listboxContext.idManager.register(id);
    setRegisteredId(localId);

    return () => {
      listboxContext.idManager.unregister(localId);
      setRegisteredId(undefined);
    };
  }, [id]);

  setControlContextData?.({
    // this means that a unique id was registered, different from the provided id
    hasDuplicateId: !isStandalone && id !== registeredId,
  });

  const listboxItem = (
    <ListBoxItem key={registeredId} id={registeredId} {...rest}>
      {({
        isHovered,
        isPressed,
        isFocused,
        isFocusVisible,
        isSelected,
        isDisabled,
      }) =>
        withObservedValues(
          children,
          {
            hovered: isHovered,
            pressed: isPressed,
            focused: isFocused,
            focusVisible: isFocusVisible,
            selected: isSelected,
            disabled: isDisabled,
          },
          updateVariant
        )
      }
    </ListBoxItem>
  );

  if (isStandalone) {
    // selection mode needs to be single/multiple to be able to trigger hover state on it.
    return <ListBox selectionMode="single">{listboxItem}</ListBox>;
  }

  return listboxItem;
}

export const makeDefaultListBoxItemChildren = (
  label: string,
  description?: string
): PlasmicElement => ({
  type: "vbox",
  styles: {
    display: "flex",
    alignItems: "flex-start",
    gap: "2px",
  },
  children: [
    {
      type: "component",
      name: TEXT_COMPONENT_NAME,
      props: {
        slot: "label",
        children: {
          type: "text",
          styles: {
            fontWeight: 500,
          },
          value: label,
        },
      },
    },
    {
      type: "component",
      name: DESCRIPTION_COMPONENT_NAME,
      props: {
        children: {
          type: "text",
          styles: {
            color: "#838383",
          },
          value: description ?? `Some description for ${label}...`,
        },
      },
    },
  ],
});

export function registerListBoxItem(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseListBoxItem>
) {
  return registerComponentHelper(
    loader,
    BaseListBoxItem,
    {
      name: makeComponentName("item"),
      displayName: "Aria ListBoxItem",
      importPath: "@plasmicpkgs/react-aria/skinny/registerListBoxItem",
      importName: "BaseListBoxItem",
      variants,
      props: {
        id: {
          type: "string",
          description: "The id of the item",
          required: true,
          validator: (_value, _props, ctx) => {
            if (ctx?.hasDuplicateId) {
              return "Please make sure the id is unique!";
            }
            return true;
          },
        },
        textValue: {
          type: "string",
          description:
            "A text representation of the item's contents, used for features like typeahead.",
        },
        children: {
          type: "slot",
          defaultValue: makeDefaultListBoxItemChildren("Item"),
        },
      },
    },
    overrides
  );
}
