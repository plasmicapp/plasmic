import { SelectInput } from "@/wab/client/components/QueryBuilder/Components/SelectInput";
import { ConjsProps } from "@react-awesome-query-builder/antd";
import React from "react";

type Props = React.Attributes & ConjsProps;

const _negationOptions = {
  match: { key: "match", label: "Match" },
  dontMatch: { key: "dontMatch", label: "Skip" },
};
const _negationOptionsArray = Object.values(_negationOptions);

export function GroupHeader(props: Props) {
  const { conjunctionOptions = {}, config } = props;
  const showNot = config?.settings?.showNot !== false;

  const conjunctions = Object.keys(conjunctionOptions).map(
    (key: keyof typeof conjunctionOptions) => {
      const item = conjunctionOptions[key];
      return {
        label: item.label,
        key: item.key,
      };
    }
  );

  return (
    <div>
      {/* {props?.id} */}
      <span className="group-prefix">and&nbsp;</span>
      {showNot ? (
        <SelectInput
          className={`not-selector ${props.not ? "is-active" : "is-inactive"}`}
          items={_negationOptionsArray}
          value={
            props.not
              ? _negationOptions.dontMatch.key
              : _negationOptions.match.key
          }
          onValueChanged={(value) => {
            props.setNot(
              value === _negationOptions.dontMatch.key ? true : false
            );
          }}
          hideArrow={true}
        />
      ) : (
        <span>Match</span>
      )}

      {conjunctions.length > 1 ? (
        <SelectInput
          className="conjunction-selector"
          items={conjunctions}
          value={props.selectedConjunction}
          onValueChanged={(value) => props.setConjunction(value)}
          hideArrow={true}
        />
      ) : (
        <span>{conjunctions[0].label.toLowerCase()}</span>
      )}

      <span>of the following conditions</span>
      {/* <pre>{JSON.stringify(props, null, 2)}</pre> */}
    </div>
  );
}
