import {
  DefaultListSectionProps,
  PlasmicListSection,
} from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicListSection";
import * as React from "react";

interface ListSectionProps
  extends Omit<DefaultListSectionProps, "collapseState"> {
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  style?: React.CSSProperties;
  actions?: React.ReactNode;
  headerClassName?: string;
  collapsedState?: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}

function ListSection(props: ListSectionProps) {
  const {
    isCollapsible,
    defaultCollapsed,
    actions,
    headerClassName,
    collapsedState,
    ...rest
  } = props;
  const [collapsed, setCollapsed] =
    collapsedState ?? React.useState(isCollapsible ? defaultCollapsed : false);

  const collapseState = isCollapsible
    ? collapsed
      ? "collapsed"
      : "expanded"
    : undefined;
  return (
    <PlasmicListSection
      {...rest}
      collapseState={collapseState}
      listSectionHeader={{
        collapseState,
        ...(isCollapsible ? { onToggle: () => setCollapsed(!collapsed) } : {}),
        actions,
        showActions: actions != null ? true : false,
        className: headerClassName,
      }}
    />
  );
}

export default ListSection;
