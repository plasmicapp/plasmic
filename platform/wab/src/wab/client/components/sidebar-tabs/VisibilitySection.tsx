import { isTplCodeComponentStyleable } from "@/wab/client/code-components/code-components";
import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import { useAppRoles } from "@/wab/client/components/app-auth/app-auth-contexts";
import { modelBindingTarget } from "@/wab/client/components/editor-sessions/model-binding-target";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { BoolPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/BoolPropEditor";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import { FallbackEditor } from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { acceptDataDrop } from "@/wab/client/components/sidebar-tabs/DataBinding/data-drop";
import S from "@/wab/client/components/sidebar-tabs/VisibilitySection.module.scss";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  LabeledItem,
  LabeledItemRow,
  LabeledStyleDimItem,
  shouldBeDisabled,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  TplExpsProvider,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import { getVisibilityIcon } from "@/wab/client/icons";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  isStylePropSet,
  makeVariantedStylesHelperFromCurrentCtx,
} from "@/wab/client/utils/style-utils";
import { getVisibilityChoicesForTpl } from "@/wab/client/utils/tpl-client-utils";
import { isTokenRef } from "@/wab/commons/StyleToken";
import { RESET_CAP } from "@/wab/shared/Labels";
import {
  isPrivateStyleVariant,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";
import { ensureInstance } from "@/wab/shared/common";
import {
  clone,
  codeLit,
  extractValueSavedFromDataPicker,
  isFallbackSet,
  tryExtractBoolean,
} from "@/wab/shared/core/exprs";
import { isTplCodeComponent } from "@/wab/shared/core/tpls";
import { PERCENTAGE_UNITS } from "@/wab/shared/css/types";
import {
  SCALAR_DATA_TYPES,
  computeDropReplacementExpr,
} from "@/wab/shared/data-picker/data-drop-compat";
import { computeDefinedIndicator } from "@/wab/shared/defined-indicator";
import { CustomCode, ObjectPath, TplNode } from "@/wab/shared/model/classes";
import {
  TplVisibility,
  clearTplVisibility,
  getVisibilityDataProp,
  getVisibilityLabel,
  hasVisibilitySetting,
  setTplVisibility,
} from "@/wab/shared/visibility-utils";
import { Menu } from "antd";
import cn from "classnames";
import { observer } from "mobx-react";
import React from "react";

export const VisibilitySection = observer(VisibilitySection_);

function VisibilitySection_(props: {
  tpl: TplNode;
  viewCtx: ViewCtx;
  expsProvider: TplExpsProvider;
}) {
  const { viewCtx, tpl, expsProvider } = props;

  const noStyles =
    isTplCodeComponent(tpl) &&
    !isTplCodeComponentStyleable(viewCtx.studioCtx.codeComponentsRegistry, tpl);

  const [isDataPickerVisible, setIsDataPickerVisible] =
    React.useState<boolean>(false);

  const styling = useStyleComponent();

  const { roles } = useAppRoles(
    viewCtx.studioCtx.appCtx,
    viewCtx.studioCtx.siteInfo.id,
    true,
  );

  const vtm = viewCtx.variantTplMgr();

  const forVisibility = {
    forVisibility: true,
  };

  const targetVisibilityCombo = vtm.getTargetVariantComboForNode(
    tpl,
    forVisibility,
  );
  const targetVisibilityVs = tryGetVariantSetting(tpl, targetVisibilityCombo);
  const effectiveVs = expsProvider.effectiveVs();
  const sources = effectiveVs.getVisibilitySource();

  const hasPrivateStyleVariant = targetVisibilityCombo.some((v) =>
    isPrivateStyleVariant(v),
  );
  const visibilityDefinedIndicator = computeDefinedIndicator(
    viewCtx.site,
    viewCtx.currentComponent(),
    sources,
    vtm.getTargetIndicatorComboForNode(tpl, forVisibility),
  );

  const vsh = makeVariantedStylesHelperFromCurrentCtx(viewCtx.studioCtx);

  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props: {},
    label: "visibility",
    indicators: [visibilityDefinedIndicator],
  });

  const visibilityChoices = getVisibilityChoicesForTpl(viewCtx, tpl);

  const opacity = effectiveVs.rsh().get("opacity");
  const formattedOpacity = isTokenRef(opacity)
    ? opacity
    : `${Math.round(parseFloat(opacity) * 100)}%`;

  const opacityDefinedIndicator = expsProvider.definedIndicator("opacity");

  const isSet = isStylePropSet(styling.props.expsProvider);

  const handleUnsetVisibility = () =>
    viewCtx.change(() => clearTplVisibility(tpl, targetVisibilityCombo));

  const handleOpacityChange = (val?: string) => {
    const newVal = val?.includes("%")
      ? parseInt(val) / 100
      : parseFloat(val || "0");

    styling.change(() => {
      if (val === undefined || (Number.isNaN(newVal) && !isTokenRef(val))) {
        styling.exp().clear("opacity");
      } else {
        styling
          .exp()
          .set("opacity", val && isTokenRef(val) ? val : String(newVal));
      }
    });
  };

  const switchToDynamicValue = () => {
    _setTplVisibility(TplVisibility.CustomExpr);
    setIsDataPickerVisible(true);
  };

  const visibilityMenu = () => {
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      if (targetVisibilityVs && hasVisibilitySetting(targetVisibilityVs)) {
        push(
          <Menu.Item
            hidden={
              !targetVisibilityVs || !hasVisibilitySetting(targetVisibilityVs)
            }
            onClick={handleUnsetVisibility}
          >
            {RESET_CAP} <strong>Visibility</strong> style
          </Menu.Item>,
        );
      }
      push(
        <Menu.Item
          key={"not-rendered"}
          data-plasmic-prop={getVisibilityDataProp(TplVisibility.NotRendered)}
          onClick={() => _setTplVisibility(TplVisibility.NotRendered)}
        >
          {getVisibilityLabel(TplVisibility.NotRendered)}
        </Menu.Item>,
      );
    });
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          key={"custom-code"}
          onClick={() => {
            switchToDynamicValue();
          }}
        >
          Use dynamic value
        </Menu.Item>,
      );
    });

    if (roles.length > 0) {
      builder.genSub("Show based on user role", (push) => {
        for (const role of roles) {
          push(
            <Menu.Item
              key={role.id}
              onClick={() => {
                void _setCustomCond(
                  new CustomCode({
                    code: `((currentUser?.roleIds ?? []).includes('${role.id}'))`,
                    fallback: new CustomCode({
                      code: "false",
                      fallback: null,
                    }),
                  }),
                );
              }}
            >
              {role.name}
            </Menu.Item>,
          );
        }
      });
    }
    return builder.build();
  };

  const _setTplVisibility = (visibility: TplVisibility) => {
    viewCtx.change(() =>
      viewCtx.getViewOps().setTplVisibility(tpl, visibility),
    );
  };
  const _setCustomCond = (cond: CustomCode | ObjectPath) => {
    return viewCtx.studioCtx.changeUnsafe(() => {
      setTplVisibility(tpl, targetVisibilityCombo, TplVisibility.CustomExpr);
      viewCtx
        .variantTplMgr()
        .ensureVariantSetting(tpl, targetVisibilityCombo).dataCond = cond;
    });
  };

  const currentVisibility = effectiveVs.getVisibility();
  const showSimpleControls =
    visibilityChoices.length === 4 &&
    currentVisibility !== TplVisibility.NotRendered &&
    currentVisibility !== TplVisibility.CustomExpr;
  const customCode =
    currentVisibility === TplVisibility.CustomExpr
      ? (effectiveVs.dataCond as CustomCode | ObjectPath)
      : undefined;
  const visibilityEnv = viewCtx.getCanvasEnvForTpl(tpl, {
    forDataRepCollection: true,
  });
  const visibilityDataDropTarget =
    !isDisabled && !hasPrivateStyleVariant && visibilityEnv
      ? {
          accepts: (payload) =>
            acceptDataDrop(
              payload,
              visibilityEnv,
              viewCtx,
              SCALAR_DATA_TYPES,
              "Visibility only accepts scalar values",
            ),
          onDropData: (payload) => {
            const cond = computeDropReplacementExpr(
              effectiveVs.dataCond ?? codeLit(true),
              payload.path,
            )!;
            viewCtx
              .getViewOps()
              .setTplVisibility(tpl, TplVisibility.CustomExpr);
            viewCtx.getViewOps().setDataCond(tpl, cond);
          },
        }
      : undefined;
  return (
    <SidebarSection
      title="Visibility"
      {...(!customCode && { emptyBody: true })}
      isHeaderActive={
        (targetVisibilityVs && hasVisibilitySetting(targetVisibilityVs)) ||
        isSet("opacity")
      }
      controls={
        <div className={S.controlsContainer}>
          {!noStyles && (
            <LabeledStyleDimItem
              className={S.opacityField}
              styleName="opacity"
              definedIndicator={opacityDefinedIndicator}
              aria-label="Opacity"
              autoWidth
              dimOpts={{
                value: formattedOpacity,
                onChange: handleOpacityChange,
                min: 0,
                max: 100,
                extraOptions: ["100%", "50%", "0%"],
                minDropdownWidth: 170,
                allowedUnits: PERCENTAGE_UNITS,
                allowFunctions: true,
                tooltip: "Opacity",
                className: cn(S.opacityInput),
              }}
              tokenType={"Opacity"}
              vsh={vsh}
            />
          )}
          <LabeledItem
            menu={visibilityMenu}
            noMenuButton
            className={cn("no-outline", S.visibilityTogglers)}
            definedIndicator={visibilityDefinedIndicator}
            autoWidth
          >
            <ContextMenuIndicator
              menu={visibilityMenu}
              showDynamicValueButton={true}
              onIndicatorClickDefault={() => {
                switchToDynamicValue();
              }}
              style={{
                width: "100%",
              }}
              dataDropTarget={visibilityDataDropTarget}
            >
              <StyleToggleButtonGroup
                value={currentVisibility}
                onChange={(val) => _setTplVisibility(val as TplVisibility)}
                isDisabled={isDisabled || hasPrivateStyleVariant}
                disabledTooltip={
                  disabledTooltip ??
                  (hasPrivateStyleVariant
                    ? "Cannot toggle visibility when targeting element state"
                    : undefined)
                }
                data-test-id="visibility-choices"
              >
                {visibilityChoices
                  .slice(0, showSimpleControls ? 2 : 4)
                  .map((vis) => (
                    <StyleToggleButton
                      key={vis}
                      value={vis}
                      tooltip={getVisibilityLabel(vis)}
                      data-plasmic-prop={getVisibilityDataProp(vis)}
                    >
                      {getVisibilityIcon(vis)}
                    </StyleToggleButton>
                  ))}
              </StyleToggleButtonGroup>
            </ContextMenuIndicator>
          </LabeledItem>
        </div>
      }
    >
      {customCode && (
        <>
          <LabeledItemRow
            data-test-id="visibility-custom-code"
            label="Condition"
          >
            <DataPickerEditor
              forDataRepCollection
              viewCtx={viewCtx}
              title="Condition"
              target={modelBindingTarget(viewCtx, tpl, targetVisibilityCombo, {
                kind: "visibility",
              })}
              value={extractValueSavedFromDataPicker(customCode, {
                projectFlags: viewCtx.projectFlags(),
                component: viewCtx.currentComponent(),
                inStudio: true,
              })}

              data={viewCtx.getCanvasEnvForTpl(tpl, {
                forDataRepCollection: true,
              })}
              schema={viewCtx.customFunctionsSchema()}
              key={tpl.uid}
              visible={isDataPickerVisible}
              setVisible={setIsDataPickerVisible}
              context="Condition to decide whether the selected element should be visible"
            />
          </LabeledItemRow>
          <FallbackEditor
            isSet={isFallbackSet(customCode)}
            onUnset={() => {
              const clonedExpr = clone(customCode);
              const newExpr = ensureInstance(
                clonedExpr,
                ObjectPath,
                CustomCode,
              );
              newExpr.fallback = undefined;
              void _setCustomCond(newExpr);
            }}
            definedIndicator={visibilityDefinedIndicator}
          >
            {
              <BoolPropEditor
                onChange={(val) => {
                  const clonedExpr = clone(customCode);
                  const newExpr = ensureInstance(
                    clonedExpr,
                    ObjectPath,
                    CustomCode,
                  );
                  newExpr.fallback = codeLit(val);
                  return _setCustomCond(newExpr);
                }}
                value={
                  customCode.fallback
                    ? tryExtractBoolean(customCode.fallback)
                    : undefined
                }
                defaultValueHint={false}
                disabled={isDisabled}
              />
            }
          </FallbackEditor>
        </>
      )}
    </SidebarSection>
  );
}
