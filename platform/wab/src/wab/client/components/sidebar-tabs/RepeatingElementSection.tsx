import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import { modelBindingTarget } from "@/wab/client/components/editor-sessions/model-binding-target";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import { StringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { acceptDataDrop } from "@/wab/client/components/sidebar-tabs/DataBinding/data-drop";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { isBaseVariant } from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { ensure, uniqueName, withoutNils } from "@/wab/shared/common";
import { extractValueSavedFromDataPicker } from "@/wab/shared/core/exprs";
import { mkVar } from "@/wab/shared/core/lang";
import { tryGetTplOwnerComponent } from "@/wab/shared/core/tpls";
import { computeDropCollectionExpr } from "@/wab/shared/data-picker/data-drop-compat";
import { ObjectPath, Rep, TplNode } from "@/wab/shared/model/classes";
import { Menu } from "antd";
import { observer } from "mobx-react";
import React from "react";

const defaultElementName = "currentItem";
const defaultIndexName = "currentIndex";

export const RepeatingElementSection = observer(function (props: {
  tpl: TplNode;
  viewCtx: ViewCtx;
}) {
  const { tpl, viewCtx } = props;
  const ownerComponent = tryGetTplOwnerComponent(tpl);
  const [isDataPickerVisible, setIsDataPickerVisible] =
    React.useState<boolean>(false);

  // Although dataRep is in VariantSetting schema, it's not variantable. We
  // just set and use it from the base variant setting (see, for example,
  // serializeDataReps in codegen). Maybe it should be actually be moved out
  // from VariantSetting into TplNode. But while we don't do it, this section
  // just edits the dataRep in baseVs.
  const baseVs = ensure(
    tpl.vsettings.find((vs) => isBaseVariant(vs.variants)),
    "All TplNodes must have a base variant setting",
  );
  const dataRep = baseVs.dataRep;
  const collectionEnv = viewCtx.getCanvasEnvForTpl(tpl, {
    forDataRepCollection: true,
  });

  const resetDataRep = () => {
    viewCtx.change(() => {
      baseVs.dataRep = new Rep({
        collection: new ObjectPath({
          path: ["[2, 3, 4]"],
          fallback: null,
        }),
        element: mkVar(defaultElementName),
        index: mkVar(defaultIndexName),
      });
    });
  };

  return (
    <SidebarSection
      title="Repeat element"
      isHeaderActive={!!dataRep}
      controls={
        !dataRep && (
          <IconLinkButton
            onClick={resetDataRep}
            data-test-id="btn-repeating-element-add"
          >
            <Icon icon={PlusIcon} />
          </IconLinkButton>
        )
      }
      makeHeaderMenu={
        dataRep
          ? () => (
              <Menu>
                <Menu.Item
                  onClick={() => {
                    viewCtx.change(() => {
                      baseVs.dataRep = null;
                    });
                  }}
                >
                  Remove repetition
                </Menu.Item>
              </Menu>
            )
          : undefined
      }
      data-test-id="repeating-element-section"
    >
      {!!dataRep && (
        <>
          <LabeledItemRow
            label="Collection"
            data-test-id="repeating-element-collection"
          >
            <ContextMenuIndicator
              className="fill-width"
              fullWidth
              dataDropTarget={
                collectionEnv
                  ? {
                      accepts: (payload) =>
                        acceptDataDrop(
                          payload,
                          collectionEnv,
                          viewCtx,
                          ["array"],
                          "Repeat collection only accepts arrays",
                        ),
                      onDropData: (payload) => {
                        dataRep.collection = computeDropCollectionExpr(
                          dataRep.collection,
                          payload.path,
                        );
                      },
                    }
                  : undefined
              }
            >
              <DataPickerEditor
                forDataRepCollection
                viewCtx={viewCtx}
                title="Collection"
                target={modelBindingTarget(viewCtx, tpl, baseVs.variants, {
                  kind: "collection",
                })}
                value={
                  extractValueSavedFromDataPicker(dataRep?.collection, {
                    projectFlags: viewCtx.projectFlags(),
                    component: ownerComponent ?? null,
                    inStudio: true,
                  }) ?? ""
                }

                visible={isDataPickerVisible}
                setVisible={setIsDataPickerVisible}
                data={collectionEnv}
                schema={viewCtx.customFunctionsSchema()}
                key={tpl.uid}
                context="Array of elements to then be iterated"
              />
            </ContextMenuIndicator>
          </LabeledItemRow>
          <LabeledItemRow
            label="Element name"
            data-test-id="repeating-element-name"
          >
            <StringPropEditor
              disabled={false}
              onChange={(newElementName) => {
                viewCtx.change(() => {
                  // Ensure element name doesn't collide with index name
                  dataRep.element = mkVar(
                    uniqueName(
                      withoutNils([dataRep.index?.name]),
                      newElementName || defaultElementName,
                      {
                        separator: "",
                        normalize: toVarName,
                      },
                    ),
                  );
                });
              }}
              value={dataRep.element.name}
              leftAligned
            />
          </LabeledItemRow>
          <LabeledItemRow
            label="Index name"
            data-test-id="repeating-element-index-name"
          >
            <StringPropEditor
              disabled={false}
              onChange={(newIndexName) => {
                viewCtx.change(() => {
                  if (newIndexName) {
                    // Ensure index name doesn't collide with element name
                    dataRep.index = mkVar(
                      uniqueName([dataRep.element.name], newIndexName, {
                        separator: "",
                        normalize: toVarName,
                      }),
                    );
                  } else {
                    dataRep.index = null;
                  }
                });
              }}
              value={dataRep.index?.name}
              leftAligned
            />
          </LabeledItemRow>
        </>
      )}
    </SidebarSection>
  );
});
