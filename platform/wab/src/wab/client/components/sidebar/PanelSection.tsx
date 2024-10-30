import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import ChevronDownsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronDownSvg";
import ChevronLeftsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronLeftSvg";
import L from "lodash";
import * as React from "react";
import { ReactNode, useState } from "react";

interface PanelSectionProps {
  title: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onChangeOpen?: (open: boolean) => void;
  children?: ReactNode | (() => ReactNode);
  emptyBody?: boolean;
  zeroBodyPadding?: boolean;
}

export function PanelSection({
  title,
  open,
  onChangeOpen,
  children,
  defaultOpen = true,
  emptyBody,
  zeroBodyPadding,
}: PanelSectionProps) {
  const [openState, setOpenState] = useState(defaultOpen);
  open = open ?? openState;

  // eslint-disable-next-line @typescript-eslint/no-shadow
  function handleChangeOpen(open: boolean) {
    onChangeOpen?.(open);
    setOpenState(open);
  }

  return (
    <SidebarSection
      title={title}
      controls={
        <IconLinkButton onClick={() => handleChangeOpen(!open)}>
          {open ? (
            <Icon icon={ChevronDownsvgIcon} />
          ) : (
            <Icon icon={ChevronLeftsvgIcon} />
          )}
        </IconLinkButton>
      }
      emptyBody={emptyBody}
      zeroBodyPadding={zeroBodyPadding}
    >
      {open && (L.isFunction(children) ? children() : children)}
    </SidebarSection>
  );
}
