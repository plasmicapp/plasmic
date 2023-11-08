import { Popover } from "antd";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Component, Variant } from "../../../../classes";
import {
  DefaultVariantBadgeProps,
  PlasmicVariantBadge,
} from "../../../plasmic/plasmic_kit_variants_bar/PlasmicVariantBadge";
import { maybeShowContextMenu } from "../../ContextMenu";
import {
  makeCanvasVariantContextMenu,
  StyleVariantEditor,
  VariantLabel,
} from "../../VariantControls";
import { EditableLabelHandles } from "../../widgets/EditableLabel";
import styles from "./VariantBadge.module.scss";
import { useStudioCtx } from "../../../studio-ctx/StudioCtx";
import { isStyleVariant } from "../../../../shared/Variants";
import { MaybeWrap } from "../../../../commons/components/ReactUtil";

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
      if (isStyleVariant(variant)) {
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
                if (isStyleVariant(variant)) {
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
        cond={isStyleVariant(variant)}
        wrapper={(children) => (
          <Popover
            placement="left"
            transitionName=""
            visible={showStyleVariantEditor}
            content={() => (
              <StyleVariantEditor
                variant={variant}
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
