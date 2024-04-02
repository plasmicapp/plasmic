import {
  Component,
  CustomCode,
  ensureKnownTplTag,
  Expr,
  ImageAssetRef,
  isKnownCustomCode,
  isKnownImageAsset,
  isKnownImageAssetRef,
  isKnownObjectPath,
  isKnownVarRef,
  ObjectPath,
  TplSlot,
  TplTag,
  Var,
  VariantSetting,
  VarRef,
} from "@/wab/classes";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
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
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert, ensureInstance } from "@/wab/common";
import { getRealParams } from "@/wab/components";
import {
  clone,
  codeLit,
  createExprForDataPickerValue,
  extractReferencedParam,
  extractValueSavedFromDataPicker,
  isFallbackSet,
  isRealCodeExpr,
  tryExtractLit,
} from "@/wab/exprs";
import { ImageAssetType } from "@/wab/image-asset-type";
import { getTagAttrForImageAsset } from "@/wab/image-assets";
import { mkParam } from "@/wab/lang";
import { isImageType, typeFactory } from "@/wab/shared/core/model-util";
import { typographyCssProps } from "@/wab/shared/core/style-props";
import {
  computeDefinedIndicator,
  DefinedIndicatorType,
} from "@/wab/shared/defined-indicator";
import { isCodeComponentSlot } from "@/wab/shared/SlotUtils";
import { unsetTplVariantableAttr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureVariantSetting, isGlobalVariant } from "@/wab/shared/Variants";
import { getTplComponentsInSite } from "@/wab/tpls";
import { Alert, Menu, Tooltip } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { FaLink } from "react-icons/fa";
import { DataPickerEditor } from "./ComponentProps/DataPickerEditor";
import { FallbackEditor, promptForParamName } from "./ComponentPropsSection";
import { ContentPanelSection } from "./image-content-section";

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
    isIcon ? ImageAssetType.Icon : ImageAssetType.Picture
  );
  const attrSource = effectiveVs.getAttrSource(attr);
  const definedIndicator = computeDefinedIndicator(
    viewCtx.site,
    viewCtx.currentComponent(),
    attrSource,
    vtm.getTargetIndicatorComboForNode(tpl)
  );

  const hasTypoStyles = typographyCssProps.some((p) =>
    expsProvider.maybeTargetExp()?.has(p)
  );

  const expr = effectiveVs.attrs[attr];
  let variable: Var | undefined = undefined;

  const [isDataPickerVisible, setIsDataPickerVisible] =
    React.useState<boolean>(false);
  const [showFallback, setShowFallback] = React.useState<boolean>(
    isFallbackSet(expr)
  );

  if (isKnownVarRef(expr)) {
    variable = expr.variable;
  }

  const asset =
    !variable && isKnownImageAssetRef(expr)
      ? expr.asset
      : (isKnownCustomCode(expr) || isKnownObjectPath(expr)) &&
        isKnownImageAssetRef(expr.fallback)
      ? expr.fallback.asset
      : undefined;

  if (!targetVs) {
    return null;
  }

  const ownerComponent = $$$(tpl).owningComponent();

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
    variable,
    viewCtx,
    attr,
    definedIndicator,
    expr,
    fallback: { showFallback, setShowFallback },
    switchToDynamic,
  });
  const isDynamicExpression = isRealCodeExpr(expr);
  const shouldShowSizeProps = isDynamicExpression || isKnownCustomCode(expr);

  return (
    <StylePanelSection
      expsProvider={expsProvider}
      title={
        isIcon ? (
          "Icon"
        ) : (
          <>
            <span>Image{variable && " slot"}</span>
            {variable && (
              <span
                className="labeled-item__text"
                style={{ marginLeft: "5px" }}
              >
                <Tooltip
                  title={
                    <>
                      <p>
                        Linked to{" "}
                        <code>
                          {ownerComponent.name}.{variable.name}
                        </code>
                      </p>
                      <p>
                        With a <b>image slot</b> you can override this image in
                        the component props section, you can also set a default
                        image for components that don't set it.
                      </p>
                    </>
                  }
                >
                  <FaLink />
                </Tooltip>
              </span>
            )}
          </>
        )
      }
      styleProps={isIcon ? ["color"] : ["object-fit", "object-position"]}
    >
      {variable ? (
        <WithContextMenu
          overlay={imageMenu}
          className="panel-row style-wrapper"
        >
          <DefinedIndicator type={definedIndicator} label="Image" />
          <DefaultVariableImagePicker
            studioCtx={studioCtx}
            ownerComponent={ownerComponent}
            expr={expr}
          />
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
                      CustomCode
                    );
                    const fallbackExpr = codeExpr.fallback
                      ? clone(codeExpr.fallback)
                      : undefined;
                    const newExpr = createExprForDataPickerValue(
                      val,
                      fallbackExpr
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
                  flatten={true}
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
                    CustomCode
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
                      CustomCode
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
            showDynamicValueButton={true}
            onIndicatorClickDefault={() => {
              switchToDynamic();
            }}
            className="fill-width"
          >
            <ImageAssetPreviewAndPicker
              className="flex-fill flex-col"
              studioCtx={studioCtx}
              value={asset || (expr && tryExtractLit(expr))}
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
                        viewCtx.setStudioFocusByTpl(ancestorSlot)
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
                                ancestorSlot
                              )
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
    </StylePanelSection>
  );
});

