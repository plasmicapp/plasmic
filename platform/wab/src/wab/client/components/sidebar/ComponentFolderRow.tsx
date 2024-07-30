import RowGroup from "@/wab/client/components/RowGroup";
import { Matcher } from "@/wab/client/components/view-common";
import { observer } from "mobx-react";
import * as React from "react";

export const ComponentFolderRow = observer(function ComponentFolderRow(props: {
  name: string;
  matcher: Matcher;
  groupSize: number;
  indentMultiplier: number;
  isOpen: boolean;
}) {
  const { name, matcher, groupSize, indentMultiplier, isOpen } = props;

  return (
    <RowGroup
      style={{
        height: 32,
        paddingLeft: indentMultiplier * 16 + 6,
      }}
      groupSize={groupSize}
      isOpen={isOpen}
    >
      {matcher.boldSnippets(name)}
    </RowGroup>
  );
});
