import { Menu } from "antd";
import { observer } from "mobx-react-lite";
import React from "react";
import { FaCheck } from "react-icons/fa";
import { Component, Param } from "../../../classes";
import { spawn } from "../../../common";
import {
  canChangeParamExportType,
  canDeleteParam,
  canRenameParam,
  getRealParams,
  isCodeComponent,
  removeComponentParam,
} from "../../../components";
import { ParamExportType } from "../../../lang";
import { toVarName } from "../../../shared/codegen/util";
import {
  COMPONENT_PROP_LOWER,
  COMPONENT_PROP_PLURAL_CAP,
} from "../../../shared/Labels";
import { getSlotParams } from "../../../shared/SlotUtils";
import PlusIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { WithContextMenu } from "../ContextMenu";
import { ComponentPropModal } from "../modals/ComponentPropModal";
import { SidebarSection } from "../sidebar/SidebarSection";
import { IconLinkButton } from "../widgets";
import { EditableLabel } from "../widgets/EditableLabel";
import { Icon } from "../widgets/Icon";
import { LabeledListItem } from "../widgets/LabeledListItem";
import { ValuePreview } from "./data-tab";

export const ComponentPropsDefinitionSection = observer(
  function ComponentParamsPanel(props: {
    studioCtx: StudioCtx;
    component: Component;
    justOneSection?: "variants" | "slots" | "meta";
  }) {
    const { studioCtx, component } = props;
    const [showNewParamModal, setShowNewParamModal] = React.useState(false);

    const slotParams = getSlotParams(component);
    const realParams = getRealParams(component);

    return (
      <>
        <SidebarSection
          title={COMPONENT_PROP_PLURAL_CAP}
          controls={
            <IconLinkButton
              onClick={() => setShowNewParamModal(true)}
              data-test-id="add-prop-btn"
            >
              <Icon icon={PlusIcon} />
            </IconLinkButton>
          }
          zeroBodyPadding
          emptyBody={!slotParams.length && !realParams.length}
          data-test-id="props-section"
        >
          {realParams.length > 0 && (
            <PropsDefinitionSection
              studioCtx={studioCtx}
              component={component}
              params={realParams}
              showType={true}
              showDefault={true}
            />
          )}
        </SidebarSection>
        {showNewParamModal && (
          <ComponentPropModal
            studioCtx={studioCtx}
            component={component}
            visible={showNewParamModal}
            onFinish={() => setShowNewParamModal(false)}
          />
        )}
      </>
    );
  }
);

function PropsDefinitionSection(props: {
  studioCtx: StudioCtx;
  component: Component;
  params: Param[];
  showType?: boolean;
  showDefault?: boolean;
}) {
  const { studioCtx, component, params, showType, showDefault } = props;
  return (
    <div className="mb-xlg">
      {params.map((param) => (
        <PropRow
          studioCtx={studioCtx}
          component={component}
          param={param}
          showType={showType}
          showDefault={showDefault}
        />
      ))}
    </div>
  );
}

const PropRow = observer(function ParamRow(props: {
  studioCtx: StudioCtx;
  component: Component;
  param: Param;
  children?: React.ReactNode;
  showType?: boolean;
  showDefault?: boolean;
}) {
  const { studioCtx, component, param } = props;

  const viewCtx = studioCtx.focusedViewCtx();
  const maybeState = component.states.find((s) => s.param === param);
  const env = viewCtx?.getCanvasEnvForTpl(component.tplTree);
  const currentValue = maybeState
    ? viewCtx?.getCanvasStateValue(maybeState)
    : env?.$props?.[toVarName(param.variable.name)];

  const [showModal, setShowModal] = React.useState(false);
  const canRename = canRenameParam(component, param);
  const overlay = () =>
    makeParamMenu(studioCtx, component, param, {
      onConfigureParam: () => setShowModal(true),
    });

  return (
    <>
      <WithContextMenu overlay={overlay}>
        <LabeledListItem
          onClick={() => setShowModal(true)}
          label={
            <EditableLabel
              value={param.variable.name}
              onEdit={(val) =>
                spawn(
                  studioCtx.change(({ success }) => {
                    if (val) {
                      studioCtx.tplMgr().renameParam(component, param, val);
                    }
                    return success();
                  })
                )
              }
              disabled={!canRename}
            />
          }
          menu={overlay}
        >
          <ValuePreview val={currentValue} />
        </LabeledListItem>
      </WithContextMenu>
      {showModal && (
        <ComponentPropModal
          visible
          studioCtx={studioCtx}
          component={component}
          existingParam={param}
          onFinish={() => setShowModal(false)}
        />
      )}
    </>
  );
});

function makeParamMenu(
  studioCtx: StudioCtx,
  component: Component,
  param: Param,
  opts: { onConfigureParam: () => void }
) {
  return (
    <Menu>
      <Menu.Item onClick={() => opts.onConfigureParam()}>
        Configure {COMPONENT_PROP_LOWER}
      </Menu.Item>
      {canChangeParamExportType(component, param) && (
        <Menu.SubMenu title="Set code export type to">
          {[
            ParamExportType.External,
            ParamExportType.Internal,
            ParamExportType.ToolsOnly,
          ].map((exportType) => (
            <Menu.Item
              key={exportType}
              onClick={() =>
                studioCtx.changeUnsafe(() => (param.exportType = exportType))
              }
            >
              {exportType}{" "}
              {param.exportType === exportType ? <FaCheck /> : null}
            </Menu.Item>
          ))}
        </Menu.SubMenu>
      )}
      {!isCodeComponent(component) && canDeleteParam(component, param) && (
        <Menu.Item
          onClick={() =>
            studioCtx.changeUnsafe(() => {
              removeComponentParam(studioCtx.site, component, param);
            })
          }
        >
          Delete {COMPONENT_PROP_LOWER}
        </Menu.Item>
      )}
    </Menu>
  );
}
