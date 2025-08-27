import {
  maybeShowContextMenu,
  WithContextMenu,
} from "@/wab/client/components/ContextMenu";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { reactPrompt } from "@/wab/client/components/quick-modals";
import { getValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  MaybeCollapsibleRowsRenderer,
  SidebarSection,
  SidebarSectionHandle,
} from "@/wab/client/components/sidebar/SidebarSection";
import { ColorSwatch } from "@/wab/client/components/style-controls/ColorSwatch";
import { DefinedIndicator } from "@/wab/client/components/style-controls/DefinedIndicator";
import { UnloggedDragCatcher } from "@/wab/client/components/style-controls/UnloggedDragCatcher";
import { Tab, Tabs } from "@/wab/client/components/widgets";
import { StudioChangeOpts, StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  withConsumer,
  withProvider,
} from "@/wab/commons/components/ContextUtil";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import {
  derefTokenRefs,
  isTokenRef,
  lazyDerefTokenRefsWithDeps,
  mkTokenRef,
  StyleTokenType,
  tokenTypeLabel,
} from "@/wab/commons/StyleToken";
import { isEmptyReactNode } from "@/wab/commons/ViewUtil";
import {
  arrayEq,
  assert,
  cx,
  ensure,
  generate,
  mapify,
  tuple,
  unexpected,
} from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { siteFinalStyleTokensAllDeps } from "@/wab/shared/core/site-style-tokens";
import {
  colorProps,
  filterExtractableStyles,
  filterResettableStyles,
  fontSizeProps,
  getAllDefinedStyles,
  lineHeightProps,
  opacityProps,
  spacingProps,
  typographyCssProps,
} from "@/wab/shared/core/style-props";
import {
  isComponentRoot,
  isTplComponent,
  isTplTagOrComponent,
  isTplTextBlock,
} from "@/wab/shared/core/tpls";
import {
  computeDefinedIndicator,
  DefinedIndicatorType,
  getPropAndValueFromIndicator,
  isIndicatorExplicitlySet,
} from "@/wab/shared/defined-indicator";
import { makeExpProxy, makeMergedExpProxy } from "@/wab/shared/exprs";
import {
  MIXIN_CAP,
  MIXIN_LOWER,
  MIXINS_CAP,
  RESET_CAP,
  TOKEN_CAP,
  TOKENS_CAP,
  VARIANTS_CAP,
} from "@/wab/shared/Labels";
import {
  ContainerType,
  convertSelfContainerType,
  getRshContainerType,
  isPositionSet,
  PositionLayoutType,
} from "@/wab/shared/layoututils";
import {
  ensureKnownTplTag,
  isKnownTplTag,
  Mixin,
  RuleSet,
  StyleToken,
  TplComponent,
  TplSlot,
  TplTag,
  Variant,
} from "@/wab/shared/model/classes";
import {
  IRuleSetHelpers,
  IRuleSetHelpersX,
  ReadonlyIRuleSetHelpersX,
  RSH,
  RuleSetHelpers,
  VariantedRuleSetHelpers,
} from "@/wab/shared/RuleSetHelpers";
import { isExplicitSize } from "@/wab/shared/sizingutils";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  getBaseVariant,
  tryGetVariantSetting,
  VariantCombo,
} from "@/wab/shared/Variants";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { Menu, Tooltip } from "antd";
import SubMenu from "antd/lib/menu/SubMenu";
import classNames from "classnames";
import L from "lodash";
import { observer } from "mobx-react";
import { computedFn } from "mobx-utils";
import * as React from "react";
import { forwardRef, MouseEventHandler, ReactNode, useContext } from "react";

export interface StyleComponentProps {
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
  readOnly?: boolean;
}

export class StyleComponent<
  P extends StyleComponentProps = StyleComponentProps,
  S = {}
> extends React.Component<P, S> {
  studioCtx = () => this.props.expsProvider.studioCtx;
  change(f: () => void, opts?: StudioChangeOpts) {
    this.studioCtx().changeSpawn(f, opts);
  }
  app() {
    return this.studioCtx().app;
  }
  private targetExp() {
    return this.props.expsProvider.targetExp();
  }

  private hasTargetExp() {
    return !!this.props.expsProvider.maybeTargetExp();
  }

  targetRs() {
    return this.props.expsProvider.targetRs();
  }

  hasTargetProp(prop: string) {
    return this.hasTargetExp() && this.targetExp().has(prop);
  }

  definedIndicator(...prop: string[]): DefinedIndicatorType {
    const indicators = prop
      .map((p) => this.props.expsProvider.definedIndicator(p))
      .filter((x) => x.source !== "none");

    if (indicators.length === 0) {
      return { source: "none" };
    } else if (indicators.length === 1) {
      return indicators[0];
    } else {
      return (
        indicators.find((x) => x.source === "set") ||
        indicators.find((x) => x.source === "mixin") ||
        indicators.find((x) => x.source === "otherVariants") ||
        indicators[0]
      );
    }
  }

  definedIndicators(...prop: string[]): DefinedIndicatorType[] {
    return prop
      .map((p) => this.props.expsProvider.definedIndicator(p))
      .filter((x) => x.source !== "none");
  }

  exp = () => this.props.expsProvider.mergedExp();

  measureDisp(obj: { exp?: IRuleSetHelpers; prop: string }) {
    const { prop } = obj,
      val = obj.exp,
      exp = val != null ? val : this.exp();
    return (
      <UnloggedDragCatcher sc={this.studioCtx()}>
        <XDraggable onStart={() => {}}>
          <div
            className={
              this.definedIndicator(prop).source === "set"
                ? "overriding"
                : undefined
            }
          >
            {lazyDerefTokenRefsWithDeps(
              exp.get(prop),
              this.studioCtx().site,
              "Spacing"
            )}
          </div>
        </XDraggable>
      </UnloggedDragCatcher>
    );
  }

  showStyleContextMenu = (
    event: React.MouseEvent<unknown>,
    styleName: string,
    initialMenuContent?: ReactNode
  ) => {
    maybeShowContextMenu(
      event.nativeEvent,
      createStyleContextMenu(this, [styleName], {
        initialMenuContent,
      })
    );
  };
}

