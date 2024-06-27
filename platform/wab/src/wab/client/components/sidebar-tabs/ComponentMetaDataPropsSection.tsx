import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import promptForMetadata from "@/wab/client/components/modals/ComponentMetadataModal";
import { ComponentPropModal } from "@/wab/client/components/modals/ComponentPropModal";
import { BoolPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/BoolPropEditor";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { IFrameAwareDropdownMenu } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { MetadataTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { VERT_MENU_ICON } from "@/wab/client/icons";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import {
  addOrEditComponentMetadata,
  removeComponentMetadata,
} from "@/wab/shared/core/components";
import { toVarName } from "@/wab/shared/codegen/util";
import { Component } from "@/wab/shared/model/classes";
import { Menu, notification } from "antd";
import { observer } from "mobx-react";
import React from "react";

export const ComponentMetaDataPropsSection = observer(
  function ComponentMetaDataPropsSection(props: {
    studioCtx: StudioCtx;
    component: Component;
    justOneSection?: "variants" | "slots" | "meta";
  }) {
    const { studioCtx, component, justOneSection } = props;
    const [showNewParamModal, setShowNewParamModal] = React.useState(false);
    const metadata = component.metadata;
    const defaultShown = justOneSection === undefined;
    const shown = {
      variants: defaultShown,
      slots: defaultShown,
      meta: defaultShown,
      keyValue: defaultShown,
    };
    if (justOneSection) {
      shown[justOneSection] = true;
    }
    return (
      <SidebarSection>
        <div className="vlist-gap-m">
          {!studioCtx.contentEditorMode ? (
            <>
              <div className="SidebarSectionListItem justify-between">
                <div className="labeled-item__label">
                  Editable by content editors
                </div>
                <BoolPropEditor
                  onChange={(val) => {
                    spawn(
                      studioCtx.changeUnsafe(
                        () => (component.editableByContentEditor = val)
                      )
                    );
                  }}
                  value={component.editableByContentEditor}
                />
              </div>

              <div className="SidebarSectionListItem justify-between">
                <div className="labeled-item__label">
                  Hidden from content editors
                </div>
                <BoolPropEditor
                  onChange={(val) => {
                    spawn(
                      studioCtx.changeUnsafe(
                        () => (component.hiddenFromContentEditor = val)
                      )
                    );
                  }}
                  value={component.hiddenFromContentEditor}
                />
              </div>
            </>
          ) : null}

          {Object.keys(metadata).length > 0 && shown.keyValue && (
            <MetadataSection
              studioCtx={studioCtx}
              title={"Key-value Metadata"}
              component={component}
            />
          )}
        </div>
        <Button
          className="spaced-above"
          onClick={async (e) => {
            e.stopPropagation();
            const metaKeyAndValue = await promptForMetadata(component);
            if (!metaKeyAndValue) {
              notification.error({
                message: "Fill key and value",
                description: <>You should fill both key and value.</>,
              });
              return;
            }
            const validKey = toVarName(metaKeyAndValue.key);
            if (metaKeyAndValue.key !== validKey) {
              notification.info({
                message: "Key changed to be valid",
                description: (
                  <>
                    <code>{metaKeyAndValue.key}</code> is not a valid key name;
                    renamed to <code>{validKey}</code> instead.
                  </>
                ),
              });
              metaKeyAndValue.key = validKey;
            }
            await studioCtx.changeUnsafe(() => {
              if (metaKeyAndValue.key in component.metadata) {
                notification.error({
                  message: "Existing key",
                  description: (
                    <>
                      <code>{metaKeyAndValue.key}</code> is already a metadata
                      key.
                    </>
                  ),
                });
              } else {
                addOrEditComponentMetadata(
                  component,
                  metaKeyAndValue.key,
                  metaKeyAndValue.value
                );
              }
            });
          }}
        >
          <LabelWithDetailedTooltip tooltip={MetadataTooltip}>
            Add metadata key-value
          </LabelWithDetailedTooltip>
        </Button>
        {showNewParamModal && (
          <ComponentPropModal
            studioCtx={studioCtx}
            component={component}
            visible={showNewParamModal}
            onFinish={() => setShowNewParamModal(false)}
          />
        )}
      </SidebarSection>
    );
  }
);

function MetadataSection(props: {
  studioCtx: StudioCtx;
  title: React.ReactNode;
  component: Component;
}) {
  const { studioCtx, component, title } = props;
  return (
    <div>
      <div className="dimfg uppercase strong text-sm">{title}</div>
      <div className="vlist-gap-sm vlist-gray-border">
        {Object.keys(component.metadata).map((key) => (
          <MetadataRow
            studioCtx={studioCtx}
            component={component}
            metadataKey={key}
          />
        ))}
      </div>
    </div>
  );
}

const MetadataRow = observer(function MetadataRow(props: {
  studioCtx: StudioCtx;
  component: Component;
  metadataKey: string;
  children?: React.ReactNode;
}) {
  const { studioCtx, component, metadataKey } = props;
  const overlay = () => makeMetadataMenu(studioCtx, component, metadataKey);
  return (
    <div>
      <WithContextMenu
        className="SidebarSectionListItem group p0"
        overlay={overlay}
      >
        <EditableLabel
          value={metadataKey}
          onEdit={(newKey) => {
            const validKey = toVarName(newKey);
            if (newKey !== validKey) {
              notification.info({
                message: "Key changed to be valid",
                description: (
                  <>
                    <code>{newKey}</code> is not a valid key name; renamed to{" "}
                    <code>{validKey}</code> instead.
                  </>
                ),
              });
              newKey = validKey;
            }
            spawn(
              studioCtx.changeUnsafe(() => {
                if (newKey !== metadataKey) {
                  if (newKey in component.metadata) {
                    notification.error({
                      message: "Existing key",
                      description: (
                        <>
                          <code>{newKey}</code> is already a metadata key.
                        </>
                      ),
                    });
                  } else {
                    addOrEditComponentMetadata(
                      component,
                      newKey,
                      component.metadata[metadataKey]
                    );
                    removeComponentMetadata(component, metadataKey);
                  }
                }
              })
            );
          }}
          labelFactory={(_props) => (
            <span {..._props} className="flex-fill mr-sm text-ellipsis code" />
          )}
          doubleClickToEdit
        />
        <EditableLabel
          value={component.metadata[metadataKey]}
          onEdit={(newValue) => {
            spawn(
              studioCtx.changeUnsafe(() => {
                addOrEditComponentMetadata(component, metadataKey, newValue);
              })
            );
          }}
          labelFactory={(_props) => (
            <span {..._props} className="flex-fill mr-sm text-ellipsis code" />
          )}
          doubleClickToEdit
        />
        <IFrameAwareDropdownMenu menu={overlay}>
          <div className="SidebarSectionListItem__actionIcon">
            {VERT_MENU_ICON}
          </div>
        </IFrameAwareDropdownMenu>
      </WithContextMenu>
    </div>
  );
});

function makeMetadataMenu(
  studioCtx: StudioCtx,
  component: Component,
  metadataKey: string
) {
  return (
    <Menu>
      <Menu.Item
        onClick={() =>
          studioCtx.changeUnsafe(() => {
            removeComponentMetadata(component, metadataKey);
          })
        }
      >
        Delete metadata
      </Menu.Item>
    </Menu>
  );
}
