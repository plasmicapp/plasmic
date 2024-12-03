import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { resolvedBackgroundImageCss } from "@/wab/client/components/sidebar-tabs/background-section";
import { EditMixinButton } from "@/wab/client/components/sidebar/MixinControls";
import { ColorSwatch } from "@/wab/client/components/style-controls/ColorSwatch";
import styles from "@/wab/client/components/style-controls/DefinedIndicator.module.sass";
import { ImagePreview } from "@/wab/client/components/style-controls/ImageSelector";
import { getLabelForStyleName } from "@/wab/client/components/style-controls/StyleComponent";
import { IFrameAwareDropdownMenu } from "@/wab/client/components/widgets";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import MenuButton from "@/wab/client/components/widgets/MenuButton";
import { getVisibilityIcon } from "@/wab/client/icons";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import ComponentBaseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ComponentBase";
import DotsVerticalIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__DotsVertical";
import GlobeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Globe";
import MixinIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Mixin";
import SlotIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Slot";
import ThemeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Theme";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import VariantGroupIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__VariantGroup";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { removeFromArray } from "@/wab/commons/collections";
import { joinReactNodes } from "@/wab/commons/components/ReactUtil";
import { derefTokenRefs, tryParseTokenRef } from "@/wab/commons/StyleToken";
import * as cssPegParser from "@/wab/gen/cssPegParser";
import {
  computedProjectFlags,
  TokenValueResolver,
} from "@/wab/shared/cached-selectors";
import { cx, ensure, ensureArray, swallow } from "@/wab/shared/common";
import { BackgroundLayer } from "@/wab/shared/core/bg-styles";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import { ExprCtx, summarizeExpr, tryExtractLit } from "@/wab/shared/core/exprs";
import { allStyleTokens } from "@/wab/shared/core/sites";
import { sourceMatchThemeStyle } from "@/wab/shared/core/styles";
import { isTplComponent, isTplTag } from "@/wab/shared/core/tpls";
import {
  DefinedIndicatorType,
  isTargetOverwritten,
  VariantSettingSource,
  VariantSettingSourceStack,
} from "@/wab/shared/defined-indicator";
import {
  MIXIN_CAP,
  MIXIN_LOWER,
  MIXINS_CAP,
  SLOT_CAP,
  VARIANT_LOWER,
  VARIANTS_LOWER,
} from "@/wab/shared/Labels";
import {
  Expr,
  isKnownCustomCode,
  isKnownExprText,
  isKnownImageAssetRef,
  isKnownRawText,
  RawText,
  Site,
  TplNode,
  Variant,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { RSH, splitCssValue } from "@/wab/shared/RuleSetHelpers";
import { Chroma } from "@/wab/shared/utils/color-utils";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  clearVariantSetting,
  isBaseVariant,
  isDefaultIgnorableStyleValue,
  isGlobalVariant,
  isPrivateStyleVariant,
  isStyleVariant,
  unclearableBaseStyleProps,
  VariantCombo,
} from "@/wab/shared/Variants";
import {
  clearTplVisibility,
  getVariantSettingVisibility,
  getVisibilityLabel,
} from "@/wab/shared/visibility-utils";
import { Alert, Menu, Popover, Tooltip } from "antd";
import classNames from "classnames";
import L from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

export const variantComboName = (combo: VariantCombo) => {
  const variantName = (variant: Variant) => {
    if (isPrivateStyleVariant(variant)) {
      return `element:${ensure(
        variant.selectors,
        "style variants have selectors"
      ).join(":")}`;
    } else if (isStyleVariant(variant)) {
      return `:${ensure(
        variant.selectors,
        "style variants have selectors"
      ).join(":")}`;
    } else if (isBaseVariant(variant)) {
      return "Base";
    } else {
      return variant.name;
    }
  };
  return combo.map((v) => variantName(v)).join("-");
};