export function mkStyleComponent(props: StyleComponentProps) {
  return new StyleComponent(props);
}

export const StyleComponentContext = React.createContext<
  StyleComponent | undefined
>(undefined);
export const withStyleComponent = withConsumer(
  StyleComponentContext.Consumer,
  "sc"
);
export const providesStyleComponent = withProvider(
  StyleComponentContext.Provider
);
export const useStyleComponent = () =>
  ensure(useContext(StyleComponentContext), "StyleComponentContext must exist");

export interface SidebarPopupSetting {
  left: boolean;
}

// If SidebarPopupSettingContext is not provided, it is defaulted to right.
export const SidebarPopupSettingContext = React.createContext<
  SidebarPopupSetting | undefined
>(undefined);
export const providesSidebarPopupSetting = withProvider(
  SidebarPopupSettingContext.Provider
);
export const withSidebarPopupSetting = withConsumer(
  SidebarPopupSettingContext.Consumer,
  "sidebarPopupSetting"
);
export function useSidebarPopupSetting() {
  const context = React.useContext(SidebarPopupSettingContext);
  return context;
}

const styleNameToLabelOverrides = mapify({
  display: "Items",
  "flex-direction": "Stack Direction",
  background: "Background Layers",
  "box-shadow": "Drop Shadow",
  "grid-row": "Grid Placement",
});

export function getLabelForStyleName(styleName: string) {
  return styleNameToLabelOverrides.get(styleName) || L.startCase(styleName);
}

interface WithStyleContextMenuProps {
  styleNames: string[];
  displayStyleName?: string;
  className?: string;
  initialMenuContent?: ReactNode | (() => ReactNode);
  children: ReactNode;
  sc: StyleComponent;
}

export function WithStyleContextMenu(props: WithStyleContextMenuProps) {
  const { styleNames, displayStyleName, className, initialMenuContent, sc } =
    props;
  return (
    <WithContextMenu
      className={className}
      overlay={() => {
        const menuContent = L.isFunction(initialMenuContent)
          ? initialMenuContent()
          : initialMenuContent;
        return createStyleContextMenu(sc, styleNames, {
          displayStyleName,
          initialMenuContent: menuContent,
        });
      }}
    >
      {props.children}
    </WithContextMenu>
  );
}

/**
 * @param styleNames style props encompassed by this menu
 * @param opts.displayStyleName optionally, if you want things to look like
 *   there's just one style prop, even though there are many style props,
 *   specify this. For example, using displayStyleName of "border-left" where
 *   styleNames are
 *   "border-left-style", "border-left-width", "border-left-color".
 */
