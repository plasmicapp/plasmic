import {
  IFrameAwareDropdownMenu,
  MenuMaker,
} from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import ChevronDownsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__ChevronDownsvg";
import React from "react";

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
