import ListItem from "@/wab/client/components/ListItem";
import { XMultiSelect } from "@/wab/client/components/XMultiSelect";
import styles from "@/wab/client/components/sidebar/LeftExprsSearchPanel.module.css";
import {
  Group,
  Item,
  VirtualGroupedList,
} from "@/wab/client/components/sidebar/VirtualGroupedList";
import {
  Matcher,
  getTextWithScrolling,
  truncate,
} from "@/wab/client/components/view-common";
import { PlasmicLeftExprsSearchPanel } from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicLeftExprsSearchPanel";
import {
  RightTabKey,
  StudioCtx,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import useDebounce from "@/wab/commons/components/use-debounce";
import { cachedExprsInSite } from "@/wab/shared/cached-selectors";
import {
  getComponentDisplayName,
  getParamDisplayName,
} from "@/wab/shared/core/components";
import {
  extractReferencedParam,
  isDynamicExpr,
  trimCodeParens,
} from "@/wab/shared/core/exprs";
import {
  findExprsInInteraction,
  flattenTpls,
  isTplTag,
} from "@/wab/shared/core/tpls";
import {
  Component,
  Expr,
  Param,
  RichText,
  Site,
  TplComponent,
  TplTag,
  VariantSetting,
  isKnownCompositeExpr,
  isKnownCustomCode,
  isKnownEventHandler,
  isKnownExprText,
  isKnownImageAssetRef,
  isKnownObjectPath,
  isKnownPageHref,
  isKnownRawText,
  isKnownRenderExpr,
  isKnownTemplatedString,
  isKnownTplComponent,
  isKnownVarRef,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { Radio } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

const ExprTypes = {
  Code: "Code",
  ObjectPath: "Object Path",
  Template: "Template",
  EventHandler: "Event Handler",
  Text: "Text",
} as const;
const AllExprTypes = Object.values(ExprTypes);

type ExprTypeKey = keyof typeof ExprTypes;
type ExprTypeValue = (typeof ExprTypes)[ExprTypeKey];

interface ExpressionItem {
  expr?: Expr;
  text?: RichText;
  tpl?: TplComponent | TplTag;
  param?: Param;
  component: Component;
  displayText: string;
  location: string;
  exprType: ExprTypeValue;
  variantSetting?: VariantSetting;
}

interface ExpressionListItemProps {
  item: ExpressionItem;
  studioCtx: StudioCtx;
  matcher?: Matcher;
  maxChars: number;
}

function getExprDisplayText(expr?: Expr, text?: RichText): string {
  if (text) {
    if (isKnownRawText(text)) {
      return text.text;
    } else if (isKnownExprText(text)) {
      return getExprDisplayText(text.expr);
    }
    return "[Rich Text]";
  }

  if (!expr) {
    return "[Unknown]";
  }

  if (isKnownCustomCode(expr)) {
    return trimCodeParens(expr.code);
  } else if (isKnownObjectPath(expr)) {
    return expr.path.join(".");
  } else if (isKnownTemplatedString(expr)) {
    const code = expr.text
      .map((part) =>
        typeof part === "string" ? part : getExprDisplayText(part)
      )
      .join("");
    return trimCodeParens(code);
  } else if (isKnownVarRef(expr)) {
    return expr.variable.name;
  } else if (isKnownEventHandler(expr)) {
    return `[Event Handler with ${expr.interactions.length} interactions]`;
  }
  return "[Expression]";
}

function getExprType(expr?: Expr, text?: RichText): ExprTypeValue {
  if (text) {
    if (isKnownRawText(text)) {
      return ExprTypes.Text;
    } else if (isKnownExprText(text)) {
      return getExprType(text.expr);
    }
    return ExprTypes.Text;
  }
  if (!expr) {
    return ExprTypes.Text;
  }

  if (isKnownCustomCode(expr)) {
    return ExprTypes.Code;
  } else if (isKnownObjectPath(expr)) {
    return ExprTypes.ObjectPath;
  } else if (isKnownTemplatedString(expr)) {
    return ExprTypes.Template;
  } else if (isKnownEventHandler(expr)) {
    return ExprTypes.EventHandler;
  }
  // Default fallback - should not occur
  return ExprTypes.Code;
}

function buildLocationPath(
  component: Component,
  tpl?: TplTag | TplComponent,
  param?: Param,
  isTextContent?: boolean
): string {
  const name = getComponentDisplayName(component);
  const parts: string[] = [name.length > 24 ? truncate(name, 21) : name];

  if (tpl) {
    parts.push(tpl.name ?? "[Element]");
  }
  if (param) {
    parts.push(getParamDisplayName(component, param));
  }
  if (isTextContent) {
    parts.push("text");
  }
  return parts.join(" › ");
}

const ExpressionListItem = observer(function ExpressionListItem({
  item,
  studioCtx,
  matcher,
  maxChars,
}: ExpressionListItemProps) {
  const {
    component,
    param,
    tpl,
    variantSetting,
    location,
    exprType,
    displayText,
  } = item;

  const handleNavigate = React.useCallback(async () => {
    if (!component || !tpl) {
      console.warn("No component or tpl found for expression item");
      return;
    }
    // Ensure the right tab is visible
    if (
      studioCtx.rightTabKey !== RightTabKey.style &&
      studioCtx.rightTabKey !== RightTabKey.settings
    ) {
      studioCtx.switchRightTab(RightTabKey.settings);
    }

    await studioCtx.setStudioFocusOnTpl(
      component,
      tpl,
      variantSetting?.variants
    );

    // After the Tpl is focused, highlight param
    const viewCtx = studioCtx.focusedViewCtx();
    if (viewCtx && isKnownTplComponent(tpl) && param) {
      viewCtx.postEval(() => {
        const focusedTpl = viewCtx.focusedTpl();
        if (focusedTpl === tpl) {
          viewCtx.highlightParam = { tpl, param };
        }
      });
    }
  }, [item, studioCtx]);

  return (
    <ListItem
      onClick={handleNavigate}
      showActionsOnHover={false}
      hideIcon={true}
      style={{ padding: "6px 8px", height: "100%" }}
    >
      <div className="flex-1">
        <div
          className="expression-text font-mono"
          style={{ fontSize: "13px", lineHeight: "1.4" }}
        >
          {matcher
            ? matcher.boldSnippetsWithScrolling(displayText, maxChars)
            : getTextWithScrolling(displayText, maxChars, matcher)}
        </div>
        <div
          className="expression-location mt-xsm text-m dimfg"
          style={{ lineHeight: "1.3" }}
        >
          {location}
          {exprType && <span className="ml-m">{exprType}</span>}
        </div>
      </div>
    </ListItem>
  );
});

function pushValidExpr(
  exprs: ExpressionItem[],
  expr: Expr,
  tpl: TplComponent | TplTag | undefined,
  param: Param | undefined,
  component: Component,
  location: string
) {
  // Don't include templated strings that only have code
  if (isKnownTemplatedString(expr)) {
    const hasNonStringPart = expr.text.some((part) => typeof part !== "string");
    const allStringPartsEmpty = expr.text
      .filter((part) => typeof part === "string")
      .every((str) => str === "");

    if (hasNonStringPart && allStringPartsEmpty) {
      return;
    }
  }
  exprs.push({
    expr,
    tpl,
    param,
    component,
    displayText: getExprDisplayText(expr),
    location,
    exprType: getExprType(expr),
  });
}

function collectAllExprs(site: Site): ExpressionItem[] {
  const expressions: ExpressionItem[] = [];
  const allExprRefs = cachedExprsInSite(site);

  for (const componentExprs of allExprRefs) {
    const { ownerComponent, exprRefs } = componentExprs;

    for (const ref of exprRefs) {
      // Filter to only include dynamic expressions
      if (!isDynamicExpr(ref.expr)) {
        continue;
      }
      const tpl =
        isKnownTplComponent(ref.node) || isTplTag(ref.node)
          ? ref.node
          : undefined;

      const param =
        tpl && isKnownTplComponent(tpl)
          ? extractReferencedParam(ownerComponent, ref.expr)
          : undefined;
      const location = buildLocationPath(ownerComponent, tpl, param);

      // Extract inner event handler exprs
      if (isKnownEventHandler(ref.expr)) {
        for (const interaction of ref.expr.interactions) {
          // Find all nested exprs in this interaction
          const interactionExprs = findExprsInInteraction(interaction);

          for (const interactionExpr of interactionExprs) {
            if (isDynamicExpr(interactionExpr)) {
              pushValidExpr(
                expressions,
                interactionExpr,
                tpl,
                param,
                ownerComponent,
                location
              );
            }
          }
        }
      } else {
        pushValidExpr(
          expressions,
          ref.expr,
          tpl,
          param,
          ownerComponent,
          location
        );
      }
    }
  }

  // Collect text expressions and component prop values from all components
  const components = site.components;
  const processedTexts = new Set<string>(); // Track unique text+location combinations

  for (const component of components) {
    const addExpressionItem = (
      vs: VariantSetting,
      targetTpl: TplComponent | TplTag,
      expr: Expr | undefined,
      text: RichText | undefined,
      param: Param | undefined,
      isTextContent: boolean = false
    ) => {
      const location = buildLocationPath(
        component,
        targetTpl,
        param,
        isTextContent
      );
      const displayText = getExprDisplayText(expr, text);
      const exprType = getExprType(expr, text);
      const uniqueKey = `${location}:${displayText}`;

      if (
        displayText &&
        displayText.trim() !== "" &&
        !processedTexts.has(uniqueKey)
      ) {
        processedTexts.add(uniqueKey);
        const item: ExpressionItem = {
          tpl: targetTpl,
          component,
          displayText,
          location,
          exprType,
          variantSetting: vs,
        };
        if (expr) {
          item.expr = expr;
        }
        if (text) {
          item.text = text;
        }
        if (param) {
          item.param = param;
        }

        expressions.push(item);
      }
    };
    const tpls = flattenTpls(component.tplTree);

    for (const tpl of tpls) {
      for (const vs of tpl.vsettings) {
        // Process TplComponent prop values
        if (isKnownTplComponent(tpl)) {
          for (const arg of vs.args) {
            // Ignore slots, variant refs, image assets, and page hrefs
            // These can be added and searched/displayed by name if needed
            if (
              !isKnownRenderExpr(arg.expr) &&
              !isKnownVariantsRef(arg.expr) &&
              !isKnownImageAssetRef(arg.expr) &&
              !isKnownPageHref(arg.expr) &&
              !isKnownCompositeExpr(arg.expr)
            ) {
              addExpressionItem(vs, tpl, arg.expr, undefined, arg.param);
            }
          }
        }

        // Process text content for TplTag elements
        if (isTplTag(tpl) && vs.text) {
          addExpressionItem(vs, tpl, undefined, vs.text, undefined, true);
        }
      }
    }
  }

  // Sort exprs by location, then exprType
  return expressions.sort((a, b) => {
    const compCompare = a.location.localeCompare(b.location);

    return compCompare !== 0
      ? compCompare
      : a.exprType.localeCompare(b.exprType);
  });
}

const getUsedExprTypes = (exprs: ExpressionItem[]): ExprTypeValue[] => {
  const types = new Set(exprs.map((e) => e.exprType));
  return Array.from(types);
};

const LeftExprsSearchPanel = observer(function LeftExprsSearchPanel() {
  const studioCtx = useStudioCtx();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupBy, setGroupBy] = React.useState<"none" | "component" | "type">(
    "component"
  );
  const [expressions, setExpressions] = React.useState<ExpressionItem[]>(() =>
    collectAllExprs(studioCtx.site)
  );

  // Initialize with all available types from the current expressions
  const [selectedExprTypes, setSelectedExprTypes] = React.useState<
    ExprTypeValue[]
  >(() => getUsedExprTypes(expressions));

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [maxChars, setMaxChars] = React.useState(36);

  // Use ResizeObserver to dynamically calculate character limit based on content area width
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateMaxChars = () => {
      const width = container.offsetWidth;
      // Estimate character width for font at 13px
      const charWidth = 7;
      const availableWidth = Math.max(0, width - 14);
      const calculatedMaxChars = Math.floor(availableWidth / charWidth);
      setMaxChars(calculatedMaxChars);
    };
    updateMaxChars();

    const resizeObserver = new ResizeObserver(() => {
      updateMaxChars();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Create matcher for the search query
  const matcher = React.useMemo(
    () =>
      debouncedSearch.trim()
        ? new Matcher(debouncedSearch, { matchMiddleOfWord: true })
        : undefined,
    [debouncedSearch]
  );

  // Update expressions when revisionNum changes (site is updated)
  React.useEffect(() => {
    const newExpressions = collectAllExprs(studioCtx.site);
    setExpressions(newExpressions);
    setSelectedExprTypes(getUsedExprTypes(newExpressions));
  }, [studioCtx.dbCtx().revisionNum]);

  const filteredExprs = React.useMemo(() => {
    let filtered = expressions;

    if (
      selectedExprTypes.length > 0 &&
      selectedExprTypes.length < AllExprTypes.length
    ) {
      filtered = filtered.filter((item) =>
        selectedExprTypes.includes(item.exprType)
      );
    }

    // Filter by search query
    if (matcher) {
      filtered = filtered.filter(
        ({ displayText, location, exprType }) =>
          (displayText && matcher.matches(displayText)) ||
          matcher.matches(location) ||
          matcher.matches(exprType)
      );
    }

    return filtered;
  }, [expressions, matcher, selectedExprTypes]);

  const virtualItems = React.useMemo((): (
    | Item<ExpressionItem>
    | Group<string, ExpressionItem>
  )[] => {
    if (groupBy === "none") {
      // Return flat list of items
      return filteredExprs.map((expr, index) => ({
        type: "item" as const,
        key: `expr-${index}`,
        item: expr,
      }));
    }

    // Group items by component or type
    const groups: Record<string, ExpressionItem[]> = {};
    for (const expr of filteredExprs) {
      const key =
        groupBy === "component"
          ? getComponentDisplayName(expr.component)
          : expr.exprType;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(expr);
    }

    // Convert to VirtualGroupedList format
    return Object.entries(groups).map(([groupName, items]) => ({
      type: "group" as const,
      key: `group-${groupName}`,
      group: groupName,
      items: items.map((item, index) => ({
        type: "item" as const,
        key: `${groupName}-expr-${index}`,
        item,
      })),
      defaultCollapsed: false,
    }));
  }, [filteredExprs, groupBy]);

  return (
    <PlasmicLeftExprsSearchPanel
      root={{
        props: {
          "data-test-id": "expressions-tab",
        } as any,
      }}
      leftSearchPanel={{
        searchboxProps: {
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "Search expressions...",
          autoFocus: true,
        },
      }}
      typeFilter={
        <XMultiSelect
          options={AllExprTypes}
          selectedItems={selectedExprTypes}
          onSelect={(type: ExprTypeValue) => {
            setSelectedExprTypes([...selectedExprTypes, type]);
            return true;
          }}
          onUnselect={(type: ExprTypeValue) => {
            setSelectedExprTypes(selectedExprTypes.filter((t) => t !== type));
          }}
          renderOption={(type) => (
            <div className="flex flex-vcenter gap-xsm">
              <span>{type}</span>
              <span className="text-xsm dimfg">
                ({expressions.filter((e) => e.exprType === type).length})
              </span>
            </div>
          )}
          renderSelectedItem={(type) => <span className="text-xs">{type}</span>}
          placeholder={
            selectedExprTypes.length === 0
              ? "Select types to filter..."
              : undefined
          }
          className="fill-width right-panel-input-background__no-height"
          filterOptions={(opts, input) => {
            // Filter out selected items
            const availableOpts = opts.filter(
              (opt) => !selectedExprTypes.includes(opt)
            );
            return !input
              ? availableOpts
              : availableOpts.filter((o) =>
                  o.toLowerCase().includes(input.toLowerCase())
                );
          }}
        />
      }
      groupBy={
        <div
          className="flex flex-vcenter fill-width right-panel-input-background__no-height"
          style={{ padding: "4px 6px" }}
        >
          <Radio.Group
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            size="small"
            buttonStyle="solid"
            className={`flex-row space-between fill-width ${styles.radioGroupNoDivider}`}
          >
            {["None", "Component", "Type"].map((label) => {
              const value = label.toLowerCase();
              const selected = value === groupBy;
              return (
                <Radio.Button
                  key={label}
                  value={value}
                  className="flex-even flex-row flex-vcenter flex-hcenter"
                  style={{
                    border: "none",
                    backgroundColor: selected ? "#fff" : "unset",
                    color: "#1b1b18",
                    height: "25px",
                    boxShadow: "none",
                    borderRadius: "2px",
                  }}
                >
                  {label}
                </Radio.Button>
              );
            })}
          </Radio.Group>
        </div>
      }
      exprsText={`Found ${filteredExprs.length} expression${
        filteredExprs.length !== 1 ? "s" : ""
      }`}
      content={
        <div ref={containerRef} className="fill-width fill-height">
          {filteredExprs.length === 0 ? (
            <div className="p-m text-center text-secondary">
              No matching expressions found
            </div>
          ) : (
            <VirtualGroupedList
              items={virtualItems}
              renderItem={(item: ExpressionItem, _group) => (
                <ExpressionListItem
                  item={item}
                  studioCtx={studioCtx}
                  matcher={matcher}
                  maxChars={maxChars}
                />
              )}
              itemHeight={50}
              renderGroupHeader={(groupName: string) => {
                const groupItem = virtualItems.find(
                  (v) => v.type === "group" && v.group === groupName
                );
                const itemCount =
                  groupItem?.type === "group" ? groupItem.items.length : 0;
                return (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "500",
                      padding: "6px 0px",
                    }}
                  >
                    {groupName} ({itemCount})
                  </div>
                );
              }}
              headerHeight={28}
              hideEmptyGroups={true}
              forceExpandAll={false}
            />
          )}
        </div>
      }
    />
  );
});

export default LeftExprsSearchPanel;