export function createStyleContextMenu(
  sc: StyleComponent,
  styleNames: string[],
  opts: {
    displayStyleName?: string;
    initialMenuContent?: ReactNode | (() => ReactNode);
    noExtract?: boolean;
  } = {}
) {
  const expsProvider = sc.props.expsProvider;
  const exp = expsProvider.targetExp();
  const resetStyles = (names: string[]) => {
    sc.change(() => {
      for (const sn of names) {
        sc.exp().clear(sn);
      }
    });
  };

  const referencedStyleNames = (styleName: string) =>
    styleName === opts.displayStyleName ? styleNames : [styleName];

  const resetStyle = (styleName: string) =>
    resetStyles(referencedStyleNames(styleName));

  const resetAllStyles = () => {
    resetStyles(filterResettableStyles(exp.props()));
  };

  const shownStyleNames = styleNames.filter((styleName) => {
    const defined = sc.hasTargetProp(styleName);
    const removable = sc.props.expsProvider.isPropRemovable(styleName);
    const disabled = !defined || !removable;
    return !disabled;
  });

  const viewCtx = sc.studioCtx().focusedViewCtx();
  let extractToVariantsMenuItems: ReactNode[] = [];
  if (viewCtx && expsProvider instanceof TplExpsProvider) {
    const vc = viewCtx;
    const tpl = expsProvider.tpl;
    const extractToVariantHelper = (variant: Variant, names: string[]) => {
      sc.change(() => {
        sc.studioCtx().tplMgr().extractToVariant(tpl, variant, names, sc.exp());
      });
    };
    const extractToVariant = (styleName: string, variant: Variant) => {
      extractToVariantHelper(variant, referencedStyleNames(styleName));
    };
    const extractAllToVariant = (variant: Variant) => {
      extractToVariantHelper(variant, filterExtractableStyles(exp.props()));
    };

    const component = ensure(vc.currentComponent(), "component must exist");

    const currentVariantCombo = vc.variantTplMgr().getCurrentVariantCombo();

    const validVariantGroups = generate(function* () {
      for (const vg of [null, ...component.variantGroups]) {
        const variants = vg ? vg.variants : [getBaseVariant(component)];
        const validVariants = variants.filter(
          (v) => !arrayEq(currentVariantCombo, [v])
        );
        if (validVariants.length > 0) {
          yield tuple(vg, validVariants);
        }
      }
    });

    const mkVariantMenuItems = (action: (v: Variant) => void) =>
      validVariantGroups.map(([vg, variants]) => (
        <Menu.ItemGroup
          key={vg ? vg.uid : "base"}
          title={vg ? vg.param.variable.name : "Base"}
        >
          {variants.map((v) => (
            <Menu.Item key={v.uid}>
              <a onClick={() => action(v)}>{v.name}</a>
            </Menu.Item>
          ))}
        </Menu.ItemGroup>
      ));

    if (validVariantGroups.length > 0) {
      extractToVariantsMenuItems = [
        ...shownStyleNames.map((styleName) => (
          <SubMenu
            key={`extract-variant-${styleName}`}
            title={
              <>
                Extract <strong>{getLabelForStyleName(styleName)}</strong> style
                to variant
              </>
            }
          >
            {mkVariantMenuItems((v) => extractToVariant(styleName, v))}
          </SubMenu>
        )),
        <SubMenu
          key={`extract-variant-all`}
          title={<>Extract all styles to variant</>}
        >
          {mkVariantMenuItems((v) => extractAllToVariant(v))}
        </SubMenu>,
      ];
    }
  }

  const builder = new MenuBuilder();
  builder.genSection(undefined, (push) => {
    if (L.isArray(opts.initialMenuContent)) {
      push(...opts.initialMenuContent);
    } else if (opts.initialMenuContent) {
      push(
        typeof opts.initialMenuContent === "function"
          ? opts.initialMenuContent()
          : opts.initialMenuContent
      );
    }
  });

  builder.genSection(undefined, (push) => {
    if (opts.displayStyleName) {
      const label = getLabelForStyleName(opts.displayStyleName);
      push(
        <Menu.Item
          key={opts.displayStyleName}
          onClick={() => resetStyle(opts.displayStyleName!)}
        >
          {RESET_CAP} <strong>{label}</strong> style
        </Menu.Item>
      );
    } else {
      for (const styleName of shownStyleNames) {
        const label = getLabelForStyleName(styleName);
        push(
          <Menu.Item key={styleName} onClick={() => resetStyle(styleName)}>
            {RESET_CAP} <strong>{label}</strong> style
          </Menu.Item>
        );
      }
    }

    push(
      <Menu.Item key={"reset-all"} onClick={() => resetAllStyles()}>
        {RESET_CAP} all styles
      </Menu.Item>
    );
  });

  if (!opts?.noExtract) {
    buildExtractToTokens(
      sc.studioCtx(),
      builder,
      shownStyleNames,
      expsProvider
    );
    buildExtractToMixins(
      sc.studioCtx(),
      builder,
      shownStyleNames,
      expsProvider,
      opts.displayStyleName
    );

    builder.genSection(`Extract to ${VARIANTS_CAP}`, (push) =>
      push(...extractToVariantsMenuItems)
    );
  }

  return builder.build({
    menuName: "style-context-menu",
  });
}

function buildExtractToMixins(
  sc: StudioCtx,
  builder: MenuBuilder,
  styleNames: string[],
  expsProvider: ExpsProvider,
  displayStyleName?: string
) {
  const rs = expsProvider.targetRs();
  const extractToMixinHelper = async (
    mixinOrName: Mixin | string,
    names: string[]
  ) => {
    return sc.changeUnsafe(() => {
      const mixin =
        typeof mixinOrName === "string"
          ? sc.tplMgr().addMixin(mixinOrName)
          : mixinOrName;
      sc.tplMgr().extractToMixin(mixin, names, expsProvider.targetExp());
      if (!rs.mixins.includes(mixin)) {
        rs.mixins.push(mixin);
      }
    });
  };
  const extractToMixin = async (
    styleName: string,
    mixinOrName: Mixin | string
  ) => {
    return extractToMixinHelper(
      mixinOrName,
      styleName === displayStyleName ? styleNames : [styleName]
    );
  };

  const extractAllToMixin = async (mixinOrName: Mixin | string) => {
    return extractToMixinHelper(
      mixinOrName,
      filterExtractableStyles(getAllDefinedStyles(rs))
    );
  };

  const buildExtractToMixin = (styleName?: string) => {
    builder.genSub(
      <>
        Extract{" "}
        <strong>
          {styleName ? getLabelForStyleName(styleName) : "all styles"}
        </strong>{" "}
        to {MIXIN_LOWER}
      </>,
      (push) => {
        buildMixinPicker(builder, sc, async (mixinOrName) => {
          if (styleName) {
            await extractToMixin(styleName, mixinOrName);
          } else {
            await extractAllToMixin(mixinOrName);
          }
        });
      }
    );
  };

  builder.genSection(`Extract to ${MIXINS_CAP}`, (push) => {
    if (displayStyleName) {
      buildExtractToMixin(displayStyleName);
    } else {
      for (const styleName of styleNames) {
        buildExtractToMixin(styleName);
      }
    }
    buildExtractToMixin(undefined);
  });
}