export function getStylePropValue(
  clientTokenResolver: TokenValueResolver,
  site: Site,
  prop: string | undefined,
  value: string,
  vsh?: VariantedStylesHelper
) {
  vsh = vsh ?? new VariantedStylesHelper();

  const allTokens = allStyleTokens(site, { includeDeps: "all" });
  const values = splitCssValue(prop, value);

  const renderValue = (val: string) => {
    const token = tryParseTokenRef(val, allTokens);
    if (token) {
      val = derefTokenRefs(allTokens, val, vsh);
    }

    const parsedBgImg: BackgroundLayer = swallow(() =>
      cssPegParser.parse(val, { startRule: "backgroundLayer" })
    );

    // We also check isNaN because sometimes numbers get interpreted
    const isColor = Chroma.valid(val) && isNaN(+val);
    const displayValue = isColor ? (
      <span>
        <ColorSwatch color={val} />
      </span>
    ) : parsedBgImg ? (
      <div
        style={{
          width: 24,
          height: 24,
          display: "inline-block",
          backgroundSize: "cover",
          backgroundImage: resolvedBackgroundImageCss(
            parsedBgImg.image,
            clientTokenResolver,
            site,
            vsh
          ),
        }}
      />
    ) : (
      <code>{val}</code>
    );
    if (token) {
      return (
        <Tooltip title={<code>{token.name}</code>}>
          <div className="flex flex-vcenter">
            {<Icon icon={TokenIcon} className="dimfg mr-ch" />}
            {displayValue}
          </div>
        </Tooltip>
      );
    } else if (isColor) {
      return (
        <Tooltip title={<code>{Chroma(val).hex()}</code>}>
          {displayValue}
        </Tooltip>
      );
    } else {
      return <Tooltip title={<code>{val}</code>}>{displayValue}</Tooltip>;
    }
  };

  if (values.length === 1) {
    return renderValue(values[0]);
  } else {
    return joinReactNodes(
      values.map((v) => renderValue(v)),
      ", "
    );
  }
}

function showExpr(expr: Expr, exprCtx: ExprCtx) {
  if (isKnownImageAssetRef(expr) && expr.asset.dataUri) {
    return (
      <ImagePreview
        uri={expr.asset.dataUri}
        style={{ width: 24, height: 24 }}
      />
    );
  } else {
    return summarizeExpr(expr, exprCtx);
  }
}

