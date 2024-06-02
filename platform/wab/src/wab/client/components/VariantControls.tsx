import { Component, isKnownTplTag, Variant } from "@/wab/classes";
import {
  SelectorsInput,
  SelectorTags,
} from "@/wab/client/components/sidebar/RuleSetControls";
import S from "@/wab/client/components/VariantControls.module.scss";
import Button from "@/wab/client/components/widgets/Button";
import {
  EditableLabel,
  EditableLabelHandles,
} from "@/wab/client/components/widgets/EditableLabel";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, spawn } from "@/wab/common";
import { InlineEdit } from "@/wab/commons/components/InlineEdit";
import { VARIANT_CAP, VARIANT_LOWER } from "@/wab/shared/Labels";
import {
  isBaseVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isStyleVariant,
  makeVariantName,
} from "@/wab/shared/Variants";
import { isTplCodeComponent, isTplTag } from "@/wab/tpls";
import { Menu } from "antd";
import { default as classNames, default as cn } from "classnames";
import { sumBy } from "lodash";
import { observer } from "mobx-react";
import React, {
  forwardRef,
  ForwardRefRenderFunction,
  useEffect,
  useState,
} from "react";

type VariantLabelProps = {
  variant: Variant;
  superComp?: Component;
  isRecording?: boolean;
  programmaticallyTriggered?: boolean;
  className?: string;
  inputBoxClassName?: string;
  onRenamed?: (name: string) => void;
  defaultEditing?: boolean;
  doubleClickToEdit?: boolean;
};
const VariantLabel_: ForwardRefRenderFunction<
  EditableLabelHandles,
  VariantLabelProps
> = (
  {
    variant,
    superComp,
    onRenamed,
    className,
    inputBoxClassName,
    defaultEditing,
    doubleClickToEdit,
    isRecording,
    programmaticallyTriggered,
  }: VariantLabelProps,
  ref: React.Ref<EditableLabelHandles>
) => {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.focusedViewCtx()!;
  const focusedTpl = viewCtx?.focusedTpl();

  const variantName = (() => {
    return makeVariantName({
      variant,
      superComp,
      ...(isTplTag(focusedTpl) && { focusedTag: focusedTpl }),
    });
  })();

  const _onRename = (newName: string) => {
    spawn(
      studioCtx.changeUnsafe(() => {
        studioCtx.siteOps().tryRenameVariant(variant, newName);
        onRenamed?.(newName);
      })
    );
  };

  return (
    <EditableLabel
      ref={ref}
      value={variantName}
      disabled={isBaseVariant(variant) || isStyleVariant(variant)}
      onEdit={_onRename}
      defaultEditing={defaultEditing}
      programmaticallyTriggered={programmaticallyTriggered}
      doubleClickToEdit={doubleClickToEdit}
      inputBoxClassName={cn(
        S.variantLabelInput,
        {
          [S.variantLabelInput__recording]: isRecording,
        },
        inputBoxClassName
      )}
      inputBoxPlaceholder={`${VARIANT_CAP} name`}
    >
      <span className={className}>{variantName}</span>
    </EditableLabel>
  );
};

export const VariantLabel = observer(forwardRef(VariantLabel_));

export function makeCanvasVariantContextMenu({
  studioCtx,
  variant,
  onRequestEditing,
  component,
}: {
  studioCtx: StudioCtx;
  variant: Variant;
  onRequestEditing: () => void;
  component: Component;
}) {
  return (
    <Menu>
      <Menu.Item onClick={onRequestEditing}>
        {isStyleVariant(variant)
          ? `Change ${VARIANT_LOWER} selectors`
          : `Rename ${VARIANT_LOWER}`}
      </Menu.Item>
      <Menu.Item
        onClick={() =>
          studioCtx.changeUnsafe(() => {
            if (isGlobalVariant(variant)) {
              spawn(studioCtx.siteOps().removeGlobalVariant(variant));
            } else {
              spawn(studioCtx.siteOps().removeVariant(component, variant));
            }
          })
        }
      >
        Delete {VARIANT_LOWER}
      </Menu.Item>
    </Menu>
  );
}

