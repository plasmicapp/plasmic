import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { ComponentPropModal } from "@/wab/client/components/modals/ComponentPropModal";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import { FallbackEditor } from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { ContentPanelSection } from "@/wab/client/components/sidebar-tabs/image-content-section";
import {
  LinkedPropIndicator,
  LinkToPropMenuItem,
  UnlinkFromPropMenuItem,
} from "@/wab/client/components/sidebar-tabs/linked-prop-utils";
import {
  LabeledItemRow,
  LabeledStyleColorItemRow,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { DefinedIndicator } from "@/wab/client/components/style-controls/DefinedIndicator";
import { ImageAssetPreviewAndPicker } from "@/wab/client/components/style-controls/ImageSelector";
import {
  StylePanelSection,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert, ensureInstance } from "@/wab/shared/common";
import {
  getComponentDisplayName,
  getRealParams,
} from "@/wab/shared/core/components";
import {
  clone,
  codeLit,
  createExprForDataPickerValue,
  extractReferencedParam,
  extractValueSavedFromDataPicker,
  isFallbackSet,
  isRealCodeExpr,
  tryExtractJson,
  tryExtractLit,
} from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { getTagAttrForImageAsset } from "@/wab/shared/core/image-assets";
import { typographyCssProps } from "@/wab/shared/core/style-props";
import { getTplComponentsInSite } from "@/wab/shared/core/tpls";
import {
  computeDefinedIndicator,
  DefinedIndicatorType,
} from "@/wab/shared/defined-indicator";
import {
  Component,
  CustomCode,
  ensureKnownTplTag,
  Expr,
  ImageAsset,
  ImageAssetRef,
  isKnownCustomCode,
  isKnownImageAsset,
  isKnownImageAssetRef,
  isKnownObjectPath,
  ObjectPath,
  Param,
  TplSlot,
  TplTag,
  VariantSetting,
  VarRef,
} from "@/wab/shared/model/classes";
import { isImageType, typeFactory } from "@/wab/shared/model/model-util";
import { isCodeComponentSlot } from "@/wab/shared/SlotUtils";
import { unsetTplVariantableAttr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureVariantSetting, isGlobalVariant } from "@/wab/shared/Variants";
import { Alert, Menu } from "antd";
import { observer } from "mobx-react";
import React from "react";

export const ImageSection = observer(function ImageSection(props: {
  expsProvider: TplExpsProvider;
  ancestorSlot?: TplSlot;
}) {
  const { expsProvider, ancestorSlot } = props;

  const studioCtx = expsProvider.studioCtx;
  const viewCtx = expsProvider.viewCtx;
  const tpl = ensureKnownTplTag(expsProvider.tpl);
  const vtm = viewCtx.variantTplMgr();
  const effectiveVs = vtm.effectiveVariantSetting(tpl);
  const targetVs = vtm.tryGetTargetVariantSetting(tpl);
  const baseVs = vtm.tryGetBaseVariantSetting(tpl);

  const isIcon = tpl.tag === "svg";
  const attr = getTagAttrForImageAsset(
    isIcon ? ImageAssetType.Icon : ImageAssetType.Picture,
  );
  const attrSource = effectiveVs.getAttrSource(attr);
  const definedIndicator = computeDefinedIndicator(
    viewCtx.site,
    viewCtx.currentComponent(),
    attrSource,
    vtm.getTargetIndicatorComboForNode(tpl),
  );

  const hasTypoStyles = typographyCssProps.some((p) =>
    expsProvider.maybeTargetExp()?.has(p),
  );

  const expr = effectiveVs.attrs[attr];

  const [isDataPickerVisible, setIsDataPickerVisible] =
    React.useState<boolean>(false);
  const [showFallback, setShowFallback] = React.useState<boolean>(
    isFallbackSet(expr),
  );
  const [newParamModalVisible, setNewParamModalVisible] =
    React.useState<boolean>(false);

  const asset = isKnownImageAssetRef(expr)
    ? expr.asset
    : (isKnownCustomCode(expr) || isKnownObjectPath(expr)) &&
        isKnownImageAssetRef(expr.fallback)
      ? expr.fallback.asset
      : undefined;

  if (!targetVs) {
    return null;
  }

  const ownerComponent = $$$(tpl).owningComponent();
  const referencedParam = extractReferencedParam(ownerComponent, expr);

  const baseImageExpr = baseVs?.attrs[attr];
  const suggestedDefaultExpr = isStaticImageExpr(baseImageExpr)
    ? clone(baseImageExpr)
    : undefined;

  const switchToDynamic = () => {
    const newExpr = isKnownCustomCode(expr)
      ? new CustomCode({
          code: `(${expr.code})`,
          fallback: expr,
        })
      : new ObjectPath({
          path: isKnownObjectPath(expr) ? expr.path : ["undefined"],
          fallback: expr ?? codeLit(undefined),
        });
    viewCtx.change(() => {
      if (targetVs) {
        targetVs.attrs[attr] = newExpr;
      }
    });
    setShowFallback(true);
    // Show data picker the next tick, so it has a chance to find
    // the code editor input to anchor against
    setTimeout(() => {
      setIsDataPickerVisible(true);
    }, 0);
  };

  const imageMenu = makeImageMenu({
    tpl,
    isIcon,
    baseVs,
    targetVs,
    ownerComponent,
    referencedParam,
    viewCtx,
    attr,
    definedIndicator,
    expr,
    fallback: { showFallback, setShowFallback },
    switchToDynamic,
    onCreateNewProp: () => setNewParamModalVisible(true),
  });
  const isDynamicExpression = isRealCodeExpr(expr);
  const shouldShowSizeProps = isDynamicExpression || isKnownCustomCode(expr);

  return (
    <StylePanelSection
      expsProvider={expsProvider}
      title={isIcon ? "Icon" : "Image"}
      styleProps={isIcon ? ["color"] : ["object-fit", "object-position"]}
    >
      {referencedParam ? (
        <WithContextMenu
          overlay={imageMenu}
          className="panel-row style-wrapper"
        >
          <DefinedIndicator type={definedIndicator} label="Image" />
          <ContextMenuIndicator
            menu={imageMenu}
            showDynamicValueButton={false}
            className="fill-width"
          >
            <LinkedPropIndicator
              ownerComponent={ownerComponent}
              referencedParam={referencedParam}
            />
          </ContextMenuIndicator>
        </WithContextMenu>
      ) : isDynamicExpression ? (
        <div className="panel-row flex-col">
          <WithContextMenu
            overlay={imageMenu}
            className="panel-row style-wrapper"
          >
            <DefinedIndicator type={definedIndicator} label="Image" />
            <LabeledItemRow label="Image URL" menu={imageMenu} noMenuButton>
              <ContextMenuIndicator
                menu={imageMenu}
                showDynamicValueButton={false}
                onIndicatorClickDefault={() => {
                  switchToDynamic();
                }}
                className="fill-width"
              >
                <DataPickerEditor
                  viewCtx={viewCtx}
                  value={extractValueSavedFromDataPicker(expr, {
                    projectFlags: viewCtx.projectFlags(),
                    component: ownerComponent,
                    inStudio: true,
                  })}
                  onChange={(val) => {
                    if (!val) {
                      return;
                    }
                    const codeExpr = ensureInstance(
                      expr,
                      ObjectPath,
                      CustomCode,
                    );
                    const fallbackExpr = codeExpr.fallback
                      ? clone(codeExpr.fallback)
                      : undefined;
                    const newExpr = createExprForDataPickerValue(
                      val,
                      fallbackExpr,
                    );
                    viewCtx.change(() => {
                      if (targetVs) {
                        targetVs.attrs[attr] = newExpr;
                      }
                    });
                  }}
                  onUnlink={() => {
                    viewCtx.change(() => {
                      if (targetVs) {
                        if (
                          (isKnownCustomCode(expr) ||
                            isKnownObjectPath(expr)) &&
                          expr.fallback
                        ) {
                          targetVs.attrs[attr] = expr.fallback;
                        } else {
                          delete targetVs.attrs[attr];
                        }
                      }
                    });
                  }}
                  visible={isDataPickerVisible}
                  setVisible={setIsDataPickerVisible}
                  data={viewCtx.getCanvasEnvForTpl(tpl)}
                  schema={viewCtx.customFunctionsSchema()}
                  key={tpl.uid}
                  context="The image URL"
                />
              </ContextMenuIndicator>
            </LabeledItemRow>
          </WithContextMenu>
          {showFallback && (
            <FallbackEditor
              isSet={isFallbackSet(expr)}
              definedIndicator={definedIndicator}
              onUnset={() =>
                studioCtx.changeUnsafe(() => {
                  const clonedExpr = clone(expr);
                  const newExpr = ensureInstance(
                    clonedExpr,
                    ObjectPath,
                    CustomCode,
                  );
                  newExpr.fallback = undefined;
                  targetVs.attrs[attr] = newExpr;
                })
              }
            >
              <ImageAssetPreviewAndPicker
                className="fill-width wrap-word"
                studioCtx={studioCtx}
                value={
                  asset ||
                  ((expr as any).fallback &&
                    tryExtractLit((expr as any).fallback))
                }
                onPicked={(picked) =>
                  studioCtx.changeUnsafe(() => {
                    const clonedExpr = clone(expr);
                    const newExpr = ensureInstance(
                      clonedExpr,
                      ObjectPath,
                      CustomCode,
                    );
                    if (isKnownImageAsset(picked)) {
                      newExpr.fallback = new ImageAssetRef({
                        asset: picked,
                      });
                    } else {
                      assert(!isIcon, "Unexpected instance of image asset");
                      newExpr.fallback = codeLit(picked);
                    }
                    targetVs.attrs[attr] = newExpr;
                  })
                }
                keepOpen={false}
                forFallback={true}
                type={isIcon ? ImageAssetType.Icon : ImageAssetType.Picture}
              />
            </FallbackEditor>
          )}
        </div>
      ) : (
        <WithContextMenu
          overlay={imageMenu}
          className="panel-row style-wrapper"
        >
          <DefinedIndicator type={definedIndicator} label="Image" />
          <ContextMenuIndicator
            menu={imageMenu}
            showDynamicValueButton={!isIcon}
            onIndicatorClickDefault={() => {
              switchToDynamic();
            }}
            className="fill-width"
          >
            <ImageAssetPreviewAndPicker
              className="flex-fill flex-col"
              studioCtx={studioCtx}
              value={
                asset ||
                (expr &&
                  (tryExtractLit(expr) as ImageAsset | string | undefined))
              }
              onPicked={(picked) =>
                studioCtx.changeUnsafe(() => {
                  if (isKnownImageAsset(picked)) {
                    targetVs.attrs[attr] = new ImageAssetRef({ asset: picked });
                  } else {
                    assert(!isIcon, "Unexpected instance of image asset");
                    targetVs.attrs[attr] = codeLit(picked);
                  }
                })
              }
              keepOpen={true}
              type={isIcon ? ImageAssetType.Icon : ImageAssetType.Picture}
            />
          </ContextMenuIndicator>
        </WithContextMenu>
      )}
      {isIcon && (
        <>
          {ancestorSlot && !isCodeComponentSlot(ancestorSlot) && (
            <Alert
              className="mt-m"
              type="info"
              showIcon={true}
              message={
                <div>
                  This icon is default content for slot{" "}
                  <code>{ancestorSlot.param.variable.name}</code>. If you want
                  to change the color of any content in the slot, and not just
                  <em>this</em> default icon, then you should{" "}
                  <a
                    onClick={() =>
                      viewCtx.change(() =>
                        viewCtx.setStudioFocusByTpl(ancestorSlot),
                      )
                    }
                  >
                    <strong>style the slot instead</strong>
                  </a>
                  .
                  {hasTypoStyles && (
                    <>
                      {" "}
                      You can also transfer the color here{" "}
                      <a
                        onClick={() =>
                          viewCtx.change(() =>
                            viewCtx
                              .getViewOps()
                              .transferTextStyleToSlot(
                                tpl as TplTag,
                                ancestorSlot,
                              ),
                          )
                        }
                      >
                        to the slot
                      </a>
                      .
                    </>
                  )}
                </div>
              }
            />
          )}
          <LabeledStyleColorItemRow label="Icon Color" styleName="color" />
        </>
      )}
      {!isIcon && (
        <>
          <ContentPanelSection
            expsProvider={expsProvider}
            shouldShowSizeProps={shouldShowSizeProps}
          />
        </>
      )}
      {newParamModalVisible && baseVs && (
        <ComponentPropModal
          studioCtx={studioCtx}
          component={ownerComponent}
          visible={newParamModalVisible}
          suggestedName={tpl.name ? `${tpl.name} / Image` : "Image"}
          suggestedDefaultExpr={suggestedDefaultExpr}
          type={typeFactory.img()}
          onFinish={(newParam) => {
            setNewParamModalVisible(false);
            if (!newParam) {
              return;
            }
            viewCtx.change(() =>
              linkImageAttrToParam(
                { tpl, attr, baseVs, ownerComponent, viewCtx },
                new VarRef({ variable: newParam.variable }),
              ),
            );
          }}
        />
      )}
    </StylePanelSection>
  );
});

function linkImageAttrToParam(
  {
    tpl,
    attr,
    baseVs,
    ownerComponent,
    viewCtx,
  }: {
    tpl: TplTag;
    attr: string;
    baseVs: VariantSetting;
    ownerComponent: Component;
    viewCtx: ViewCtx;
  },
  varRef: VarRef,
) {
  const globalVariantSettings = tpl.vsettings.filter(
    (vs) => vs.variants.every((v) => isGlobalVariant(v)) && !!vs.attrs[attr],
  );

  const param = extractReferencedParam(ownerComponent, varRef);
  if (param && globalVariantSettings.length > 0) {
    const compInstances = getTplComponentsInSite(
      viewCtx.studioCtx.site,
      ownerComponent,
    );
    const vtm = viewCtx.variantTplMgr();
    compInstances.forEach((instTpl) => {
      globalVariantSettings.forEach((vs) => {
        vtm.setArgUnderVariantSetting(
          instTpl,
          param.variable,
          new ImageAssetRef(vs.attrs[attr] as ImageAssetRef),
          ensureVariantSetting(instTpl, vs.variants),
        );
      });
    });
  }

  unsetTplVariantableAttr(tpl, attr);
  baseVs.attrs[attr] = varRef;
}

/**
 * An image asset ref or a non-empty literal URL string, as opposed to a
 * dynamic expression or an unset value.
 */
function isStaticImageExpr(
  expr: Expr | null | undefined,
): expr is ImageAssetRef | CustomCode {
  if (isKnownImageAssetRef(expr)) {
    return true;
  }
  return (
    isKnownCustomCode(expr) &&
    !isRealCodeExpr(expr) &&
    tryExtractJson(expr) !== undefined
  );
}

function makeImageMenu({
  tpl,
  isIcon,
  referencedParam,
  baseVs,
  targetVs,
  attr,
  ownerComponent,
  viewCtx,
  definedIndicator,
  expr,
  fallback,
  switchToDynamic,
  onCreateNewProp,
}: {
  tpl: TplTag;
  isIcon: boolean;
  referencedParam?: Param;
  baseVs?: VariantSetting;
  targetVs?: VariantSetting;
  attr: string;
  ownerComponent: Component;
  viewCtx: ViewCtx;
  definedIndicator: DefinedIndicatorType;
  switchToDynamic?: () => void;
  onCreateNewProp: () => void;
  expr: Expr;
  fallback:
    | { showFallback: boolean; setShowFallback: (val: boolean) => void }
    | undefined;
}) {
  const builder = new MenuBuilder();
  const isCustomCode = isRealCodeExpr(expr);
  if (!isIcon && baseVs) {
    builder.genSection(undefined, (push) => {
      if (referencedParam?.defaultExpr) {
        push(
          <Menu.Item
            onClick={() =>
              viewCtx.change(() => {
                referencedParam.defaultExpr = null;
              })
            }
          >
            <span>
              Unset default value for{" "}
              <strong>
                {getComponentDisplayName(ownerComponent)}.
                {referencedParam.variable.name}
              </strong>
            </span>
          </Menu.Item>,
        );
      }
      if (referencedParam) {
        push(
          <UnlinkFromPropMenuItem
            ownerComponent={ownerComponent}
            referencedParam={referencedParam}
            onUnlink={() =>
              viewCtx.change(() => {
                const defaultValue = referencedParam.defaultExpr;
                if (isStaticImageExpr(defaultValue)) {
                  baseVs.attrs[attr] = clone(defaultValue);
                } else {
                  delete baseVs.attrs[attr];
                }
              })
            }
          />,
        );
      } else if (viewCtx.tplMgr().canLinkToProp(tpl)) {
        push(
          <LinkToPropMenuItem
            availableParams={getRealParams(ownerComponent).filter((p) =>
              isImageType(p.type),
            )}
            onLinkExisting={(param) =>
              viewCtx.change(() =>
                linkImageAttrToParam(
                  { tpl, attr, baseVs, ownerComponent, viewCtx },
                  new VarRef({ variable: param.variable }),
                ),
              )
            }
            onCreateNew={onCreateNewProp}
          />,
        );
      }
      if (!referencedParam && !isCustomCode && switchToDynamic) {
        push(
          <Menu.Item
            key={"customCode"}
            onClick={() => {
              switchToDynamic();
            }}
          >
            Use dynamic value
          </Menu.Item>,
        );
      }

      if (isCustomCode) {
        if (fallback && !fallback.showFallback) {
          push(
            <Menu.Item
              key={"fallback"}
              onClick={() => fallback?.setShowFallback(true)}
            >
              Change fallback value
            </Menu.Item>,
          );
        }
        push(
          <Menu.Item
            key={"!customCode"}
            onClick={() => {
              viewCtx.change(() => {
                if (targetVs) {
                  if (
                    (isKnownCustomCode(expr) || isKnownObjectPath(expr)) &&
                    expr.fallback
                  ) {
                    targetVs.attrs[attr] = expr.fallback;
                  } else {
                    delete targetVs.attrs[attr];
                  }
                }
              });
            }}
          >
            Remove dynamic value
          </Menu.Item>,
        );
      }
    });
  }

  builder.genSection(undefined, (push) => {
    if (definedIndicator.source === "set" && !referencedParam) {
      push(
        <Menu.Item
          key="unset"
          onClick={() =>
            viewCtx.change(() => {
              if (targetVs) {
                delete targetVs.attrs[attr];
              }
            })
          }
        >
          Unset image
        </Menu.Item>,
      );
    }
  });

  return builder.isEmpty()
    ? undefined
    : builder.build({ menuName: "image-section-menu" });
}

const _ImageSectionForCodeComponent = (props: {
  expsProvider: TplExpsProvider;
}) => (
  <StylePanelSection
    expsProvider={props.expsProvider}
    title={"Image"}
    styleProps={["object-fit", "object-position"]}
  >
    <ContentPanelSection expsProvider={props.expsProvider} />
  </StylePanelSection>
);

export const ImageSectionForCodeComponent = observer(
  _ImageSectionForCodeComponent,
);