export const SourceValue = observer(function SourceValue(props: {
  site: Site;
  source: VariantSettingSource;
  editable: boolean;
  onShowPopup?: (showing: boolean) => void;
}) {
  const { site, source, editable, onShowPopup } = props;
  const clientTokenResolver = useClientTokenResolver();
  const exprCtx: ExprCtx = {
    projectFlags: computedProjectFlags(site),
    // TODO: get the actual component
    component: null,
    inStudio: true,
  };
  if (source.type === "theme") {
    if (site.themes.includes(source.theme)) {
      // We're using a theme in this project, so it can be edited.
      return (
        <Tooltip title={`Edit theme ${source.theme.defaultStyle.name}`}>
          <div>
            <EditMixinButton
              mixin={source.theme.defaultStyle}
              className="defined-indicator__edit-button code flex flex-vcenter"
              onShowPopup={onShowPopup}
            >
              {getStylePropValue(
                clientTokenResolver,
                site,
                source.prop,
                source.value
              )}
            </EditMixinButton>
          </div>
        </Tooltip>
      );
    } else {
      // We're using a theme from a dependency, so it can't be edited.
      return (
        <div className="flex flex-vcenter">
          {getStylePropValue(
            clientTokenResolver,
            site,
            source.prop,
            source.value
          )}
        </div>
      );
    }
  } else if (source.type === "themeTag") {
    if (site.themes.includes(source.theme)) {
      return (
        <Tooltip title={`Edit default ${source.selector} style`}>
          <div>
            <EditMixinButton
              mixin={
                ensure(
                  source.theme.styles.find((s) =>
                    sourceMatchThemeStyle(s, source)
                  ),
                  "Theme must exist"
                ).style
              }
              className="defined-indicator__edit-button code flex flex-vcenter"
              onShowPopup={onShowPopup}
              tag={source.selector.split(":")[0]}
            >
              {getStylePropValue(
                clientTokenResolver,
                site,
                source.prop,
                source.value
              )}
            </EditMixinButton>
          </div>
        </Tooltip>
      );
    } else {
      return (
        <div className="flex flex-vcenter">
          {getStylePropValue(
            clientTokenResolver,
            site,
            source.prop,
            source.value
          )}
        </div>
      );
    }
  } else if (source.type === "mixin") {
    if (editable) {
      return (
        <Tooltip title={`Edit ${MIXIN_LOWER} ${source.mixin.name}`}>
          <div>
            <EditMixinButton
              mixin={source.mixin}
              className="defined-indicator__edit-button code flex flex-vcenter"
              onShowPopup={onShowPopup}
            >
              <Icon icon={MixinIcon} className="mr-ch" />
              {getStylePropValue(
                clientTokenResolver,
                site,
                source.prop,
                source.value
              )}
            </EditMixinButton>
          </div>
        </Tooltip>
      );
    } else {
      return (
        <div className="flex flex-vcenter">
          <Tooltip title={`${MIXIN_CAP} ${source.mixin.name}`}>
            <Icon icon={MixinIcon} className="mr-ch" />
          </Tooltip>
          {getStylePropValue(
            clientTokenResolver,
            site,
            source.prop,
            source.value
          )}
        </div>
      );
    }
  } else if (source.type === "arg") {
    const param = ensure(
      source.component.params.find((p) => source.value.param === p),
      "param must exist"
    );
    const vg = source.component.variantGroups.find(
      (_vg) => _vg.param === param
    );
    if (vg) {
      const selectedVariantIds = ensureArray(tryExtractLit(source.value.expr));
      if (selectedVariantIds.length > 0) {
        const variants = vg.variants.filter((v) =>
          selectedVariantIds.includes(v.uuid)
        );
        return (
          <Tooltip title={variants.map((v) => v.name).join(", ")}>
            <code>{variants.map((v) => v.name).join(", ")}</code>
          </Tooltip>
        );
      } else {
        return <code>(unset)</code>;
      }
    } else {
      return (
        <Tooltip title={summarizeExpr(source.value.expr, exprCtx)}>
          <code>{showExpr(source.value.expr, exprCtx)}</code>
        </Tooltip>
      );
    }
  } else if (source.type === "attr") {
    return (
      <Tooltip title={summarizeExpr(source.value, exprCtx)}>
        <code>{showExpr(source.value, exprCtx)}</code>
      </Tooltip>
    );
  } else if (source.type === "slot") {
    return (
      <div className="flex flex-vcenter">
        <Tooltip title={`${SLOT_CAP}: ${source.param.variable.name}`}>
          <Icon icon={SlotIcon} className="mr-ch" />
        </Tooltip>
        {getStylePropValue(
          clientTokenResolver,
          site,
          source.prop,
          source.value
        )}
      </div>
    );
  } else if (source.type === "sel") {
    return (
      <div className="flex flex-vcenter">
        <Tooltip title={`Prop: ${source.sel.slotParam.variable.name}`}>
          <Icon icon={SlotIcon} className="mr-ch" />
        </Tooltip>
        {getStylePropValue(
          clientTokenResolver,
          site,
          source.prop,
          source.value
        )}
      </div>
    );
  } else if (source.type === "visibility") {
    return (
      <Tooltip title={getVisibilityLabel(source.value)}>
        {getVisibilityIcon(source.value)}
      </Tooltip>
    );
  } else if (source.type === "text") {
    return (
      <Tooltip title={source.value}>
        <div className={"fill-width"}>
          <code>{source.value}</code>
        </div>
      </Tooltip>
    );
  } else if (source.type === "columnsConfig") {
    return (
      <Tooltip title={`Responsive section: ${source.value}`}>
        <div className={"fill-width"}>
          <code>{source.value}</code>
        </div>
      </Tooltip>
    );
  } else {
    // type="style"
    let display = source.value;
    if (source.prop === "position") {
      if (display === "absolute") {
        display = "free";
      }
      if (display === "relative") {
        display = "auto";
      }
    } else if (source.prop === "width" || source.prop === "height") {
      if (display === "wrap") {
        display = "hug content";
      }
    } else if (source.prop === "display") {
      if (display === "flex") {
        display = "stack";
      }
      if (display === "block") {
        display = "free";
      }
    }
    const rendered = getStylePropValue(
      clientTokenResolver,
      site,
      source.prop,
      display
    );
    if (source.isDerived) {
      return <>{rendered} (derived)</>;
    } else {
      return rendered;
    }
  }
});

