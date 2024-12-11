import { maybeShowContextMenu } from "@/wab/client/components/ContextMenu";
import {
  makeCanvasVariantContextMenu,
  StyleVariantEditor,
  VariantLabel,
} from "@/wab/client/components/VariantControls";
import styles from "@/wab/client/components/canvas/VariantsBar/VariantBadge.module.scss";
import { EditableLabelHandles } from "@/wab/client/components/widgets/EditableLabel";
import {
  DefaultVariantBadgeProps,
  PlasmicVariantBadge,
} from "@/wab/client/plasmic/plasmic_kit_variants_bar/PlasmicVariantBadge";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import {
  isStyleOrCodeComponentVariant,
  StyleVariant,
} from "@/wab/shared/Variants";
import { Component, Variant } from "@/wab/shared/model/classes";
import { Popover } from "antd";
import { observer } from "mobx-react";
import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";

interface VariantBadgeProps extends DefaultVariantBadgeProps {
  variant: Variant;
  onToggle?: (e: React.MouseEvent) => void;
  onUnpin?: () => void;
  superComp?: Component;
  component: Component;
}

const VariantBadge = observer(function VariantBadge_({
  onUnpin,
  onToggle,
  variant,
  superComp,
  component,
  ...props
}: VariantBadgeProps) {
  const studioCtx = useStudioCtx();
  const variantLabelRef = useRef<EditableLabelHandles>(null);
  const [showStyleVariantEditor, setShowStyleVariantEditor] = useState(false);

  useLayoutEffect(() => {
    if (studioCtx.latestVariantCreated === variant) {
      if (isStyleOrCodeComponentVariant(variant)) {
        setShowStyleVariantEditor(true);
      } else {
        variantLabelRef.current?.setEditing(true);
      }
      studioCtx.latestVariantCreated = undefined;
    }
  }, [studioCtx.latestVariantCreated]);

  return (
    <PlasmicVariantBadge
      {...props}
      style={{
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      root={{
        onClick: onToggle,
        onContextMenu: (e: any) => {
          maybeShowContextMenu(
            e,
            makeCanvasVariantContextMenu({
              studioCtx,
              variant,
              component,
              onRequestEditing: () => {
                if (isStyleOrCodeComponentVariant(variant)) {
                  setShowStyleVariantEditor(true);
                } else {
                  variantLabelRef.current?.setEditing(true);
                }
              },
            })
          );
        },
      }}
      removeIcon={{
        onClick: (e) => {
          e.stopPropagation();
          onUnpin?.();
        },
      }}
    >
      <MaybeWrap
        cond={isStyleOrCodeComponentVariant(variant)}
        wrapper={(children) => (
          <Popover
            placement="left"
            transitionName=""
            visible={showStyleVariantEditor}
            content={() => (
              <StyleVariantEditor
                variant={variant as StyleVariant}
                component={component}
                onDismiss={() => setShowStyleVariantEditor(false)}
              />
            )}
          >
            {children}
          </Popover>
        )}
      >
        <VariantLabel
          ref={variantLabelRef}
          programmaticallyTriggered
          inputBoxClassName={styles.variantLabelInput}
          variant={variant}
        />
      </MaybeWrap>
    </PlasmicVariantBadge>
  );
});

export default VariantBadge;