function buildMixinPicker(
  builder: MenuBuilder,
  sc: StudioCtx,
  onPick: (mixinOrName: string | Mixin) => Promise<void>
) {
  const mkMixinFromPrompt = async (
    f: (mixinOrName: Mixin | string) => Promise<void>
  ) => {
    const name = await reactPrompt({
      message: `Enter ${MIXIN_LOWER} name`,
      placeholder: `${MIXIN_CAP} name`,
      actionText: "Add",
    });
    if (!name) {
      return;
    }
    await f(name);
  };
  builder.genSection(undefined, (push) => {
    push(
      <Menu.Item
        key="new-mixin"
        onClick={async () => {
          await mkMixinFromPrompt((mixin) => onPick(mixin));
        }}
      >
        New {MIXIN_LOWER}...
      </Menu.Item>
    );
  });
  builder.genSection(undefined, (push) => {
    for (const mixin of sc.site.mixins) {
      push(
        <Menu.Item key={mixin.uuid} onClick={() => onPick(mixin)}>
          {mixin.name}
        </Menu.Item>
      );
    }
  });
}

function buildExtractToTokens(
  sc: StudioCtx,
  builder: MenuBuilder,
  styleNames: string[],
  expsProvider: ExpsProvider
) {
  const extractToToken = (token: StyleToken, styleName: string) => {
    const val = expsProvider.targetExp().get(styleName);
    token.value = val;
    expsProvider.targetExp().set(styleName, mkTokenRef(token));
  };

  const buildExtractForStyle = (
    styleName: string,
    tokenType: StyleTokenType
  ) => {
    const curValue = expsProvider.targetExp().get(styleName);
    if (isTokenRef(curValue)) {
      return;
    }

    builder.genSub(
      <>
        Extract <strong>{getLabelForStyleName(styleName)}</strong> as{" "}
        {tokenTypeLabel(tokenType).toLowerCase()} token
      </>,
      (push) => {
        builder.genSection(undefined, (_push) => {
          _push(
            <Menu.Item
              key="new-token"
              onClick={async () => {
                const name = await reactPrompt({
                  message: `Enter ${tokenTypeLabel(
                    tokenType
                  ).toLowerCase()} token name`,
                  placeholder: `${TOKEN_CAP} name`,
                  actionText: "Add",
                });
                if (!name) {
                  return;
                }
                await sc.changeUnsafe(() => {
                  const token = sc.tplMgr().addToken({
                    name,
                    tokenType: tokenType,
                  });
                  extractToToken(token, styleName);
                });
              }}
            >
              New token...
            </Menu.Item>
          );
        });
        builder.genSection(undefined, (_push) => {
          for (const token of sc.site.styleTokens.filter(
            (t) => t.type === tokenType
          )) {
            _push(
              <Menu.Item
                key={token.uuid}
                onClick={() =>
                  sc.changeUnsafe(() => extractToToken(token, styleName))
                }
              >
                {tokenType === "Color" ? (
                  <>
                    <ColorSwatch
                      color={derefTokenRefs(
                        siteFinalStyleTokensAllDeps(sc.site),
                        token.value
                      )}
                    />
                    <span className="ml-sm">{token.name}</span>
                  </>
                ) : (
                  token.name
                )}
              </Menu.Item>
            );
          }
        });
      }
    );
  };

  builder.genSection(`Extract to ${TOKENS_CAP}`, (push) => {
    const targetExp = expsProvider.targetExp();
    for (const styleName of styleNames) {
      if (!targetExp.has(styleName)) {
        continue;
      }
      const curValue = targetExp.get(styleName);
      if (isTokenRef(curValue)) {
        continue;
      }
      if (colorProps.includes(styleName)) {
        buildExtractForStyle(styleName, "Color");
      } else if (isExplicitSize(curValue)) {
        if (spacingProps.includes(styleName)) {
          buildExtractForStyle(styleName, "Spacing");
        } else if (fontSizeProps.includes(styleName)) {
          buildExtractForStyle(styleName, "FontSize");
        } else if (lineHeightProps.includes(styleName)) {
          buildExtractForStyle(styleName, "LineHeight");
        } else if (opacityProps.includes(styleName)) {
          buildExtractForStyle(styleName, "Opacity");
        }
      }
    }
  });
}