const VariantSourceStack = observer(function VariantSourceStack(props: {
  stack: VariantSettingSourceStack;
  targetSource?: VariantSettingSource;
  onShowPopup?: (showing: boolean) => void;
  menu?: React.ReactNode | (() => React.ReactNode);
}) {
  const { stack, targetSource, onShowPopup } = props;
  const studioCtx = useStudioCtx();
  return (
    <div className="defined-indicator__source-stack">
      <div className="defined-indicator__source-stack__line-container">
        <div className="defined-indicator__source-stack__line-container__line" />
      </div>
      {stack.map((source, i) => {
        const sourceName =
          source.type === "theme"
            ? source.theme.defaultStyle.name
            : source.type === "themeTag"
            ? `Default "${source.selector}"`
            : source.type === "sel"
            ? `${getComponentDisplayName(source.sel.getTpl().component)}.${
                source.sel.slotParam.variable.name
              } at ${variantComboName(source.slotCombo)}`
            : source.type === "slot"
            ? `${SLOT_CAP} "${
                source.param.variable.name
              }" at ${variantComboName(source.combo)}`
            : variantComboName(source.combo);
        return (
          <SourceRow
            key={i}
            title={sourceName}
            icon={
              source.type === "theme" || source.type === "themeTag" ? (
                <Icon icon={ThemeIcon} />
              ) : source.type === "slot" ? (
                <Icon icon={SlotIcon} />
              ) : source.type === "sel" ? (
                <Icon icon={SlotIcon} />
              ) : isBaseVariant(source.combo) ? (
                <Icon icon={ComponentBaseIcon} />
              ) : source.combo.every((v) => isGlobalVariant(v)) ? (
                <Icon icon={GlobeIcon} />
              ) : (
                <Icon icon={VariantGroupIcon} />
              )
            }
            type={
              source === targetSource
                ? "target"
                : i !== stack.length - 1
                ? "overwritten"
                : undefined
            }
          >
            <SourceValue
              site={studioCtx.site}
              source={source}
              editable={source === targetSource}
              onShowPopup={onShowPopup}
            />
          </SourceRow>
        );
      })}
    </div>
  );
});

export function SourceRow(props: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  type?: "overwritten" | "target";
  onClear?: () => void;
}) {
  const { title, icon, children, type, onClear } = props;
  return (
    <div
      className={cx({
        "defined-indicator__source": true,
        "defined-indicator__source--overwritten": type === "overwritten",
        "defined-indicator__source--target": type === "target",
      })}
    >
      {icon && <div className="defined-indicator__source-icon">{icon}</div>}
      <Tooltip title={title}>
        <div className="defined-indicator__source-name">{title}</div>
      </Tooltip>
      <div className="defined-indicator__source-value">{children}</div>
      {onClear && (
        <IconButton
          className="ml-ch"
          data-test-class="indicator-clear"
          type="seamless"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          tooltip="Unset"
        >
          <Icon icon={CloseIcon} />
        </IconButton>
      )}
    </div>
  );
}

