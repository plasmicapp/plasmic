import React from "react";
import ChevronDownsvgIcon from "../../plasmic/q_4_icons/icons/PlasmicIcon__ChevronDownsvg";
import { IFrameAwareDropdownMenu, MenuMaker } from "../widgets";
import Button from "./Button";
import { Icon } from "./Icon";

export function DropdownButton(
  props: React.ComponentProps<typeof Button> & {
    menu: React.ReactNode | MenuMaker;
  }
) {
  const { menu, ...rest } = props;
  return (
    <IFrameAwareDropdownMenu menu={menu}>
      <Button
        withIcons={"endIcon"}
        endIcon={<Icon icon={ChevronDownsvgIcon} />}
        {...rest}
      />
    </IFrameAwareDropdownMenu>
  );
}
