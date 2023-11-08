import L from "lodash";
import * as React from "react";
import { ReactNode, useState } from "react";
import ChevronDownsvgIcon from "../../plasmic/q_4_icons/icons/PlasmicIcon__ChevronDownsvg";
import ChevronLeftsvgIcon from "../../plasmic/q_4_icons/icons/PlasmicIcon__ChevronLeftsvg";
import { IconLinkButton } from "../widgets";
import { Icon } from "../widgets/Icon";
import { SidebarSection } from "./SidebarSection";

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