export function mergedIndicatorSource(
  indicators: DefinedIndicatorType[]
): DefinedIndicatorType["source"] {
  indicators = indicators.filter((x) => x.source !== "none");
  if (indicators.length === 0) {
    return "none";
  } else if (indicators.length === 1) {
    return indicators[0].source;
  } else {
    const type = (
      [
        "set",
        "setNonVariable",
        "derived",
        "mixin",
        "otherVariants",
        "theme",
      ] as DefinedIndicatorType["source"][]
    ).find((x) => indicators.some((y) => y.source === x));
    return type || "none";
  }
}

const PopoverContent = observer(function PopoverContent(props: {
  alwaysShowPropLabel?: React.ReactNode;
  types: DefinedIndicatorType[];
  onShowPopup: (showing: boolean) => void;
}) {
  const types = props.types.filter((type) => type.source !== "none");
  const studioCtx = useStudioCtx();
  const clientTokenResolver = useClientTokenResolver();

  const renderIndicator = (type: DefinedIndicatorType) => {
    if (type.source === "none" || type.source === "invariantable") {
      return null;
    } else if (type.source === "setNonVariable") {
      return (
        <div className="defined-indicator__source defined-indicator__source--target">
          <div className="defined-indicator__source-name">
            {types.length === 1
              ? "Value is set"
              : getLabelForStyleName(type.prop)}
          </div>
          <div className="defined-indicator__source-value">
            {getStylePropValue(
              clientTokenResolver,
              studioCtx.site,
              type.prop,
              type.value
            )}
          </div>
        </div>
      );
    } else {
      return (
        <VariantSourceStack
          stack={type.stack}
          targetSource={
            type.source !== "theme" && type.source !== "slot"
              ? type.targetSource
              : undefined
          }
          onShowPopup={props.onShowPopup}
        />
      );
    }
  };

  const prefix = isTargetOverwritten(types) && (
    <Alert
      className="mb-sm"
      type="info"
      message={
        <>
          Your settings in target {VARIANT_LOWER} are overwritten by other
          visible {VARIANTS_LOWER}.
        </>
      }
    />
  );

  if (types.length === 0) {
    return null;
  } else if (types.length === 1 && !props.alwaysShowPropLabel) {
    // If there's only one type, then just use the popover's title
    // as the prop title, unless overridden by props.alwaysShowPropLabel
    return (
      <>
        {prefix}
        {renderIndicator(types[0])}
      </>
    );
  } else {
    return (
      <>
        {prefix}
        {types.map((type, i) => {
          if (type.source === "none" || type.source === "invariantable") {
            return null;
          }

          if (type.source === "setNonVariable") {
            return (
              <div className="defined-indicator__prop" key={i}>
                {renderIndicator(type)}
              </div>
            );
          }
          const lastSource = L.last(type.stack);
          const sourceLabel = lastSource
            ? ((source: VariantSettingSource) => {
                if (source.type === "arg") {
                  return source.value.param.variable.name;
                } else if (source.type === "attr") {
                  return source.attr;
                } else if (source.type === "visibility") {
                  return "Visibility";
                } else if (source.type === "text") {
                  return "Text";
                } else if (source.type === "columnsConfig") {
                  return "Responsive Section";
                } else {
                  return getLabelForStyleName(source.prop);
                }
              })(lastSource)
            : undefined;

          return (
            <div className="defined-indicator__prop" key={i}>
              {sourceLabel && (
                <div className="defined-indicator__prop__label">
                  {sourceLabel}
                </div>
              )}
              {renderIndicator(type)}
            </div>
          );
        })}
      </>
    );
  }
});

