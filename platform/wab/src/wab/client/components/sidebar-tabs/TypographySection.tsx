import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import { StringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { FallbackEditor } from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { DataTokenEditModal } from "@/wab/client/components/sidebar/DataTokenEditModal";
import {
  getValueSetState,
  LabeledItemRow,
  ValueSetState,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  ExpsProvider,
  StylePanelSection,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleSwitch from "@/wab/client/components/style-controls/StyleSwitch";
import { Typography } from "@/wab/client/components/style-controls/Typography";
import {
  makeTplTextMenu,
  makeTplTextOps,
} from "@/wab/client/components/tpl-text-ops";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { makeShortProjectId, toVarName } from "@/wab/shared/codegen/util";
import { assert, cx, ensureInstance } from "@/wab/shared/common";
import {
  asCode,
  clone,
  codeLit,
  createExprForDataPickerValue,
  ExprCtx,
  extractValueSavedFromDataPicker,
  isFallbackSet,
  tryExtractString,
} from "@/wab/shared/core/exprs";
import {
  inheritableTypographyCssProps,
  typographyCssProps,
} from "@/wab/shared/core/style-props";
import { getRichTextContent, isTplTextBlock } from "@/wab/shared/core/tpls";
import { makeDataTokenIdentifier } from "@/wab/shared/eval/expression-parser";
import {
  CustomCode,
  DataToken,
  ensureKnownTplTag,
  ExprText,
  isKnownCustomCode,
  isKnownExprText,
  ObjectPath,
  RawText,
  RichText,
  TplSlot,
  TplTag,
} from "@/wab/shared/model/classes";
import {
  isCodeComponentSlot,
  isPlainTextTplSlot,
} from "@/wab/shared/SlotUtils";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { Alert, Menu, Tooltip } from "antd";
import { observer } from "mobx-react";
import React from "react";

export const TypographySection = observer(TypographySection_);

function TypographySection_(props: {
  expsProvider: ExpsProvider;
  ancestorSlot?: TplSlot;
  inheritableOnly: boolean;
  viewCtx?: ViewCtx;
  vsh?: VariantedStylesHelper;
  warnOnRelativeUnits?: boolean;
  title?: React.ReactNode;
  animatableOnly?: boolean;
}) {
  const { expsProvider, ancestorSlot, viewCtx, vsh, title, animatableOnly } =
    props;

  const sc = expsProvider.studioCtx;
  const vc = sc.focusedViewCtx();
  const tpl =
    expsProvider instanceof TplExpsProvider ? expsProvider.tpl : undefined;
  const hasStyles = typographyCssProps.some((p) =>
    expsProvider.maybeTargetExp()?.has(p)
  );

  const shouldShowSlotTypographyWarning =
    ancestorSlot && tpl && vc && !isCodeComponentSlot(ancestorSlot);

  return (
    <StylePanelSection
      hasMore
      title={title ?? "Text"}
      expsProvider={expsProvider}
      styleProps={
        props.inheritableOnly
          ? inheritableTypographyCssProps
          : typographyCssProps
      }
    >
      {(renderMaybeCollapsibleRows) => (
        <>
          {shouldShowSlotTypographyWarning && (
            <Alert
              type="info"
              showIcon={true}
              className="mb-sm"
              message={
                <div>
                  This is default content for slot{" "}
                  <code>{ancestorSlot!.param.variable.name}</code>. If you want
                  to style any content in the slot, and not just this default
                  text, then you should{" "}
                  <a
                    onClick={() =>
                      vc!.change(() => vc!.setStudioFocusByTpl(ancestorSlot!))
                    }
                  >
                    <strong>style the slot instead</strong>
                  </a>
                  .
                  {hasStyles && (
                    <>
                      {" "}
                      You can also transfer text styles here{" "}
                      <a
                        onClick={() =>
                          vc!.change(() =>
                            vc!
                              .getViewOps()
                              .transferTextStyleToSlot(
                                tpl as TplTag,
                                ancestorSlot!
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
          {expsProvider instanceof TplExpsProvider && viewCtx && (
            <TextContentRow viewCtx={viewCtx} expsProvider={expsProvider} />
          )}
          <Typography
            renderMaybeCollapsibleRows={renderMaybeCollapsibleRows}
            onChange={async (cssPropName: string, newValue: string) => {
              await sc.changeUnsafe(() => {
                expsProvider.targetExp().set(cssPropName, newValue);
              });
              if (cssPropName === "font-family") {
                sc.fontManager.useFont(sc, newValue);
              }
            }}
            unset={async (cssPropName: string) => {
              await sc.changeUnsafe(() => {
                expsProvider.targetExp().clear(cssPropName);
              });
            }}
            inheritableOnly={props.inheritableOnly}
            warnOnRelativeUnits={props.warnOnRelativeUnits}
            vsh={vsh}
            animatableOnly={animatableOnly}
          />
        </>
      )}
    </StylePanelSection>
  );
}

export const TextOnlySection = observer(function TextOnlySection(props: {
  expsProvider: ExpsProvider;
  viewCtx?: ViewCtx;
  title?: React.ReactNode;
}) {
  const { expsProvider, viewCtx, title } = props;
  if (!(expsProvider instanceof TplExpsProvider) || !viewCtx) {
    return null;
  }
  return (
    <SidebarSection title={title ?? "Text"}>
      <TextContentRow viewCtx={viewCtx} expsProvider={expsProvider} />
    </SidebarSection>
  );
});

const TextContentRow = observer(function TextContentRow(props: {
  viewCtx: ViewCtx;
  expsProvider: TplExpsProvider;
}) {
  const { expsProvider, viewCtx } = props;
  const studioCtx = useStudioCtx();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isDataPickerVisible, setIsDataPickerVisible] =
    React.useState<boolean>(false);
  const [editDataToken, setEditDataToken] = React.useState<DataToken | null>(
    null
  );
  const [showFallback, setShowFallback] = React.useState(false);
  const dataToken = viewCtx.getTriggerCreatingTextDataToken();

  React.useEffect(() => {
    if (viewCtx.triggerEditingTextDataPicker()) {
      contentRef.current?.scrollIntoView({
        block: "center",
      });
      setIsDataPickerVisible(true);
      viewCtx.setTriggerEditingTextDataPicker(false);
    }

    if (dataToken) {
      contentRef.current?.scrollIntoView({
        block: "center",
      });
      setEditDataToken(dataToken);
      switchToDynamicValue(dataToken.name);
      viewCtx.setTriggerCreatingTextDataToken(null);
    }
  }, [viewCtx.triggerEditingTextDataPicker(), dataToken]);

  const tpl = expsProvider.tpl;
  const textTpl = isTplTextBlock(tpl)
    ? tpl
    : isPlainTextTplSlot(tpl) && !isCodeComponentSlot(tpl)
    ? ensureKnownTplTag(tpl.defaultContents[0])
    : undefined;

  const vtm = viewCtx.variantTplMgr();

  if (!textTpl) {
    return null;
  }

  const textTplOps = makeTplTextOps(viewCtx, textTpl);
  const {
    effectiveVs,
    indicator,
    isDisabled,
    disabledTooltip,
    actions: { convertToDynamicValue },
  } = textTplOps;

  const text = effectiveVs.text;
  if (!text) {
    return null;
  }

  const codeExpr = isKnownExprText(text)
    ? ensureInstance(text.expr, ObjectPath, CustomCode)
    : undefined;
  if (codeExpr && isFallbackSet(codeExpr) && !showFallback) {
    setShowFallback(true);
  }

  const setState = getValueSetState(indicator);

  const onChange = (newValue: RichText | null) => {
    viewCtx.change(() => {
      vtm.ensureCurrentVariantSetting(textTpl).text = newValue;
    });
  };

  const exprCtx: ExprCtx = {
    projectFlags: studioCtx.projectFlags(),
    component: viewCtx.currentComponent(),
    inStudio: true,
  };
  const switchToDynamicValue = (dataTokenName: string) => {
    const shortId = makeShortProjectId(viewCtx.siteInfo.id);
    const newExpr = new ObjectPath({
      path: [makeDataTokenIdentifier(shortId, toVarName(dataTokenName))],
      fallback: undefined,
    });
    onChange(new ExprText({ expr: newExpr, html: false }));
  };

  const applyDynamicValue = convertToDynamicValue
    ? () => {
        convertToDynamicValue();
        setShowFallback(true);
        setIsDataPickerVisible(true);
      }
    : undefined;
  const contextMenu = () => {
    return (
      <Menu>
        {makeTplTextMenu(textTplOps)}
        {isKnownExprText(text) && !isFallbackSet(text.expr) && (
          <Menu.Item key={"fallback"} onClick={() => setShowFallback(true)}>
            Change fallback value
          </Menu.Item>
        )}
      </Menu>
    );
  };
  return (
    <>
      <LabeledItemRow
        data-test-id="text-content"
        label="Content"
        definedIndicator={indicator}
        menu={contextMenu}
        ref={contentRef}
        noMenuButton
      >
        <ContextMenuIndicator
          menu={contextMenu}
          showDynamicValueButton={
            applyDynamicValue && !studioCtx.contentEditorMode
          }
          onIndicatorClickDefault={applyDynamicValue}
          className="qb-custom-widget"
          fullWidth
        >
          <MaybeWrap
            cond={!!isDisabled}
            wrapper={(x) => <Tooltip title={disabledTooltip}>{x}</Tooltip>}
          >
            {editDataToken && (
              <DataTokenEditModal
                token={editDataToken}
                studioCtx={studioCtx}
                onClose={() => setEditDataToken(null)}
                triggerElement={contentRef.current ?? undefined}
                popoverFrameValuePath={["text"]}
              />
            )}
            {isKnownExprText(text) ? (
              <DataPickerEditor
                viewCtx={viewCtx}
                value={extractValueSavedFromDataPicker(text.expr, exprCtx)}
                onChange={(val) => {
                  if (!val) {
                    return;
                  }
                  assert(
                    codeExpr,
                    "Unexpected undefined value, codeExpr must be defined when data binding"
                  );
                  const fallbackExpr = codeExpr.fallback
                    ? clone(codeExpr.fallback)
                    : undefined;
                  const newExpr = createExprForDataPickerValue(
                    val,
                    fallbackExpr
                  );
                  onChange(
                    new ExprText({
                      expr: newExpr,
                      html: text.html,
                    })
                  );
                }}
                onUnlink={() => {
                  const fallbackText =
                    (codeExpr &&
                      isKnownCustomCode(codeExpr.fallback) &&
                      tryExtractString(codeExpr.fallback)) ||
                    "";
                  onChange(
                    new RawText({
                      text: fallbackText,
                      markers: [],
                    })
                  );
                }}
                visible={isDataPickerVisible}
                setVisible={setIsDataPickerVisible}
                isDisabled={isDisabled}
                disabledTooltip={disabledTooltip}
                data={viewCtx.getCanvasEnvForTpl(tpl)}
                schema={viewCtx.customFunctionsSchema()}
                flatten={true}
                key={tpl.uid}
                context="The text content to be displayed"
              />
            ) : (
              <TextEditor
                viewCtx={viewCtx}
                text={text}
                tpl={textTpl}
                setState={setState}
                isDisabled={isDisabled}
              />
            )}
          </MaybeWrap>
        </ContextMenuIndicator>
      </LabeledItemRow>
      {isKnownExprText(text) && showFallback && (
        <FallbackEditor
          isSet={isFallbackSet(text.expr)}
          definedIndicator={indicator}
          onUnset={() => {
            assert(
              codeExpr,
              "Unexpected undefined value, codeExpr must be defined when data binding"
            );
            const newExpr = ensureInstance(
              clone(codeExpr),
              ObjectPath,
              CustomCode
            );
            newExpr.fallback = undefined;
            viewCtx.change(() => {
              text.expr = newExpr;
            });
          }}
        >
          <StringPropEditor
            value={
              codeExpr && codeExpr.fallback
                ? asCode(codeExpr.fallback, exprCtx).code.slice(1, -1)
                : undefined
            }
            onChange={(val) => {
              if (!val) {
                return;
              }
              assert(
                codeExpr,
                "Unexpected undefined value, codeExpr must be defined when data binding"
              );
              const newExpr = ensureInstance(
                clone(codeExpr),
                ObjectPath,
                CustomCode
              );
              newExpr.fallback = codeLit(val);
              viewCtx.change(() => {
                text.expr = newExpr;
              });
            }}
            disabled={isDisabled ?? false}
            leftAligned
          />
        </FallbackEditor>
      )}
      {isKnownExprText(text) && (
        <LabeledItemRow
          label={
            <LabelWithDetailedTooltip
              tooltip={
                <div>If set, treat custom code expression content as HTML.</div>
              }
            >
              HTML?
            </LabelWithDetailedTooltip>
          }
        >
          <div className="flex justify-start flex-fill">
            <StyleSwitch
              isChecked={text.html}
              onChange={(html) => {
                viewCtx.change(() => {
                  text.html = html;
                });
              }}
              isDisabled={isDisabled}
              disabledTooltip={disabledTooltip}
            >
              {null}
            </StyleSwitch>
          </div>
        </LabeledItemRow>
      )}
    </>
  );
});

const TextEditor = observer(function TextEditor_(props: {
  viewCtx: ViewCtx;
  tpl: TplTag;
  text: RichText | undefined;
  setState: ValueSetState | undefined;
  isDisabled: boolean | undefined;
}) {
  const { viewCtx, tpl, text, setState, isDisabled } = props;
  if (!text) {
    return null;
  }
  return (
    <button
      className={cx(
        "property-editor text-ellipsis flex-fill text-align-left right-panel-input-background",
        {
          "text-set": setState === "isSet",
          "text-unset": setState === "isInherited",
        }
      )}
      onClick={() => {
        if (!isDisabled) {
          viewCtx.change(() => {
            const sel = viewCtx.maybeTpl2ValsInContext(tpl);
            viewCtx.getViewOps().tryEditText({ focusObj: sel[0] });
          });
        }
      }}
    >
      {getRichTextContent(text, viewCtx)}
    </button>
  );
});
