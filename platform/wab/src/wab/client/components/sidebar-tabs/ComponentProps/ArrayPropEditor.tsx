import { PropType } from "@plasmicapp/host";
import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { TplComponent } from "../../../../classes";
import {
  arrayMoveIndex,
  arrayRemoveAt,
  arrayReplaceAt,
  Dict,
} from "../../../../collections";
import { ensure, uncheckedCast } from "../../../../common";
import {
  getPropTypeDefaultValue,
  isPlainObjectPropType,
  StudioPropType,
} from "../../../../shared/code-components/code-components";
import { useStudioCtx } from "../../../studio-ctx/StudioCtx";
import { TutorialEventsType } from "../../../tours/tutorials/tutorials-events";
import { ListBox, ListBoxItem } from "../../widgets";
import {
  ControlExtras,
  PropValueEditorContext,
  usePropValueEditorContext,
} from "../PropEditorRow";
import { ItemFunc, ObjectPropEditor } from "./ObjectPropEditor";

interface ArrayPropEditorProps<Value extends object> {
  subfields: Dict<PropType<unknown>>;
  itemNameFunc?: ItemFunc<Value, string | undefined>;
  canDeleteFunc?: ItemFunc<Value, boolean>;
  tpl: TplComponent;
  ccContextData: any;
  componentPropValues: any;
  controlExtras: ControlExtras;
  onChange: (val: Value[]) => void;
  compositeValue: Value[] | undefined;
  evaluatedValue: Value[] | undefined;
  "data-plasmic-prop": string;
  propType: StudioPropType<any>;
}

export const ArrayPropEditor = observer(function ArrayPropEditor<
  Value extends object
>({
  onChange,
  compositeValue,
  evaluatedValue,
  subfields,
  canDeleteFunc,
  itemNameFunc,
  tpl,
  ccContextData,
  componentPropValues,
  controlExtras,
  "data-plasmic-prop": dataPlasmicProp,
  propType,
}: ArrayPropEditorProps<Value>) {
  const [inspect, setInspect] = useState<number | undefined>(undefined);
  const sc = useStudioCtx();

  function addNewElement() {
    const fromEntries = Object.fromEntries(
      Object.entries(subfields)
        .filter(
          ([_, fieldPropType]) =>
            isPlainObjectPropType(fieldPropType) &&
            "defaultValue" in fieldPropType
        )
        .map(([propName, fieldPropType]) => [
          propName,
          fieldPropType["defaultValue"],
        ])
    );
    onChange([...(compositeValue ?? []), uncheckedCast(fromEntries)]);
    setInspect((compositeValue ?? []).length);
  }

  const valueEditorCtx = usePropValueEditorContext();
  const arrayItemType = ensure(
    isPlainObjectPropType(propType) &&
      propType.type === "array" &&
      propType.itemType !== undefined
      ? propType.itemType
      : undefined,
    `prop type not supported for array prop editor. Found: ${propType}`
  );
  const itemTypeDefaultValue = arrayItemType
    ? getPropTypeDefaultValue(arrayItemType)
    : undefined;

  return (
    <>
      <ListBox
        appendPrepend={"append"}
        addText={"Add item"}
        onReorder={(from, to) => {
          if (compositeValue) {
            onChange(arrayMoveIndex(compositeValue, from, to));
          }
        }}
        onAdd={() => {
          addNewElement();

          sc.tourActionEvents.dispatch({
            type: TutorialEventsType.ArrayPropEditorAddItem,
          });
        }}
        data-test-id={dataPlasmicProp}
      >
        {(evaluatedValue ?? []).map((evaluatedItem, index) => {
          const nextControlExtras: ControlExtras = {
            ...controlExtras,
            path: [...controlExtras.path, index],
            item: evaluatedItem,
          };
          const compositeItem = compositeValue
            ? compositeValue[index]
            : evaluatedItem;
          return (
            <ListBoxItem
              data-test-id={`${dataPlasmicProp}-${index}`}
              key={index}
              mainContent={
                <PropValueEditorContext.Provider
                  value={{
                    ...valueEditorCtx,
                    defaultValue: itemTypeDefaultValue,
                  }}
                >
                  <ObjectPropEditor
                    key={index}
                    componentPropValues={componentPropValues}
                    compositeValue={compositeItem}
                    evaluatedValue={evaluatedItem}
                    fields={subfields}
                    objectNameFunc={itemNameFunc ?? (() => `Item ${index}`)}
                    tpl={tpl}
                    ccContextData={ccContextData}
                    onChange={(newData) => {
                      if (compositeValue) {
                        onChange(
                          arrayReplaceAt(
                            compositeValue,
                            index,
                            uncheckedCast(newData)
                          )
                        );
                      }
                    }}
                    buttonType="seamless"
                    onClose={() => {
                      if (
                        sc.onboardingTourState.flags
                          .keepInspectObjectPropEditorOpen
                      ) {
                        return;
                      }

                      if (inspect === index) {
                        setInspect(undefined);
                      }
                    }}
                    defaultShowModal={index === inspect}
                    controlExtras={nextControlExtras}
                    propType={arrayItemType}
                  />
                </PropValueEditorContext.Provider>
              }
              index={index}
              showDelete={canDeleteFunc?.(
                evaluatedItem,
                componentPropValues,
                ccContextData,
                nextControlExtras
              )}
              onRemove={() => {
                if (compositeValue) {
                  onChange(arrayRemoveAt(compositeValue, index));
                }
              }}
            />
          );
        })}
      </ListBox>
    </>
  );
});