export const DefinedIndicator = observer(DefinedIndicator_);
function DefinedIndicator_(props: {
  type: DefinedIndicatorType | DefinedIndicatorType[];
  label?: React.ReactNode;
  menu?: React.ReactNode | (() => React.ReactNode);
  alwaysShowPropLabel?: boolean;
  className?: string;
}) {
  const studioCtx = useStudioCtx();

  const isEditingNonBaseVariant =
    studioCtx.focusedViewCtx()?.isEditingNonBaseVariant;

  const { type, label, menu, alwaysShowPropLabel } = props;
  const [visible, setVisible] = React.useState(false);
  const types = ensureArray(type);
  if (types.every((_t) => _t.source === "none")) {
    return null;
  }
  const indicatorType = types.some(
    (_t) => _t.source === "set" || _t.source === "setNonVariable"
  )
    ? "set"
    : types.some((_t) => _t.source === "derived")
    ? "derived"
    : types.some((_t) => _t.source === "mixin")
    ? "mixin"
    : types.some(
        (_t) => _t.source === "otherVariants" && !_t.targetHasHighestPriority
      )
    ? "overwritten"
    : types.some((_t) => _t.source === "otherVariants")
    ? "otherVariants"
    : types.some((_t) => _t.source === "slot")
    ? "slot"
    : types.some((_t) => _t.source === "theme")
    ? "theme"
    : undefined;
  return (
    <Popover
      overlayClassName="defined-indicator__popover group"
      trigger="hover"
      destroyTooltipOnHide={false}
      title={
        label && (
          <div className="flex flex-vcenter">
            {label}
            <div className="flex flex-vcenter flex-push-right">
              {menu && (
                <IFrameAwareDropdownMenu menu={menu}>
                  <Icon
                    icon={DotsVerticalIcon}
                    className={`dimfg visible-on-group-hover`}
                  />
                </IFrameAwareDropdownMenu>
              )}
            </div>
          </div>
        )
      }
      content={() => (
        <PopoverContent
          types={types}
          onShowPopup={() => setVisible(false)}
          alwaysShowPropLabel={alwaysShowPropLabel}
        />
      )}
      visible={visible}
      onVisibleChange={(_v) => setVisible(_v)}
    >
      <div className={cx(styles.DefinedIndicatorContainer, props.className)}>
        <div
          className={classNames({
            [styles.DefinedIndicator]: true,
            [styles["DefinedIndicator--set"]]:
              indicatorType === "set" && !isEditingNonBaseVariant,
            [styles["DefinedIndicator--overriding"]]:
              indicatorType === "set" && isEditingNonBaseVariant,
            [styles["DefinedIndicator--derived"]]: indicatorType === "derived",
            [styles["DefinedIndicator--inherited"]]:
              indicatorType === "otherVariants",
            [styles["DefinedIndicator--overwritten"]]:
              indicatorType === "overwritten",
            [styles["DefinedIndicator--mixin"]]: indicatorType === "mixin",
            [styles["DefinedIndicator--theme"]]: indicatorType === "theme",
            [styles["DefinedIndicator--slot"]]: indicatorType === "slot",
          })}
        />
      </div>
    </Popover>
  );
}

export const VariantSettingPopoverTitle = observer(
  function VariantSettingPopoverTitle(props: {
    vs: VariantSetting;
    children: React.ReactNode;
    viewCtx: ViewCtx;
  }) {
    const { children, viewCtx, vs } = props;
    const menu = () => {
      const builder = new MenuBuilder();
      builder.genSection(undefined, (push) => {
        push(
          <Menu.Item
            key="reset-all"
            onClick={() =>
              viewCtx.change(() => {
                clearVariantSetting(vs);
              })
            }
          >
            Reset all settings
          </Menu.Item>
        );
      });
      return builder.build({
        menuName: "defined-indicator-popover-menu",
      });
    };
    return (
      <div className="flex flex-vcenter">
        {children}
        <div className="flex flex-vcenter flex-push-right">
          <MenuButton menu={isBaseVariant(vs.variants) ? undefined : menu} />
        </div>
      </div>
    );
  }
);