export const StyleVariantEditor = observer(function StyleVariantEditor_({
  component,
  onDismiss,
  variant,
}: {
  variant: Variant;
  component: Component;
  onDismiss?: (selectors: string[]) => void;
}) {
  const [chosenSelectors, setChosenSelectors] = useState<string[]>([]);
  const studioCtx = useStudioCtx();

  const maybeSubmit = async (opts?: { force?: boolean }) => {
    if (chosenSelectors.length || opts?.force) {
      return studioCtx.changeUnsafe(() => {
        variant.selectors = chosenSelectors;
        onDismiss?.(chosenSelectors);

        if (isStyleVariant(variant) && variant.selectors?.length === 0) {
          spawn(studioCtx.siteOps().removeVariant(component, variant));
        }
      });
    }
  };

  const maybeSubmitRef = React.useRef(maybeSubmit);
  maybeSubmitRef.current = maybeSubmit;

  useEffect(
    () => () => {
      spawn(maybeSubmitRef.current({ force: true }));
    },
    []
  );

  useEffect(() => {
    setChosenSelectors(variant.selectors || []);
  }, [variant.selectors?.join(",")]);

  const tplRoot = component.tplTree;

  return (
    <div
      style={{
        minWidth: Math.max(230, sumBy(chosenSelectors, "length") * 7 + 100),
      }}
      className={S.styleVariantEditor}
      onClick={(e) => e.stopPropagation()}
    >
      <SelectorsInput
        autoFocus={true}
        selectors={chosenSelectors}
        onChange={(sels) => setChosenSelectors(sels)}
        forPrivateStyleVariant={false}
        forTag={isKnownTplTag(tplRoot) ? tplRoot.tag : "div"}
        className="textbox--listitem focused-input-bg"
        focusedClassName="focused"
        forRoot={true}
        codeComponent={
          isTplCodeComponent(tplRoot) ? tplRoot.component : undefined
        }
      />
      <Button
        data-test-id="variant-selector-button"
        type={"primary"}
        disabled={chosenSelectors.length === 0}
        onClick={async (e) => {
          e.preventDefault();
          return maybeSubmit();
        }}
      >
        Done
      </Button>
    </div>
  );
});

export const StyleVariantLabel = observer(forwardRef(StyleVariantLabel_));
function StyleVariantLabel_(
  props: {
    defaultEditing?: boolean;
    overrideSelectors?: any[];
    variant: Variant;
    forTag: string;
    onSelectorsChange: (selectors: string[]) => void;
    onBlur?: () => void;
    forRoot?: boolean;
  },
  ref: React.Ref<EditableLabelHandles>
) {
  const { defaultEditing, variant, forTag, onSelectorsChange, forRoot } = props;
  const selectors = props.overrideSelectors ?? ensure(variant.selectors);
  const isPrivate = isPrivateStyleVariant(variant);
  return (
    <div
      className={classNames({
        "flex-fill": true,
      })}
    >
      <InlineEdit
        defaultEditing={defaultEditing}
        ref={ref}
        render={({ editing, onStart, onDone }) =>
          !editing ? (
            <div onDoubleClick={onStart}>
              <SelectorTags selectors={selectors} />
            </div>
          ) : (
            <SelectorsInput
              autoFocus={true}
              selectors={selectors}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => {
                props.onBlur && props.onBlur();
                onDone();
              }}
              onChange={(sels) => {
                onSelectorsChange(sels);
              }}
              forPrivateStyleVariant={isPrivate}
              forTag={forTag}
              className="textbox--listitem focused-input-bg"
              focusedClassName="focused"
              forRoot={forRoot}
            />
          )
        }
      />
    </div>
  );
}