const DefaultVariableImagePicker = observer(
  function DefaultVariableImagePicker({
    studioCtx,
    expr,
    ownerComponent,
  }: {
    studioCtx: StudioCtx;
    expr: Expr;
    ownerComponent: Component;
  }) {
    const referencedParam = extractReferencedParam(ownerComponent, expr);
    const defaultParamLit = isKnownImageAssetRef(referencedParam?.defaultExpr)
      ? referencedParam?.defaultExpr.asset
      : referencedParam?.defaultExpr &&
        tryExtractLit(referencedParam.defaultExpr);
    return (
      <ImageAssetPreviewAndPicker
        className="flex-fill flex-col"
        studioCtx={studioCtx}
        value={defaultParamLit}
        onPicked={(picked) =>
          studioCtx.changeUnsafe(() => {
            if (isKnownImageAsset(picked)) {
              referencedParam!.defaultExpr = new ImageAssetRef({
                asset: picked,
              });
            } else {
              referencedParam!.defaultExpr = codeLit(picked);
            }
          })
        }
        keepOpen={true}
        type={ImageAssetType.Picture}
      />
    );
  }
);

export function makeImageMenu({
  tpl,
  isIcon,
  variable,
  baseVs,
  targetVs,
  attr,
  ownerComponent,
  viewCtx,
  definedIndicator,
  expr,
  fallback,
  switchToDynamic,
}: {
  tpl: TplTag;
  isIcon: boolean;
  variable?: Var;
  baseVs?: VariantSetting;
  targetVs?: VariantSetting;
  attr: string;
  ownerComponent: Component;
  viewCtx: ViewCtx;
  definedIndicator: DefinedIndicatorType;
  switchToDynamic?: () => void;
  expr: Expr;
  fallback:
    | { showFallback: boolean; setShowFallback: (val: boolean) => void }
    | undefined;
}) {
  const builder = new MenuBuilder();
  const referencedParam = extractReferencedParam(ownerComponent, expr);
  const hasLink = !!variable;
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
              <code>
                {ownerComponent.name}.{variable!.name}
              </code>
            </span>
          </Menu.Item>
        );
      }
      if (hasLink) {
        push(
          <Menu.Item
            onClick={() =>
              viewCtx.change(() => {
                const defaultValue = referencedParam?.defaultExpr;
                if (isKnownImageAssetRef(defaultValue)) {
                  baseVs.attrs[attr] = new ImageAssetRef(defaultValue);
                } else {
                  delete baseVs.attrs[attr];
                }
              })
            }
          >
            <span>
              Unlink from component prop{" "}
              <code>
                {ownerComponent.name}.{variable!.name}
              </code>
            </span>
          </Menu.Item>
        );
      } else if (viewCtx.tplMgr().canLinkToProp(tpl)) {
        const updateAttr = (varRef: VarRef) => {
          const baseValue = baseVs.attrs[attr];

          const globalVariantSettings = tpl.vsettings.filter(
            (vs) =>
              vs.variants.every((v) => isGlobalVariant(v)) && !!vs.attrs[attr]
          );

          const param = extractReferencedParam(ownerComponent, varRef);
          if (param && globalVariantSettings.length > 0) {
            const compInstances = getTplComponentsInSite(
              viewCtx.studioCtx.site,
              ownerComponent
            );
            const vtm = viewCtx.variantTplMgr();
            compInstances.forEach((instTpl) => {
              globalVariantSettings.forEach((vs) => {
                vtm.setArgUnderVariantSetting(
                  instTpl,
                  param.variable,
                  new ImageAssetRef(vs.attrs[attr] as ImageAssetRef),
                  ensureVariantSetting(instTpl, vs.variants)
                );
              });
            });
          }

          unsetTplVariantableAttr(tpl, attr);
          baseVs.attrs[attr] = varRef;

          if (param && baseValue && isImageType(param.type)) {
            param.defaultExpr = clone(baseValue);
          }
        };
        push(
          <Menu.SubMenu
            title={
              <span>
                Link to a prop for component <code>{ownerComponent.name}</code>
              </span>
            }
          >
            {getRealParams(ownerComponent)
              .filter((p) => p.type.name === "img")
              .map((param) => (
                <Menu.Item
                  onClick={() =>
                    viewCtx.change(() => {
                      updateAttr(
                        new VarRef({
                          variable: param.variable,
                        })
                      );
                    })
                  }
                >
                  <code>{param.variable.name}</code>
                </Menu.Item>
              ))}
            <Menu.Item
              onClick={async () => {
                const paramName = await promptForParamName(
                  viewCtx.tplMgr(),
                  ownerComponent
                );
                if (!paramName) {
                  return;
                }
                viewCtx.change(() => {
                  const newParam = mkParam({
                    name: paramName,
                    type: typeFactory["img"](),
                    paramType: "prop",
                  });
                  ownerComponent.params.push(newParam);
                  updateAttr(new VarRef({ variable: newParam.variable }));
                });
              }}
            >
              <div className="flex flex-vcenter">
                <Icon icon={PlusIcon} className="mr-sm" /> Create new prop
              </div>
            </Menu.Item>
          </Menu.SubMenu>
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
          </Menu.Item>
        );
      }

      if (isCustomCode) {
        if (fallback && !fallback.showFallback)
          push(
            <Menu.Item
              key={"fallback"}
              onClick={() => fallback?.setShowFallback(true)}
            >
              Change fallback value
            </Menu.Item>
          );
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
          </Menu.Item>
        );
      }
    });
  }

  builder.genSection(undefined, (push) => {
    if (definedIndicator.source === "set" && !variable) {
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
        </Menu.Item>
      );
    }
  });

  return builder.build({
    menuName: "image-section-menu",
  });
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
  _ImageSectionForCodeComponent
);
