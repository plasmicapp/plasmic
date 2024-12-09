import { MenuBuilder } from "@/wab/client/components/menu-builder";
import DataPicker from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { getExpectedValuesForVariantGroup } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import { ClickStopper } from "@/wab/client/components/widgets";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, spawn } from "@/wab/shared/common";
import {
  allCodeComponentVariants,
  allComponentStyleVariants,
  allPrivateStyleVariants,
} from "@/wab/shared/core/components";
import {
  createExprForDataPickerValue,
  extractValueSavedFromDataPicker,
} from "@/wab/shared/core/exprs";
import {
  getAccessTypeDisplayName,
  STATE_ACCESS_TYPES,
  StateAccessType,
} from "@/wab/shared/core/states";
import {
  PRIVATE_STYLE_VARIANTS_CAP,
  VARIANT_GROUP_LOWER,
} from "@/wab/shared/Labels";
import {
  Component,
  ComponentVariantGroup,
  CustomCode,
  isKnownComponentVariantGroup,
  isKnownObjectPath,
  Variant,
  VariantGroup,
} from "@/wab/shared/model/classes";
import {
  getBaseVariant,
  isBaseVariant,
  isCodeComponentVariant,
  isPrivateStyleVariant,
  isScreenVariantGroup,
  isStandaloneVariantGroup,
  isStyleVariant,
} from "@/wab/shared/Variants";
import { Menu, Popover } from "antd";
import React from "react";

export function makeVariantMenu(opts: {
  variant: Variant;
  isStandalone?: boolean;
  component?: Component;
  onRemove?: () => void;
  onMove?: (group: VariantGroup) => void;
  onClone?: () => void;
  onCopyTo?: (variant: Variant) => void;
  onRename?: () => void;
  onEditSelectors?: () => void;
  onChangeAccessType?: (accessType: StateAccessType) => void;
  onEditDynamicValue?: () => void;
  onRemoveDynamicValue?: () => void;
}) {
  const {
    variant,
    component,
    onRemove,
    onMove,
    onClone,
    onCopyTo,
    onRename,
    onEditSelectors,
    onChangeAccessType,
    onEditDynamicValue,
    onRemoveDynamicValue,
  } = opts;
  return () => {
    const builder = new MenuBuilder();

    if (!isBaseVariant(variant)) {
      if (onRename) {
        builder.genSection(undefined, (push) => {
          push(
            <Menu.Item key="rename" onClick={onRename}>
              Rename
            </Menu.Item>
          );
        });
      }

      if (onEditSelectors) {
        builder.genSection(undefined, (push) => {
          push(
            <Menu.Item key="edit-selectors" onClick={onEditSelectors}>
              Edit{" "}
              {isCodeComponentVariant(variant)
                ? "registered keys"
                : "interaction selectors"}
            </Menu.Item>
          );
        });
      }

      builder.genSection(undefined, (push) => {
        if (onClone) {
          push(
            <Menu.Item key="clone" onClick={onClone}>
              Duplicate
            </Menu.Item>
          );
        }

        if (onMove && component && !opts.isStandalone) {
          genMoveToVariantGroupMenu(builder, component, variant, onMove);
        }
      });
    }

    if (onCopyTo && component) {
      genCopyToVariantMenu(builder, component, variant, onCopyTo);
    }

    if (
      opts.isStandalone &&
      isKnownComponentVariantGroup(variant.parent) &&
      onChangeAccessType
    ) {
      const parent = variant.parent;
      builder.genSection(undefined, (push) => {
        push(genSetAccessTypeMenu(parent, onChangeAccessType));
      });
    }

    if (opts.isStandalone && isKnownComponentVariantGroup(variant.parent)) {
      const parent = variant.parent;
      builder.genSection(undefined, (push) => {
        push(
          genDataBindingMenu(parent, {
            onEditDynamicValue,
            onRemoveDynamicValue,
          })
        );
      });
    }

    if (onRemove) {
      builder.genSection(undefined, (push) => {
        push(
          <Menu.Item key="delete" onClick={onRemove}>
            Delete
          </Menu.Item>
        );
      });
    }

    return builder.build({
      menuName: "variant-row-menu",
    });
  };
}

