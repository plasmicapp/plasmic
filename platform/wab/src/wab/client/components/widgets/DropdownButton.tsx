import {
  IFrameAwareDropdownMenu,
  MenuMaker,
} from "@/wab/client/components/widgets";
import ChevronDownsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__ChevronDownsvg";
import React from "react";
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
