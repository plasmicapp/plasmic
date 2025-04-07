import { COMMANDS } from "@/wab/client/commands/command";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import promptForMetadata from "@/wab/client/components/modals/ComponentMetadataModal";
import { ComponentPropModal } from "@/wab/client/components/modals/ComponentPropModal";
import { BoolPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/BoolPropEditor";
import { updateOrCreateExpr } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { IFrameAwareDropdownMenu } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import {
  MetadataTooltip,
  PropsTooltip,
} from "@/wab/client/components/widgets/DetailedTooltips";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { VERT_MENU_ICON } from "@/wab/client/icons";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { wabTypeToPropType } from "@/wab/shared/code-components/code-components";
import { toVarName } from "@/wab/shared/codegen/util";
import { spawn } from "@/wab/shared/common";
import {
  addOrEditComponentMetadata,
  canDeleteParam,
  canRenameParam,
  getRealParams,
  isCodeComponent,
  isReusableComponent,
  removeComponentMetadata,
  removeComponentParam,
} from "@/wab/shared/core/components";
import { extractLit } from "@/wab/shared/core/states";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import {
  Component,
  ComponentTemplateInfo,
  isKnownFunctionType,
  Param,
} from "@/wab/shared/model/classes";
import { typeDisplayName } from "@/wab/shared/model/model-util";
import { getSlotParams } from "@/wab/shared/SlotUtils";
import { Menu, notification, Tooltip } from "antd";
import { observer } from "mobx-react";
import React from "react";

export const LegacyComponentParamsSection = observer(
  function ComponentParamsPanel(props: {
    studioCtx: StudioCtx;
    component: Component;
    metaDataOnly?: boolean;
    justOneSection?: "variants" | "slots" | "meta";
  }) {
    const { studioCtx, component, justOneSection, metaDataOnly } = props;
    const [showNewParamModal, setShowNewParamModal] = React.useState(false);

    const slotParams = getSlotParams(component);
    const realParams = getRealParams(component);
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
                      COMMANDS.component.settings.setEditableByContentEditor.execute(
                        studioCtx,
                        { value: val },
                        {
                          component,
                        }
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
                      COMMANDS.component.settings.setHiddenFromContentEditor.execute(
                        studioCtx,
                        { value: val },
                        {
                          component,
                        }
                      )
                    );
                  }}
                  value={component.hiddenFromContentEditor}
                />
              </div>
            </>
          ) : null}

          {studioCtx.appCtx.appConfig.focusable &&
            isReusableComponent(component) && (
              <div className="SidebarSectionListItem justify-between">
                <div className="labeled-item__label">
                  <LabelWithDetailedTooltip
                    tooltip={() =>
                      "User of the studio must select this component element first before selecting any of its slot contents. Useful for components like Button, where the user is much more likely to intend to select the Button itself than its label."
                    }
                  >
                    Selected before slot contents
                  </LabelWithDetailedTooltip>
                </div>
                <BoolPropEditor
                  onChange={(val) => {
                    spawn(
                      COMMANDS.component.settings.setTrapFocus.execute(
                        studioCtx,
                        { value: val },
                        {
                          component,
                        }
                      )
                    );
                  }}
                  value={component.trapsFocus}
                />
              </div>
            )}

          {!metaDataOnly &&
            component.variantGroups.length > 0 &&
            shown.variants && (
              <ParamsSection
                title="Variants"
                studioCtx={studioCtx}
                component={component}
                params={component.variantGroups.map((vg) => vg.param)}
              />
            )}
          {!metaDataOnly && slotParams.length > 0 && shown.slots && (
            <ParamsSection
              title="Slots"
              studioCtx={studioCtx}
              component={component}
              params={slotParams}
            />
          )}
          {Object.keys(metadata).length > 0 && shown.keyValue && (
            <MetadataSection
              studioCtx={studioCtx}
              title={"Key-value Metadata"}
              component={component}
            />
          )}
          {!metaDataOnly && realParams.length > 0 && shown.meta && (
            <ParamsSection
              title={justOneSection === "meta" ? "" : "Others"}
              studioCtx={studioCtx}
              component={component}
              params={realParams}
              showType={true}
              showDefault={true}
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
        {!metaDataOnly && (
          <Button
            className="spaced-above"
            onClick={() => setShowNewParamModal(true)}
          >
            <LabelWithDetailedTooltip tooltip={PropsTooltip}>
              Create prop
            </LabelWithDetailedTooltip>
          </Button>
        )}
        {isAdminTeamEmail(
          studioCtx.appCtx.selfInfo?.email,
          studioCtx.appCtx.appConfig
        ) && (
          <LabeledListItem
            className="mt-m p0"
            label={
              <Tooltip title="Globally unique name for this template component">
                <span>Template component name</span>
              </Tooltip>
            }
          >
            <Textbox
              styleType="gray"
              defaultValue={component.templateInfo?.name ?? ""}
              onEdit={(value) => {
                spawn(
                  studioCtx.changeUnsafe(() => {
                    if (value.trim() === "") {
                      component.templateInfo = null;
                    } else if (component.templateInfo) {
                      component.templateInfo.name = value;
                    } else {
                      component.templateInfo = new ComponentTemplateInfo({
                        name: value,
                        projectId: undefined,
                        componentId: undefined,
                      });
                    }
                  })
                );
              }}
            />
          </LabeledListItem>
        )}
        <p style={{ userSelect: "text", marginTop: 16, color: "#bbb" }}>
          <small>ID: {component.uuid}</small>
        </p>
        {showNewParamModal && (
          <ComponentPropModal
            studioCtx={studioCtx}
            component={component}
            visible={showNewParamModal}
            centeredModal={true}
            onFinish={() => setShowNewParamModal(false)}
          />
        )}
      </SidebarSection>
    );
  }
);

