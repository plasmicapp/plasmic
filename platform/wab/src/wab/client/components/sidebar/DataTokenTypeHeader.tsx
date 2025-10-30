import { useDataTokenControls } from "@/wab/client/components/sidebar/LeftGeneralDataTokensPanel";
import PlasmicTokenTypeHeader, {
  DefaultTokenTypeHeaderProps,
} from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicTokenTypeHeader";
import { DataTokenType, dataTypes } from "@/wab/commons/DataToken";
import { MultiChoiceArg } from "@plasmicapp/react-web";
import * as React from "react";

interface DataTokenTypeHeaderProps extends DefaultTokenTypeHeaderProps {
  category: DataTokenType;
  isExpanded?: boolean;
  toggleExpand: () => void;
  groupSize?: number;
}

const PREVIOUS_CATEGORIES: Record<DataTokenType, DataTokenType> = {
  string: "string",
  number: "string",
  any: "number",
};

function DataTokenTypeHeader(props: DataTokenTypeHeaderProps) {
  const { isExpanded, category, toggleExpand, groupSize, ...rest } = props;
  const tokenControls = useDataTokenControls();

  React.useEffect(() => {
    tokenControls.setExpandedHeaders((set) => {
      if (isExpanded && !set.has(category as any)) {
        set.add(category as any);
      } else if (!isExpanded && set.has(category as any)) {
        set.delete(category as any);
      } else {
        return set;
      }

      return new Set(set);
    });
  }, [isExpanded]);

  const borders: MultiChoiceArg<"bottom" | "top"> = [
    "bottom" as const,
    ...(category !== "string" &&
    tokenControls.expandedHeaders.has(PREVIOUS_CATEGORIES[category] as any)
      ? ["top" as const]
      : []),
  ];

  return (
    <PlasmicTokenTypeHeader
      tokenType={dataTypes[category].label}
      addButton={{ render: () => null }}
      isExpanded={isExpanded}
      border={borders}
      groupSize={groupSize}
      {...rest}
    />
  );
}

export default DataTokenTypeHeader;