export const VariantSettingPopoverContent = observer(
  function VariantSettingPopoverContent(props: {
    site: Site;
    tpl: TplNode;
    vs: VariantSetting;
    viewCtx: ViewCtx;
  }) {
    const { site, tpl, vs, viewCtx } = props;
    const exp = RSH(vs.rs, tpl);

    return (
      <>
        {vs.dataCond && (
          <SourceRow
            key="dataCond"
            title="Visibility"
            type="target"
            onClear={() =>
              viewCtx.change(() => clearTplVisibility(tpl, vs.variants))
            }
          >
            <SourceValue
              site={site}
              source={{
                type: "visibility",
                value: getVariantSettingVisibility(vs),
                combo: vs.variants,
              }}
              editable={false}
            />
          </SourceRow>
        )}
        {vs.text && (
          <SourceRow
            key="text"
            title="Text"
            type="target"
            onClear={() =>
              viewCtx.change(
                () =>
                  (vs.text = new RawText({
                    text: "",
                    markers: [],
                  }))
              )
            }
          >
            <SourceValue
              site={site}
              source={{
                type: "text",
                value: isKnownRawText(vs.text)
                  ? vs.text.text
                  : isKnownExprText(vs.text) && isKnownCustomCode(vs.text.expr)
                  ? vs.text.expr.code
                  : "(unknown)",
                combo: vs.variants,
              }}
              editable={false}
            />
          </SourceRow>
        )}
        {isTplTag(tpl) &&
          Object.entries(vs.attrs).map(
            ([attr, expr]) =>
              attr !== "type" &&
              attr !== "size" && (
                <SourceRow
                  key={attr}
                  title={getLabelForAttr(attr)}
                  type="target"
                  onClear={() => viewCtx.change(() => delete vs.attrs[attr])}
                >
                  <SourceValue
                    site={site}
                    source={{
                      type: "attr",
                      attr,
                      value: expr,
                      combo: vs.variants,
                    }}
                    editable={false}
                  />
                </SourceRow>
              )
          )}
        {isTplComponent(tpl) &&
          vs.args.map((arg) => (
            <SourceRow
              key={arg.uid}
              title={arg.param.variable.name}
              type="target"
              onClear={() =>
                viewCtx.change(() => removeFromArray(vs.args, arg))
              }
            >
              <SourceValue
                site={site}
                source={{
                  type: "arg",
                  value: arg,
                  component: tpl.component,
                  combo: vs.variants,
                }}
                editable={false}
              />
            </SourceRow>
          ))}
        {vs.rs.mixins.length > 0 && (
          <SourceRow
            key={"mixins"}
            title={MIXINS_CAP}
            type="target"
            onClear={() => viewCtx.change(() => (vs.rs.mixins = []))}
          >
            <Tooltip title={vs.rs.mixins.map((mixin) => mixin.name).join(", ")}>
              <div>
                {vs.rs.mixins.map((mixin) => (
                  <div className="dropdown-pill code mixin-bg">
                    <span className="dropdown-pill__contents">
                      {mixin.name}
                    </span>
                  </div>
                ))}
              </div>
            </Tooltip>
          </SourceRow>
        )}
        {exp
          .props()
          .filter(
            (prop) =>
              !isBaseVariant(vs.variants) ||
              !isDefaultIgnorableStyleValue(prop, exp.get(prop))
          )
          .map((prop) => (
            <SourceRow
              key={prop}
              title={getLabelForStyleName(prop)}
              type="target"
              onClear={
                !isBaseVariant(vs.variants) ||
                !unclearableBaseStyleProps.includes(prop)
                  ? () => viewCtx.change(() => exp.clear(prop))
                  : undefined
              }
            >
              <SourceValue
                site={site}
                source={{
                  type: "style",
                  prop,
                  value: exp.get(prop),
                  combo: vs.variants,
                }}
                editable={false}
              />
            </SourceRow>
          ))}
      </>
    );
  }
);

function getLabelForAttr(attr: string) {
  if (attr === "outerHTML") {
    return "icon";
  } else if (attr === "src") {
    return "image";
  } else {
    return attr;
  }
}