interface StylePanelSectionProps extends StyleComponentProps {
  title: ReactNode;
  children:
    | ReactNode
    | ((renderMaybeCollapsibleRows: MaybeCollapsibleRowsRenderer) => ReactNode);
  styleProps: string[];
  ignorableStyleProps?: string[]; // Style to be excluded for definedIndicator
  defaultStyleProps?: Map<string, string>; // definedIndicator will be excluded for style properties that match these default values
  collapsableIndicatorNames?: string[];
  defaultExpanded?: boolean;
  hasMore?: boolean;
  controls?: ReactNode;
  emptyBody?: boolean;
  fullyCollapsible?: boolean;
  oneLiner?: boolean;
  unremovableStyleProps?: string[];
  extraMenuItems?: (builder: MenuBuilder) => void;
  defaultHeaderAction?: () => void;
  onHeaderClick?: MouseEventHandler<HTMLDivElement>;
  onExtraContentExpanded?: () => void;
}

export const StylePanelSection = observer(forwardRef(StylePanelSection_));

function StylePanelSection_(
  props: StylePanelSectionProps,
  ref: React.Ref<SidebarSectionHandle>
) {
  const {
    title,
    children,
    hasMore,
    oneLiner,
    controls,
    emptyBody,
    styleProps,
    collapsableIndicatorNames = [],
    ignorableStyleProps = [],
    defaultStyleProps = new Map(),
    defaultHeaderAction,
    expsProvider,
    unremovableStyleProps,
    onHeaderClick,
    extraMenuItems,
    ...otherProps
  } = props;
  const studioCtx = expsProvider.studioCtx;
  const isEditingNonBaseVariant =
    studioCtx.focusedViewCtx()?.isEditingNonBaseVariant;
  const isMixin = expsProvider instanceof SingleRsExpsProvider;
  const unremovableProps =
    unremovableStyleProps && !isMixin ? unremovableStyleProps : [];

  const definedIndicators = styleProps
    .map((p) => expsProvider.definedIndicator(p))
    .filter((x) => {
      // Filter definedIndicator for properties that are included in ignorableStyleProps or match the default style props
      if (!isEditingNonBaseVariant && isIndicatorExplicitlySet(x)) {
        const { prop, value } = getPropAndValueFromIndicator(x);
        return !(
          prop &&
          value &&
          (ignorableStyleProps.includes(prop) ||
            defaultStyleProps.get(prop) === value)
        );
      }
      return x.source !== "none";
    });

  const collapsableDefinedIndicators = collapsableIndicatorNames
    .map((p) => expsProvider.definedIndicator(p))
    .filter((x) => x.source !== "none");

  const headerOverlay = () => {
    const builder = new MenuBuilder();
    if (extraMenuItems) {
      extraMenuItems(builder);
    }
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          key="remove"
          onClick={async () => {
            await studioCtx.changeUnsafe(() => {
              const exp = expsProvider.targetExp();
              for (const prop of L.without(styleProps, ...unremovableProps)) {
                if (exp.has(prop) && expsProvider.isPropRemovable(prop)) {
                  exp.clear(prop);
                }
              }
              // apply the default styles props on unset
              for (const [key, value] of defaultStyleProps) {
                exp.set(key, value);
              }
            });
          }}
        >
          {RESET_CAP} all <strong>{title}</strong> styles
        </Menu.Item>
      );
      builder.genSub(
        <>
          {isMixin ? "Move" : "Extract"} all <strong>{title}</strong> styles to{" "}
          {MIXIN_LOWER}
        </>,
        () => {
          buildMixinPicker(builder, studioCtx, async (mixinOrName) => {
            await studioCtx.changeUnsafe(() => {
              const mixin =
                typeof mixinOrName === "string"
                  ? studioCtx.tplMgr().addMixin(mixinOrName)
                  : mixinOrName;
              studioCtx
                .tplMgr()
                .extractToMixin(
                  mixin,
                  styleProps,
                  expsProvider.targetExp(),
                  unremovableProps
                );
              if (!isMixin) {
                const targetRs = expsProvider.targetRs();
                if (!targetRs.mixins.includes(mixin)) {
                  targetRs.mixins.push(mixin);
                }
              }
            });
          });
        }
      );
    });
    return builder.build({
      onMenuClick: (e) => e.domEvent.stopPropagation(),
      menuName: "style-section-menu",
    });
  };

  return (
    <SidebarSection
      ref={ref}
      title={title}
      hasExtraContent={hasMore}
      oneLiner={oneLiner}
      defaultExtraContentExpanded={
        getValueSetState(...collapsableDefinedIndicators) === "isSet"
      }
      makeHeaderMenu={headerOverlay}
      isHeaderActive={getValueSetState(...definedIndicators) === "isSet"}
      onHeaderClick={onHeaderClick}
      definedIndicator={
        definedIndicators &&
        definedIndicators.length > 0 && (
          <DefinedIndicator
            label={title}
            type={definedIndicators}
            menu={headerOverlay}
            alwaysShowPropLabel
            className="absolute"
          />
        )
      }
      controls={controls}
      emptyBody={emptyBody}
      {...otherProps}
    >
      {children}
    </SidebarSection>
  );
}

