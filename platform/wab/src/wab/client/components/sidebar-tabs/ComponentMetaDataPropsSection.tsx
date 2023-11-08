import { Menu, notification } from "antd";
import { observer } from "mobx-react-lite";
import React from "react";
import { Component } from "../../../classes";
import { spawn } from "../../../common";
import {
  addOrEditComponentMetadata,
  removeComponentMetadata,
} from "../../../components";
import { toVarName } from "../../../shared/codegen/util";
import { VERT_MENU_ICON } from "../../icons";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { WithContextMenu } from "../ContextMenu";
import promptForMetadata from "../modals/ComponentMetadataModal";
import { ComponentPropModal } from "../modals/ComponentPropModal";
import { SidebarSection } from "../sidebar/SidebarSection";
import { IFrameAwareDropdownMenu } from "../widgets";
import Button from "../widgets/Button";
import { MetadataTooltip } from "../widgets/DetailedTooltips";
import { EditableLabel } from "../widgets/EditableLabel";
import { LabelWithDetailedTooltip } from "../widgets/LabelWithDetailedTooltip";
import { BoolPropEditor } from "./ComponentProps/BoolPropEditor";

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