function ParamsSection(props: {
  title: React.ReactNode;
  studioCtx: StudioCtx;
  component: Component;
  params: Param[];
  showType?: boolean;
  showDefault?: boolean;
}) {
  const { studioCtx, component, params, showType, showDefault, title } = props;
  return (
    <div>
      <div className="dimfg uppercase strong text-sm">{title}</div>
      <div className="vlist-gap-sm vlist-gray-border">
        {params.map((param) => (
          <ParamRow
            studioCtx={studioCtx}
            component={component}
            param={param}
            showType={showType}
            showDefault={showDefault}
          />
        ))}
      </div>
    </div>
  );
}

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

const ParamRow = observer(function ParamRow(props: {
  studioCtx: StudioCtx;
  component: Component;
  param: Param;
  children?: React.ReactNode;
  showType?: boolean;
  showDefault?: boolean;
}) {
  const { studioCtx, component, param, showType, showDefault } = props;

  const defaultLit = extractLit(param);

  const overlay = () => makeParamMenu(studioCtx, component, param);
  const canRename = canRenameParam(component, param);
  return (
    <div>
      <WithContextMenu
        className="SidebarSectionListItem group p0"
        overlay={overlay}
      >
        <EditableLabel
          value={param.variable.name}
          onEdit={(val) => {
            spawn(
              studioCtx.changeUnsafe(() =>
                studioCtx.tplMgr().renameParam(component, param, val)
              )
            );
          }}
          labelFactory={(_props) => (
            <span {..._props} className="flex-fill mr-sm text-ellipsis code" />
          )}
          doubleClickToEdit
          disabled={!canRename}
        />
        {showType && (
          <div className="dimfg">(Type: {typeDisplayName(param.type)})</div>
        )}
        <IFrameAwareDropdownMenu menu={overlay}>
          <div className="SidebarSectionListItem__actionIcon">
            {VERT_MENU_ICON}
          </div>
        </IFrameAwareDropdownMenu>
      </WithContextMenu>
      {showDefault && !isKnownFunctionType(param.type) && (
        <div className="SidebarSectionListItem">
          <LabeledItemRow
            label={<div className="dimfg">Default:</div>}
            labelSize="small"
          >
            <PropValueEditor
              attr={param.variable.name}
              label={param.variable.name}
              propType={wabTypeToPropType(param.type)}
              value={defaultLit}
              disabled={false}
              onChange={(val) => {
                if (defaultLit === undefined && val === undefined) {
                  return;
                }

                spawn(
                  studioCtx.change(({ success }) => {
                    param.defaultExpr = updateOrCreateExpr(
                      param.defaultExpr,
                      param.type,
                      val,
                      undefined,
                      undefined
                    );
                    return success();
                  })
                );
              }}
            />
          </LabeledItemRow>
        </div>
      )}
    </div>
  );
});

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

function makeParamMenu(
  studioCtx: StudioCtx,
  component: Component,
  param: Param
) {
  return (
    <Menu>
      {/*<Menu.SubMenu title="Set code export type to">*/}
      {/*  {[*/}
      {/*    ParamExportType.External,*/}
      {/*    ParamExportType.Internal,*/}
      {/*    ParamExportType.ToolsOnly,*/}
      {/*  ].map((exportType) => (*/}
      {/*    <Menu.Item*/}
      {/*      key={exportType}*/}
      {/*      onClick={() =>*/}
      {/*        studioCtx.changeUnsafe(() => (param.exportType = exportType))*/}
      {/*      }*/}
      {/*    >*/}
      {/*      {exportType} {param.exportType === exportType ? <FaCheck /> : null}*/}
      {/*    </Menu.Item>*/}
      {/*  ))}*/}
      {/*</Menu.SubMenu>*/}
      {!isCodeComponent(component) && canDeleteParam(component, param) && (
        <Menu.Item
          onClick={() =>
            studioCtx.changeUnsafe(() => {
              removeComponentParam(studioCtx.site, component, param);
            })
          }
        >
          Delete prop
        </Menu.Item>
      )}
    </Menu>
  );
}

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