export interface TabbedStylePanelSectionTab {
  key: string;
  label: ReactNode;
  icon: React.ReactElement | null;
  iconOnly?: boolean;
}

export interface TabbedStylePanelSectionProps extends StyleComponentProps {
  title: ReactNode;
  tabs: TabbedStylePanelSectionTab[];
  styleProps: string[];
  children?: ReactNode;
  activeKey?: string;
  onSwitch: (key: string) => void;
  emptyBody?: boolean;
  extraContent?: ReactNode;
  unremovableStyleProps?: string[];
}

export const TabbedStylePanelSection = observer(
  class extends StyleComponent<TabbedStylePanelSectionProps> {
    render() {
      const {
        title,
        styleProps,
        tabs,
        children,
        onSwitch,
        activeKey = tabs[0].key,
        emptyBody = false,
      } = this.props;
      return (
        <StylePanelSection
          expsProvider={this.props.expsProvider}
          title={title}
          styleProps={styleProps}
          unremovableStyleProps={this.props.unremovableStyleProps}
          emptyBody={emptyBody}
          controls={
            <Tabs
              tabKey={activeKey}
              onSwitch={onSwitch}
              tabClassName={"SectionTab"}
              activeTabClassName={cx({
                SectionTab__Active: true,
                "SectionTab__Active--empty": isEmptyReactNode(children),
              })}
              tabBarClassName="SectionTabsBar"
              tabs={tabs.map((tab) => {
                const iconBlock = tab.icon && (
                  <div
                    className={classNames({
                      InlineIcon: true,
                      "mr-sm": !tab.iconOnly,
                    })}
                  >
                    {tab.icon}
                  </div>
                );
                return new Tab({
                  name: tab.iconOnly ? (
                    <Tooltip title={tab.label}>{<>{iconBlock}</>}</Tooltip>
                  ) : (
                    <>
                      {iconBlock}
                      {tab.label}
                    </>
                  ),
                  key: tab.key,
                  contents: () => null,
                });
              })}
            />
          }
        >
          {children}
        </StylePanelSection>
      );
    }
  }
);

export interface ExpsProvider {
  maybeTargetExp: () => IRuleSetHelpersX | undefined;

  targetExp: () => IRuleSetHelpersX;
  targetRs: () => RuleSet;

  // This one uses effectiveExp for read, and ensuredTargetExp for write.
  mergedExp: () => IRuleSetHelpersX;

  typographyDefaultOpen: () => boolean;

  forTag: () => string;

  forDom: () => JQuery | undefined | null;

  onContainerTypeChange: (val: ContainerType) => void;

  studioCtx: StudioCtx;

  onPositionChange: (val: string) => void;

  showPositioningPanel: () => boolean;

  getTargetDeepLayoutParentRsh: () => ReadonlyIRuleSetHelpersX | undefined;

  readonly forTextNode: boolean;

  isPropRemovable: (prop: string) => boolean;

  definedIndicator: (prop: string) => DefinedIndicatorType;
}

export class FlexControlHelper {
  private parentRsh?: ReadonlyIRuleSetHelpersX;
  private parentContainerType: ContainerType | undefined;
  private isAuto: boolean;
  private effectivePosition: string | undefined;
  private parentIsCodeComponent: boolean;

  constructor(private expsProvider: ExpsProvider) {
    const isMixin = expsProvider instanceof SingleRsExpsProvider;
    const exp = expsProvider.mergedExp();
    this.parentIsCodeComponent = !!(
      expsProvider instanceof TplExpsProvider &&
      expsProvider.tpl?.parent &&
      isTplComponent(expsProvider.tpl.parent) &&
      isCodeComponent(expsProvider.tpl.parent.component)
    );

    const posValue = isMixin ? exp.getRaw("position") : exp.get("position");
    // For code component, we default position to relative to show flex settings.
    this.effectivePosition =
      posValue ?? (this.parentIsCodeComponent ? "relative" : undefined);
    this.isAuto = this.effectivePosition === "relative";

    this.parentRsh = expsProvider.getTargetDeepLayoutParentRsh();
    this.parentContainerType = this.parentRsh
      ? getRshContainerType(this.parentRsh)
      : (isMixin || this.parentIsCodeComponent) && this.isAuto
      ? "flex-row"
      : undefined;
  }

  getParentIsCodeComponent() {
    return this.parentIsCodeComponent;
  }

  getEffectivePosition() {
    return this.effectivePosition;
  }

  getIsAuto() {
    return this.isAuto;
  }

  getParentContainerType() {
    return this.parentContainerType;
  }

  isAutoInFlexParent() {
    return this.parentContainerType?.includes("flex") && this.isAuto;
  }