function genMoveToVariantGroupMenu(
  builder: MenuBuilder,
  component: Component,
  variant: Variant,
  onMove: (vg: VariantGroup) => void
) {
  builder.genSub(`Move to`, (push) => {
    const multipleOptionVariantGroups = component.variantGroups.filter(
      (it) => !isStandaloneVariantGroup(it)
    );

    for (const vg of multipleOptionVariantGroups) {
      if (vg !== variant.parent) {
        push(
          <Menu.Item key={vg.uuid} onClick={() => onMove(vg)}>
            {vg.param.variable.name}
          </Menu.Item>
        );
      }
    }
  });
}

function genCopyToVariantMenu(
  builder: MenuBuilder,
  component: Component,
  fromVariant: Variant,
  onCopy: (v: Variant) => void
) {
  const genMenuForVariant = (variant: Variant, push: (x: any) => void) => {
    const isFromVariant = fromVariant === variant;
    push(
      <Menu.Item
        key={variant.uuid}
        onClick={() => !isFromVariant && onCopy(variant)}
        disabled={isFromVariant}
      >
        {isStyleVariant(variant) ? (
          <div className="ml-lg">{variant.selectors.join(", ")}</div>
        ) : isCodeComponentVariant(variant) ? (
          <div className="ml-lg">
            {variant.codeComponentVariantKeys.join(", ")}
          </div>
        ) : (
          variant.name
        )}
      </Menu.Item>
    );
  };

  const genMenuForVariantGroup = (vg: VariantGroup, push: (x: any) => void) => {
    if (isStandaloneVariantGroup(vg)) {
      genMenuForVariant(vg.variants[0], push);
    } else if (vg.variants.length > 0) {
      builder.genSection(vg.param.variable.name, (push2) => {
        vg.variants.forEach((v) => genMenuForVariant(v, push2));
      });
    }
  };

  builder.genSub(`Copy styles to`, (push) => {
    genMenuForVariant(getBaseVariant(component), push);

    if (isPrivateStyleVariant(fromVariant)) {
      builder.genSection(PRIVATE_STYLE_VARIANTS_CAP, (push2) => {
        allPrivateStyleVariants(
          component,
          ensure(
            fromVariant.forTpl,
            'Private style variant is expected to have "forTpl"'
          )
        ).forEach((v) => genMenuForVariant(v, push2));
      });
    }

    builder.genSection(`Component Interaction States`, (push2) => {
      allComponentStyleVariants(component).forEach((v) =>
        genMenuForVariant(v, push2)
      );
    });

    builder.genSection(`Registered Variants`, (push2) => {
      allCodeComponentVariants(component).forEach((v) =>
        genMenuForVariant(v, push2)
      );
    });

    component.variantGroups.forEach((vg) => genMenuForVariantGroup(vg, push));
  });
}

function genSetAccessTypeMenu(
  group: ComponentVariantGroup,
  onChangeAccessType: (accessType: StateAccessType) => void
) {
  const curAccess = group.linkedState?.accessType;
  return (
    <Menu.SubMenu key="access" title="Set external access to">
      {STATE_ACCESS_TYPES.map(
        (accessType) =>
          curAccess !== accessType && (
            <Menu.Item
              key={accessType}
              onClick={() => onChangeAccessType(accessType)}
            >
              {getAccessTypeDisplayName(accessType)}
            </Menu.Item>
          )
      )}
    </Menu.SubMenu>
  );
}

function genDataBindingMenu(
  vg: ComponentVariantGroup,
  {
    onEditDynamicValue,
    onRemoveDynamicValue,
  }: {
    onEditDynamicValue?: () => void;
    onRemoveDynamicValue?: () => void;
  } = {}
) {
  if (vg.linkedState.param.defaultExpr) {
    return (
      <>
        {onEditDynamicValue && (
          <Menu.Item key="change-init-val" onClick={onEditDynamicValue}>
            Change dynamic value
          </Menu.Item>
        )}
        {onRemoveDynamicValue && (
          <Menu.Item key="remove-init-val" onClick={onRemoveDynamicValue}>
            Remove dynamic value
          </Menu.Item>
        )}
      </>
    );
  }

  return (
    onEditDynamicValue && (
      <Menu.Item key="add-init-val" onClick={onEditDynamicValue}>
        Use dynamic value
      </Menu.Item>
    )
  );
}

