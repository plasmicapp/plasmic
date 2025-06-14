import RowGroup from "@/wab/client/components/RowGroup";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { observer } from "mobx-react";
import * as React from "react";

export const ComponentFolderRow = observer(function ComponentFolderRow(props: {
  name: string;
  matcher: Matcher;
  groupSize: number;
  indentMultiplier: number;
  isOpen: boolean;
  onAdd?: () => void;
}) {
  const { name, matcher, groupSize, indentMultiplier, isOpen, onAdd } = props;

  return (
    <RowGroup
      style={{
        height: 32,
        paddingLeft: indentMultiplier * 16 + 6,
      }}
      groupSize={groupSize}
      isOpen={isOpen}
      showActions={!!onAdd}
      actions={
        onAdd && (
          <IconButton
            onClick={(e) => {
              if (isOpen) {
                e.stopPropagation();
              }
              onAdd();
            }}
          >
            <Icon icon={PlusIcon} />
          </IconButton>
        )
      }
    >
      {matcher.boldSnippets(name)}
    </RowGroup>
  );
});