  getParentFlexProps() {
    if (this.parentContainerType?.includes("flex")) {
      return {
        flexDir: this.parentContainerType.split("-")[1],
      };
    }
    return undefined;
  }

  getParentGridProps() {
    return this.parentContainerType === "grid" ? {} : undefined;
  }

  get isComponentRoot() {
    return (
      this.expsProvider instanceof TplExpsProvider &&
      isComponentRoot(this.expsProvider.tpl)
    );
  }

  get isMixin() {
    return this.expsProvider instanceof SingleRsExpsProvider;
  }
}

export class SingleRsExpsProvider implements ExpsProvider {
  protected _targetExp: IRuleSetHelpersX;

  readonly forTextNode: boolean;
  constructor(
    private rs: RuleSet,
    public studioCtx: StudioCtx,
    private unremovableProps: string[]
  ) {
    this._targetExp = new RuleSetHelpers(rs, this.forTag());
    this.forTextNode = true;
  }
  maybeTargetExp = () => this._targetExp;
  targetExp = () => this._targetExp;
  targetRs = () => this.rs;
  // This one uses effectiveExp for read, and ensuredTargetExp for write.
  mergedExp = () => this._targetExp;
  typographyDefaultOpen = () =>
    typographyCssProps.some((prop) => this._targetExp.has(prop));
  forTag = () => "div";
  forDom = () => undefined;
  onContainerTypeChange = async (val: ContainerType) => {
    return this.studioCtx.changeUnsafe(() =>
      convertSelfContainerType(this.targetExp(), val)
    );
  };

  onPositionChange = async (val: string) => {
    const exp = this.mergedExp();
    await this.studioCtx.changeUnsafe(() => {
      if (val === "relative") {
        // When position is set to relative, then also make sure top/bottom/left/right
        // are set to auto, so we can make sure applying this mixin means the element
        // will be auto-layout-ed.
        ["top", "bottom", "left", "right"].forEach((prop) =>
          exp.set(prop, "auto")
        );
      }
      exp.set("position", val);
    });
  };

  showPositioningPanel = () => true;

  getTargetDeepLayoutParentRsh = () => undefined;

  isPropRemovable = (prop: string) => !this.unremovableProps.includes(prop);

  definedIndicator = (prop: string): DefinedIndicatorType => {
    if (this._targetExp.has(prop)) {
      return {
        source: "setNonVariable",
        prop,
        value: ensure(this._targetExp.getRaw(prop), "value should be set"),
        isDefaultTheme: false,
      };
    } else {
      return { source: "none" };
    }
  };
}

export class RshExpsProvider implements ExpsProvider {
  constructor(
    private exp: IRuleSetHelpersX,
    public studioCtx: StudioCtx,
    private unremovableProps: string[]
  ) {}
  forTextNode = false;
  maybeTargetExp = () => this.exp;
  targetExp = () => this.exp;
  targetRs = () => unexpected();
  mergedExp = () => this.exp;
  typographyDefaultOpen = () => false;
  forTag = () => "div";
  forDom = () => undefined;
  onContainerTypeChange = () => unexpected();
  onPositionChange = () => unexpected();
  showPositioningPanel = () => true;

  getTargetDeepLayoutParentRsh = () => undefined;

  isPropRemovable = (prop: string) => !this.unremovableProps.includes(prop);

  definedIndicator = (prop: string): DefinedIndicatorType => {
    if (this.exp.has(prop)) {
      return {
        source: "setNonVariable",
        prop,
        value: ensure(this.exp.getRaw(prop), "value should be set"),
        isDefaultTheme: false,
      };
    } else {
      return { source: "none" };
    }
  };
}

export class MixinExpsProvider extends SingleRsExpsProvider {
  constructor(
    rs: RuleSet,
    studioCtx: StudioCtx,
    unremovableProps: string[],
    private isDefaultTheme: boolean,
    public mixin: Mixin,
    private vsh?: VariantedStylesHelper
  ) {
    super(rs, studioCtx, unremovableProps);
    this._targetExp = !this.isDefaultTheme
      ? new RuleSetHelpers(rs, this.forTag())
      : new VariantedRuleSetHelpers(
          this.mixin,
          this.forTag(),
          ensure(this.vsh, "must exist for tags")
        );
  }

  definedIndicator = (prop: string): DefinedIndicatorType => {
    if (this._targetExp.has(prop)) {
      return {
        source: "setNonVariable",
        prop,
        value: ensure(this._targetExp.getRaw(prop), "value should be set"),
        isDefaultTheme: this.isDefaultTheme,
      };
    } else {
      return { source: "none" };
    }
  };
}

export class TplExpsProvider implements ExpsProvider {
  private vtm: VariantTplMgr;
  targetVariantCombo: VariantCombo;
  activeVariantCombo: VariantCombo;
  targetIndicatorCombo: VariantCombo;
  readonly studioCtx: StudioCtx;
  readonly forTextNode: boolean;

