import {
  inferPropTypeFromAttr,
  PropEditorRow,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import HandlerSection from "@/wab/client/components/sidebar-tabs/StateManagement/HandlerSection";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import {
  IconLinkButton,
  useOnIFrameMouseDown,
} from "@/wab/client/components/widgets";
import { AttributesTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { isAllowedDefaultExprForPropType } from "@/wab/shared/code-components/code-components";
import { arrayRemove } from "@/wab/shared/collections";
import { ensure, spawn, withoutNils } from "@/wab/shared/common";
import {
  clone,
  codeLit,
  extractReferencedParam,
  isAllowedDefaultExpr,
  tryExtractLit,
  tryExtractString,
} from "@/wab/shared/core/exprs";
import { ComponentPropOrigin } from "@/wab/shared/core/lang";
import { alwaysVisibleHTMLAttributes, metaSvc } from "@/wab/shared/core/metas";
import {
  isTagInline,
  textBlockTags,
  textInlineTags,
} from "@/wab/shared/core/rich-text-util";
import {
  EventHandlerKeyType,
  getDisplayNameOfEventHandlerKey,
  getEventHandlerByEventKey,
  isAttrEventHandler,
  isTplTag,
  isTplTextBlock,
  setEventHandlerByEventKey,
} from "@/wab/shared/core/tpls";
import {
  computeDefinedIndicator,
  DefinedIndicatorType,
} from "@/wab/shared/defined-indicator";
import { getInputTypeOptions } from "@/wab/shared/html-utils";
import {
  Component,
  Expr,
  isKnownEventHandler,
  isKnownParam,
  isKnownVarRef,
  TplComponent,
  TplTag,
} from "@/wab/shared/model/classes";
import { unsetTplVariantableAttr } from "@/wab/shared/TplMgr";
import { tryGetBaseVariantSetting } from "@/wab/shared/Variants";
import { notification, Popover, Select } from "antd";
import { RefSelectProps } from "antd/lib/select";
import L, { keyBy, orderBy, uniq, without } from "lodash";
import { observer } from "mobx-react";
import React from "react";

// Note: these should be JSX attributes, not HTML attributes.
const COMMON_GLOBAL_ATTRS = [
  "title",
  "tabIndex",
  "className",
  "id",
  "aria-label",
  "aria-hidden",
  "aria-labelledby",
  "aria-describedby",
  "role",
];
const COMMON_INPUT_ATTRS = [
  "type",
  "disabled",
  "value",
  "defaultValue",
  "name",
  "autoComplete",
  ...COMMON_GLOBAL_ATTRS,
];

export function getInputTagType(tpl: TplTag) {
  const vs = ensure(
    tryGetBaseVariantSetting(tpl),
    "Tpl should have base variant"
  );
  const expr = vs.attrs.type;
  return (expr && tryExtractString(expr)) || "text";
}

export function getEditableTagAttrs(viewCtx: ViewCtx, tpl: TplTag) {
  if (tpl.tag === "img") {
    return ["alt", "loading", ...COMMON_GLOBAL_ATTRS];
  } else if (tpl.tag === "a") {
    return ["href", "target", ...COMMON_GLOBAL_ATTRS];
  } else if (tpl.tag === "textarea") {
    // Note that even though textarea does not take `value` attr, we do use
    // `value` attr here to represent the content of the textarea.
    return [
      "disabled",
      "value",
      "cols",
      "rows",
      "placeholder",
      ...COMMON_GLOBAL_ATTRS,
    ];
  } else if (tpl.tag === "input") {
    const type = getInputTagType(tpl);
    const canSwitchType = !!getInputTypeOptions(type);
    const inputAttrs = [...COMMON_INPUT_ATTRS];
    if (!canSwitchType) {
      arrayRemove(inputAttrs, "type");
    }
    if (["checkbox", "radio"].includes(type)) {
      inputAttrs.push("checked");
    } else {
      inputAttrs.push("placeholder");
    }
    return inputAttrs;
  } else if (tpl.tag === "button") {
    return ["disabled", ...COMMON_GLOBAL_ATTRS];
  } else {
    return COMMON_GLOBAL_ATTRS;
  }
}

function getHiddenTagAttrs(tpl: TplTag) {
  if (tpl.tag === "img") {
    return ["width", "height"];
  }
  return [];
}

function switchableTags(tpl: TplTag) {
  if (tpl.tag === "input") {
    const typeExpr = ensure(
      tryGetBaseVariantSetting(tpl),
      "Tpl should have base variant"
    ).attrs.type;
    const type = (typeExpr && tryExtractLit(typeExpr)) || "text";
    if (type === "text") {
      return ["input", "textarea"];
    } else {
      return ["input"];
    }
  } else if (tpl.tag === "textarea") {
    return ["input", "textarea"];
  } else if (["img", "li", "ol", "ul"].includes(tpl.tag)) {
    // Unswitchable tags
    return [tpl.tag];
  } else if (isTplTextBlock(tpl.parent)) {
    // tpl is in a NodeMarker. We should not allow switching between
    // inline and block tags.
    if (isTagInline(tpl.tag)) {
      return textInlineTags;
    } else {
      return textBlockTags;
    }
  } else {
    return ALL_CONTAINER_TAGS;
  }
}

export const TAG_TO_DISPLAY_NAME = {
  div: "Box",
  button: "Button",
  a: "Link",
  h1: "H1",
  h2: "H2",
  h3: "H3",
  h4: "H4",
  h5: "H5",
  h6: "H6",
  hgroup: "Heading group",
  address: "Address",
  article: "Article",
  aside: "Aside",
  blockquote: "Blockquote",
  cite: "Citation",
  code: "Code",
  dl: "Description list",
  dt: "Term",
  dd: "Description",
  figure: "Figure",
  figcaption: "Figure caption",
  footer: "Footer",
  form: "Form",
  label: "Label",
  ul: "Unordered list",
  ol: "Ordered list",
  li: "List item",
  header: "Header",
  main: "Main",
  nav: "Nav",
  p: "Paragraph",
  pre: "Pre",
  section: "Section",
  span: "Span",
  input: "Input",
  textarea: "Text area",
  strong: "Strong",
  i: "Italic",
  em: "Emphasis",
  sub: "Subscript",
  sup: "Superscript",
};
const nonContainerTags = ["ul", "ol", "li"];
export const ALL_CONTAINER_TAGS = L.without(
  Object.keys(TAG_TO_DISPLAY_NAME),
  ...nonContainerTags
).sort();
export const TplTagSection = observer(TplTagSection_);

function TplTagSection_(props: { tpl: TplTag; viewCtx: ViewCtx }) {
  const { viewCtx, tpl } = props;
  const vtm = viewCtx.variantTplMgr();
  const baseVs = vtm.ensureBaseVariantSetting(tpl);

  const selectRef = React.useRef<RefSelectProps>(null);

  const allTagOptions = switchableTags(tpl);
  if (allTagOptions.length <= 1) {
    return null;
  }
  const commonTagOptions = allTagOptions.filter((tag) =>
    ["div", "button", "a", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)
  );
  const otherTagOptions = allTagOptions.filter(
    (tag) => !commonTagOptions.includes(tag)
  );

  return (
    <SidebarSection
      title={"Tag"}
      hasExtraContent={true}
      oneLiner
      controls={
        <div className="tag-select" style={{ width: "100%" }}>
          {allTagOptions.length > 1 && allTagOptions.includes(tpl.tag) && (
            <Select
              value={tpl.tag}
              data-test-class="tpl-tag-select"
              onChange={(tag) => {
                if (tag !== tpl.tag) {
                  viewCtx.change(() => {
                    tpl.tag = tag;

                    if (tag === "input") {
                      baseVs.attrs.type = codeLit("text");
                    }

                    // Delete all attrs that don't apply to the new tag
                    const newAttrs = getEditableTagAttrs(viewCtx, tpl);
                    for (const vs of tpl.vsettings) {
                      for (const attr of Object.keys(vs.attrs)) {
                        if (!newAttrs.includes(attr)) {
                          delete vs.attrs[attr];
                        }
                      }
                    }
                  });
                }
                if (selectRef.current) {
                  selectRef.current.blur();
                }
              }}
              className="textboxlike flex-no-shrink"
              suffixIcon={<Icon icon={TriangleBottomIcon} />}
              dropdownMatchSelectWidth={150}
              showSearch
              optionFilterProp="children"
              ref={selectRef}
            >
              <Select.OptGroup label="Common">
                {commonTagOptions.map((option) => (
                  <Select.Option key={option} value={option}>
                    {TAG_TO_DISPLAY_NAME[option] + " <" + option + ">"}
                  </Select.Option>
                ))}
              </Select.OptGroup>
              <Select.OptGroup label="Everything else">
                {otherTagOptions.map((option) => (
                  <Select.Option key={option} value={option}>
                    {TAG_TO_DISPLAY_NAME[option] + " <" + option + ">"}
                  </Select.Option>
                ))}
              </Select.OptGroup>
            </Select>
          )}
        </div>
      }
    />
  );
}

function isRequiredAttr(tag: string, attr: string) {
  if (tag === "input" && attr === "type") {
    return true;
  }
  return false;
}

function getEditableTagParams(viewCtx: ViewCtx, tpl: TplTag) {
  const attrs = getEditableTagAttrs(viewCtx, tpl).sort();
  const params = keyBy(viewCtx.tagMeta().paramsForTag(tpl.tag), (p) => p.name);
  return withoutNils(attrs.map((a) => params[a]));
}

/**
 * These are attrs for which we have special dedicated UI for configuring,
 * and so should never show up in the HTML attrs panel
 */
const SPECIAL_ATTRS = ["src", "outerHTML"];

interface AttrInfo {
  attr: string;
  defined: DefinedIndicatorType;
  alwaysVisible: boolean;
}

export const HTMLAttributesSection = observer(
  ({
    viewCtx,
    tpl,
    expsProvider,
    component,
  }: {
    viewCtx: ViewCtx;
    tpl: TplTag | TplComponent;
    expsProvider: TplExpsProvider;
    component: Component;
  }) => {
    const params = isTplTag(tpl)
      ? getEditableTagParams(viewCtx, tpl)
      : tpl.component.params.filter(
          (p) => p.origin === ComponentPropOrigin.ReactHTMLAttributes
        );
    const vtm = viewCtx.variantTplMgr();

    const baseVs = vtm.tryGetBaseVariantSetting(tpl);
    const curSharedVS = vtm.tryGetCurrentSharedVariantSetting(tpl);

    const [addedAttrs, setAddedAttrs] = React.useState<string[]>([]);
    const onHTMLPropChange = React.useCallback((attr: string) => {
      return (newExpr: Expr | undefined) => {
        if (!newExpr) {
          if (addedAttrs.includes(attr)) {
            setAddedAttrs(without(addedAttrs, attr));
          }
        }
      };
    }, []);

    const [addedEventHandlerKey, setAddedEventHandlerKey] = React.useState<
      EventHandlerKeyType | undefined
    >(undefined);

    // When a new tpl is selected, reset addedAttrs
    React.useEffect(() => {
      setAddedAttrs([]);
    }, [tpl.uuid]);

    if (params.length === 0 || !baseVs || !curSharedVS) {
      return null;
    }

    const effectiveVs = expsProvider.effectiveVs();

    const attrsToHide = isTplTag(tpl) ? getHiddenTagAttrs(tpl) : [];
    const attrs = uniq([
      // Explicitly added
      ...addedAttrs,
      // Explicitly set
      ...Object.keys(effectiveVs.attrs).filter(
        (attr) =>
          !SPECIAL_ATTRS.includes(attr) &&
          !isAttrEventHandler(attr) &&
          !attrsToHide.includes(attr)
      ),
      // Always show by default for this tag type
      ...params.map((it) => (isKnownParam(it) ? it.variable.name : it.name)),
    ]);

    const attrInfos = attrs.map((attr) => {
      const attrSource = effectiveVs.getAttrSource(attr);
      const defined = computeDefinedIndicator(
        viewCtx.site,
        viewCtx.currentComponent(),
        attrSource,
        expsProvider.targetIndicatorCombo
      );

      return {
        attr,
        defined,
        alwaysVisible:
          alwaysVisibleHTMLAttributes.has(attr) || addedAttrs.includes(attr),
      } as AttrInfo;
    });

    const ariaAttrInfos = attrInfos.filter(
      (attr) => /aria-/i.test(attr.attr) || ["role", "id"].includes(attr.attr)
    );
    const otherAttrInfos = attrInfos.filter((a) => !ariaAttrInfos.includes(a));

    const orderedAttrInfos = orderBy(
      otherAttrInfos,
      [
        (it) => it.attr === "type",
        (it) => it.attr === "value",
        (it) => it.attr === "placeholder",
        (it) => it.attr,
      ],
      ["desc", "desc", "desc", "asc"]
    );

    const orderedAriaAttrInfos = orderBy(
      ariaAttrInfos,
      [(it) => it.attr === "id", (it) => it.attr === "role", (it) => it.attr],
      ["desc", "desc", "asc"]
    );

    const makeMaybeCollapsibleEditorRow = ({
      attr,
      defined,
      alwaysVisible,
    }: AttrInfo) => ({
      collapsible: !alwaysVisible && defined.source === "none",
      content: (
        <HTMLAttributePropEditor
          viewCtx={viewCtx}
          expsProvider={expsProvider}
          tpl={tpl}
          attr={attr}
          onChange={onHTMLPropChange(attr)}
        />
      ),
    });

    return (
      <>
        <SidebarSection
          title={
            <LabelWithDetailedTooltip tooltip={AttributesTooltip}>
              HTML attributes
            </LabelWithDetailedTooltip>
          }
          hasExtraContent
          fullyCollapsible
          data-test-id="html-attributes-section"
          controls={
            <AddHtmlAttrButton
              tag={isTplTag(tpl) ? tpl.tag : "div"}
              onSelect={(attr) => {
                if (!isAttrEventHandler(attr)) {
                  setAddedAttrs([...addedAttrs, attr]);
                } else {
                  setAddedEventHandlerKey({ attr });
                }
              }}
            />
          }
        >
          {(renderMaybeCollapsibleRows) =>
            renderMaybeCollapsibleRows(
              [
                ...orderedAttrInfos.map(makeMaybeCollapsibleEditorRow),
                {
                  collapsible: true,
                  content: <div className="Separator mv-sm" />,
                },
                ...orderedAriaAttrInfos.map(makeMaybeCollapsibleEditorRow),
              ],
              { alwaysVisible: true }
            )
          }
        </SidebarSection>
        {addedEventHandlerKey && (
          <InteractionModal
            viewCtx={viewCtx}
            component={component}
            tpl={tpl}
            eventHandlerKey={addedEventHandlerKey}
            onClose={() => {
              setAddedEventHandlerKey(undefined);
            }}
          />
        )}
      </>
    );
  }
);

function AddHtmlAttrButton(props: {
  tag: string;
  onSelect: (attr: string) => void;
}) {
  const { tag, onSelect } = props;
  const params = metaSvc.paramsForTag(tag);
  const [searchValue, setSearchValue] = React.useState<string | undefined>(
    undefined
  );
  const [showing, setShowing] = React.useState(false);
  const selectRef = React.useRef<RefSelectProps>(null);
  useOnIFrameMouseDown(() => {
    setShowing(false);
  });
  return (
    <Popover
      trigger={["click"]}
      onVisibleChange={(visible) => {
        setShowing(visible);
        setSearchValue(undefined);
        if (visible) {
          selectRef.current?.focus();
        }
      }}
      overlayClassName="ant-popover--tight"
      visible={showing}
      placement={"left"}
      destroyTooltipOnHide
      content={
        <Select
          showSearch={true}
          searchValue={searchValue}
          onSearch={(val) => setSearchValue(val)}
          onSelect={(val) => {
            onSelect(val as string);
            setShowing(false);
          }}
          onBlur={() => setShowing(false)}
          style={{
            width: 200,
          }}
          autoFocus
          bordered={false}
          ref={selectRef}
          placeholder="Search or enter any attribute"
          open
        >
          {searchValue && (
            <Select.Option key={"__custom__"} value={searchValue}>
              {searchValue}
            </Select.Option>
          )}
          {params.map((p) =>
            SPECIAL_ATTRS.includes(p.name) ? null : (
              <Select.Option key={p.name} value={p.name}>
                {p.name}
              </Select.Option>
            )
          )}
        </Select>
      }
    >
      <IconLinkButton data-test-id="add-html-attribute">
        <Icon icon={PlusIcon} />
      </IconLinkButton>
    </Popover>
  );
}

function InteractionModal({
  eventHandlerKey,
  component,
  tpl,
  viewCtx,
  onClose,
}: {
  eventHandlerKey: EventHandlerKeyType;
  component: Component;
  tpl: TplTag | TplComponent;
  viewCtx: ViewCtx;
  onClose: () => void;
}) {
  const [showInteractionModal, setShowInteractionModal] = React.useState(true);
  const maybeEventHandler = eventHandlerKey
    ? getEventHandlerByEventKey(component, tpl, eventHandlerKey)
    : undefined;
  if (
    !eventHandlerKey ||
    (maybeEventHandler && !isKnownEventHandler(maybeEventHandler))
  ) {
    return null;
  }
  return (
    <SidebarModal
      title={getDisplayNameOfEventHandlerKey(eventHandlerKey, { tpl })}
      show={showInteractionModal}
      onClose={() => {
        setShowInteractionModal(false);
        onClose();
      }}
    >
      <HandlerSection
        tpl={tpl}
        sc={viewCtx.studioCtx}
        vc={viewCtx}
        component={component}
        keyedEventHandler={{
          key: eventHandlerKey,
          handler: maybeEventHandler,
        }}
        onChange={(newExpr) =>
          spawn(
            viewCtx.studioCtx.change(({ success }) => {
              const expr = getEventHandlerByEventKey(
                component,
                tpl,
                eventHandlerKey
              );
              if (isKnownVarRef(expr)) {
                const param = ensure(
                  extractReferencedParam(component, expr),
                  `param not found for variable ${expr.variable.name}`
                );
                if (isAllowedDefaultExpr(newExpr)) {
                  param.defaultExpr = newExpr;
                } else {
                  notification.error({
                    message: `Cannot set that as the default value for ${param.variable.name}`,
                  });
                }
              } else {
                setEventHandlerByEventKey(tpl, eventHandlerKey, newExpr);
              }
              return success();
            })
          )
        }
      />
    </SidebarModal>
  );
}

interface HTMLAttributePropEditorProps {
  viewCtx: ViewCtx;
  tpl: TplTag | TplComponent;
  expsProvider: TplExpsProvider;
  attr: string;
  onChange?: (newExpr: Expr | undefined) => void;
}

export function HTMLAttributePropEditor(props: HTMLAttributePropEditorProps) {
  const { viewCtx, tpl, expsProvider, attr, onChange } = props;
  const vtm = viewCtx.variantTplMgr();
  const effectiveVs = expsProvider.effectiveVs();
  const baseVs = vtm.tryGetBaseVariantSetting(tpl);
  const curSharedVS = vtm.tryGetCurrentSharedVariantSetting(tpl);

  if (!curSharedVS || !baseVs) {
    return null;
  }

  const expr = effectiveVs.attrs[attr];
  const attrSource = effectiveVs.getAttrSource(attr);
  const defined = computeDefinedIndicator(
    viewCtx.site,
    viewCtx.currentComponent(),
    attrSource,
    expsProvider.targetIndicatorCombo
  );

  return (
    <PropEditorRow
      key={attr}
      attr={attr}
      propType={inferPropTypeFromAttr(viewCtx, tpl, attr) ?? "string"}
      expr={expr}
      label={viewCtx.tagMeta().expandLabel(attr) || attr}
      definedIndicator={defined}
      onDelete={
        (isTplTag(tpl) && isRequiredAttr(tpl.tag, attr)) ||
        defined.source !== "set" ||
        isKnownVarRef(expr)
          ? undefined
          : () => {
              viewCtx.change(() => {
                delete curSharedVS.attrs[attr];
              });
            }
      }
      onChange={(newExpr) =>
        viewCtx.change(() => {
          if (newExpr) {
            const isVarRef = isKnownVarRef(newExpr);
            const targetVs = isVarRef ? baseVs : curSharedVS;
            if (isVarRef) {
              unsetTplVariantableAttr(tpl, attr);
              const referencedParam = extractReferencedParam(
                viewCtx.currentComponent(),
                newExpr
              );
              if (
                referencedParam &&
                expr &&
                isAllowedDefaultExpr(expr) &&
                isAllowedDefaultExprForPropType(
                  inferPropTypeFromAttr(viewCtx, tpl, attr) ?? "string"
                )
              ) {
                referencedParam.defaultExpr = clone(expr);
              }
            }
            targetVs.attrs[attr] = newExpr;
          } else {
            const targetVs = isKnownVarRef(expr) ? baseVs : curSharedVS;
            delete targetVs.attrs[attr];
          }
          onChange?.(newExpr);
        })
      }
      tpl={tpl}
      viewCtx={viewCtx}
    />
  );
}