export function makeVariantGroupMenu(opts: {
  group: VariantGroup;
  onToggleMulti?: () => void;
  onRemove?: () => void;
  onRename?: () => void;
  onChangeAccessType?: (accessType: StateAccessType) => void;
  onEditDynamicValue?: () => void;
  onRemoveDynamicValue?: () => void;
}) {
  const {
    group,
    onToggleMulti,
    onRemove,
    onRename,
    onChangeAccessType,
    onEditDynamicValue,
    onRemoveDynamicValue,
  } = opts;
  return () => {
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      if (onRename) {
        push(
          <Menu.Item key="rename" onClick={onRename}>
            Rename
          </Menu.Item>
        );
      }

      if (onToggleMulti) {
        push(
          <Menu.Item key="change" onClick={onToggleMulti}>
            Change type to{" "}
            <strong>{group.multi ? "single-choice" : "multi-choice"}</strong>{" "}
            group
          </Menu.Item>
        );
      }

      if (isKnownComponentVariantGroup(group) && onChangeAccessType) {
        push(<Menu.Divider />);
        push(genSetAccessTypeMenu(group, onChangeAccessType));
      }

      if (isKnownComponentVariantGroup(group)) {
        push(
          genDataBindingMenu(group, {
            onEditDynamicValue,
            onRemoveDynamicValue,
          })
        );
      }

      if (onRemove && !isScreenVariantGroup(group)) {
        push(<Menu.Divider />);
        push(
          <Menu.Item key="delete" onClick={onRemove}>
            <strong>Delete</strong> {VARIANT_GROUP_LOWER}
          </Menu.Item>
        );
      }
    });

    return builder.build({
      menuName: "variant-group-item-menu",
    });
  };
}

export function VariantDataPicker(props: {
  studioCtx: StudioCtx;
  component: Component;
  group: ComponentVariantGroup;
  children?: React.ReactNode;
  visibleDataPicker: boolean;
  setVisibleDataPicker: (v: boolean) => void;
}) {
  const {
    studioCtx,
    component,
    group,
    children,
    visibleDataPicker,
    setVisibleDataPicker,
  } = props;
  const viewCtx = studioCtx.focusedOrFirstViewCtx();
  const canvasEnv = viewCtx?.getCanvasEnvForTpl(component.tplTree);
  return (
    <ClickStopper>
      <Popover
        content={
          <DataPicker
            value={extractValueSavedFromDataPicker(
              group.linkedState.param.defaultExpr,
              {
                projectFlags: studioCtx.projectFlags(),
                component,
                inStudio: true,
              }
            )}
            onChange={(val) => {
              if (!val) {
                return;
              }

              const newExpr = createExprForDataPickerValue(
                val,
                new CustomCode({ code: "undefined", fallback: undefined })
              );
              spawn(
                studioCtx.change(({ success }) => {
                  group.linkedState.param.defaultExpr = newExpr;
                  return success();
                })
              );

              setVisibleDataPicker(false);
            }}
            onCancel={() => {
              if (
                isKnownObjectPath(group.linkedState.param.defaultExpr) &&
                group.linkedState.param.defaultExpr.path.length === 1 &&
                group.linkedState.param.defaultExpr.path[0] === "undefined"
              ) {
                spawn(
                  studioCtx.change(({ success }) => {
                    group.linkedState.param.defaultExpr = null;
                    return success();
                  })
                );
              }

              setVisibleDataPicker(false);
            }}
            data={canvasEnv}
            schema={studioCtx.customFunctionsSchema()}
            expectedValues={getExpectedValuesForVariantGroup(group)}
          />
        }
        trigger="click"
        visible={visibleDataPicker}
        onVisibleChange={(v) => setVisibleDataPicker(v)}
        destroyTooltipOnHide={true}
        overlayClassName="data-picker-popover-overlay"
      >
        {children}
      </Popover>
    </ClickStopper>
  );
}