  constructor(
    readonly viewCtx: ViewCtx,
    readonly tpl: TplTag | TplComponent | TplSlot
  ) {
    this.studioCtx = viewCtx.studioCtx;
    // We request a fixed componentStackFrame so that we don't use stale
    // inconsistent ComponentStackFrames for tpl.
    this.vtm = this.viewCtx.variantTplMgr(true);

    this.targetVariantCombo = this.vtm.getTargetVariantComboForNode(this.tpl);
    this.activeVariantCombo = this.vtm.getEffectiveVariantComboForNode(
      this.tpl
    );
    this.targetIndicatorCombo = this.vtm.getTargetIndicatorComboForNode(
      this.tpl
    );

    this.forTextNode = isTplTextBlock(tpl);
  }
  effectiveVs = computedFn(
    () => {
      return this.vtm.effectiveVariantSetting(
        this.tpl,
        this.activeVariantCombo
      );
    },
    { name: "effectiveVs" }
  );
  maybeTargetVs = () => {
    return tryGetVariantSetting(this.tpl, this.targetVariantCombo);
  };
  maybeTargetExp = () => {
    const vs = this.maybeTargetVs();
    return vs ? RSH(vs.rs, this.tpl) : undefined;
  };
  targetExp = () => RSH(this.targetRs(), this.tpl);
  targetRs = () =>
    this.vtm.ensureVariantSetting(this.tpl, this.targetVariantCombo).rs;
  mergedExp = computedFn(
    () => {
      const effectiveExp = this.effectiveVs().rshWithThemeSlot();
      const getTargetExp = this.targetExp;
      const mergedExp = makeMergedExpProxy(effectiveExp, getTargetExp);
      return makeMobxExpProxy(mergedExp);
    },
    { name: "mergedExp" }
  );
  typographyDefaultOpen = () => isTplTextBlock(this.tpl);
  forTag = () => (isKnownTplTag(this.tpl) ? this.tpl.tag : "div");

  onContainerTypeChange = (val: ContainerType) => {
    // The `display` style is special because we want to force
    // a re-evaluation for that, so that the ValRenderer can
    // put in (or take out) the special magic it needs to for
    // e.g. grid layouts.
    this.viewCtx.change(() => {
      if (isTplComponent(this.tpl)) {
        assert(isCodeComponent(this.tpl.component), "only for code components");
        convertSelfContainerType(this.targetExp(), val);
      } else {
        const tpl = ensureKnownTplTag(this.tpl);
        if (val === "flex-row" || val === "flex-column") {
          this.viewCtx.getViewOps().setStackLayout(tpl, val);
        } else {
          this.viewCtx.getViewOps().convertContainerType(tpl, val, undefined);
        }
      }
    });
  };

  forDom = () => this.viewCtx.focusedDomElt();

  onPositionChange = (val) => {
    this.viewCtx.change(() => {
      if (isTplTagOrComponent(this.tpl)) {
        const viewOps = this.viewCtx.getViewOps();
        switch (val) {
          case PositionLayoutType.auto: {
            viewOps.adoptRelativePositionType(
              this.tpl,
              this.targetVariantCombo
            );
            return;
          }
          case PositionLayoutType.free: {
            viewOps.adoptFreePositionType(this.tpl, this.targetVariantCombo);
            return;
          }
          case PositionLayoutType.sticky: {
            viewOps.adoptStickyPositionType(this.tpl, this.targetVariantCombo);
            return;
          }
          case PositionLayoutType.fixed: {
            viewOps.adoptFixedPositionType(this.tpl, this.targetVariantCombo);
            return;
          }
        }
      }
    });
  };

  showPositioningPanel = () => {
    // Don't show positioning panel for the root node
    return !!this.tpl.parent || isPositionSet(this.tpl, this.viewCtx);
  };

  getTargetDeepLayoutParentRsh = () => {
    const parentTpl = $$$(this.tpl)
      .layoutParent({ throughSlot: true })
      .maybeOneTpl();
    if (!isKnownTplTag(parentTpl)) {
      return undefined;
    }
    const vs = this.vtm.effectiveVariantSetting(
      parentTpl,
      this.targetIndicatorCombo
    );
    return vs.rsh();
  };

  isPropRemovable = (prop: string) => true;

  definedIndicator = (prop: string): DefinedIndicatorType => {
    const effectiveVs = this.effectiveVs();
    const sourceStack = effectiveVs.getPropSource(prop);
    return computeDefinedIndicator(
      this.viewCtx.site,
      this.viewCtx.currentComponent(),
      sourceStack,
      this.targetIndicatorCombo
    );
  };
}

export function makeMobxExpProxy(exp: IRuleSetHelpersX) {
  return makeExpProxy(exp, {
    has: computedFn((prop: string) => exp.has(prop), {
      name: "MobxExpProxy.has",
    }),
    get: computedFn((prop: string) => exp.get(prop), {
      name: "MobxExpProxy.get",
    }),
    getRaw: computedFn((prop: string) => exp.getRaw(prop), {
      name: "MobxExpProxy.getRaw",
    }),
    props: computedFn(() => exp.props(), { name: "MobxExpProxy.props" }),
  });
}
