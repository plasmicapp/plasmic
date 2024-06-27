import PlasmicExperimentRow from "@/wab/client/plasmic/plasmic_kit_optimize/PlasmicExperimentRow";
import PlasmicExperimentRows from "@/wab/client/plasmic/plasmic_kit_optimize/PlasmicExperimentRows";
import { Split } from "@/wab/shared/model/classes";
import { SplitType } from "@/wab/shared/core/splits";
import { Menu } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

export const ExperimentRows = observer(function ExperimentRows(props: {
  splits: Split[];
  type: SplitType;
  onClick: (_: Split) => void;
  onDelete?: (_: Split) => void;
}) {
  const { splits, type, onClick, onDelete } = props;
  return (
    <PlasmicExperimentRows>
      {splits
        .filter((s) => s.splitType === type)
        .map((split) => (
          <PlasmicExperimentRow
            key={`exp-row-${split.uuid}`}
            title={split.name}
            status={split.status}
            onClick={() => onClick(split)}
            listItem={{
              height: 48,
              menu: onDelete ? (
                <Menu>
                  <Menu.Item onClick={() => onDelete(split)}>Delete</Menu.Item>
                </Menu>
              ) : undefined,
            }}
          />
        ))}
    </PlasmicExperimentRows>
  );
});
