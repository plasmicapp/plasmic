import { getComponentPresets } from "@/wab/client/code-components/code-presets";
import { createAddComponentPreset } from "@/wab/client/components/studio/add-drawer/AddDrawer";
import AddDrawerItem from "@/wab/client/components/studio/add-drawer/AddDrawerItem";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import { observer } from "mobx-react";
import * as React from "react";

/**
 * Modal for picking a component preset ("component template") when inserting
 * a code component that registers `templates` (e.g. antd5 Modal / Form Item).
 * Opened via `StudioCtx.showPresetsModal`.
 */
export const ComponentPresetsModal = observer(function ComponentPresetsModal() {
  const studioCtx = useStudioCtx();
  const component = studioCtx.getPresetsModalComponent();
  if (!component) {
    return null;
  }
  const items = getComponentPresets(studioCtx, component).map((preset) =>
    createAddComponentPreset(studioCtx, component, preset)
  );
  const onClose = () => studioCtx.hidePresetsModal();
  return (
    <Modal
      visible
      footer={null}
      title={`Component templates for ${getComponentDisplayName(component)}`}
      onCancel={onClose}
    >
      <ul
        className="no-select"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {items.map((item) => (
          <li key={item.key}>
            <button
              aria-label={item.label}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                color: "inherit",
                textAlign: "inherit",
                cursor: "pointer",
              }}
              onClick={() => {
                onClose();
                spawn(studioCtx.tryInsertTplItem(item));
              }}
            >
              <AddDrawerItem variant="card" studioCtx={studioCtx} item={item} />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
});
