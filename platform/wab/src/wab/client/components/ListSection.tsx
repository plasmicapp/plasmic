import * as React from "react";
import {
  DefaultListSectionProps,
  PlasmicListSection,
} from "../plasmic/plasmic_kit_design_system/PlasmicListSection";

interface ListSectionProps
  extends Omit<DefaultListSectionProps, "collapseState"> {
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  style?: React.CSSProperties;
  actions?: React.ReactNode;
}

function ListSection(props: ListSectionProps) {
  const { isCollapsible, defaultCollapsed, actions, ...rest } = props;
  const [collapsed, setCollapsed] = React.useState(
    isCollapsible ? defaultCollapsed : false
  );

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
      }}
    />
  );
}

export default ListSection;
