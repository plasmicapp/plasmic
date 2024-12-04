import {
  AnyType,
  Arg,
  ArgType,
  Choice,
  ClassNamePropType,
  ColorPropType,
  ColumnsConfig,
  ColumnsSetting,
  Component,
  ComponentInstance,
  CustomCode,
  DateRangeStrings,
  DateString,
  DefaultStylesClassNamePropType,
  DefaultStylesPropType,
  ensureKnownTplComponent,
  ensureKnownTplNode,
  EventHandler,
  Expr,
  ExprText,
  FunctionType,
  HrefType,
  Img,
  Interaction,
  isKnownArg,
  isKnownClassNamePropType,
  isKnownCollectionExpr,
  isKnownCompositeExpr,
  isKnownCustomCode,
  isKnownDataSourceOpExpr,
  isKnownEventHandler,
  isKnownExpr,
  isKnownExprText,
  isKnownFunctionArg,
  isKnownFunctionExpr,
  isKnownFunctionType,
  isKnownGenericEventHandler,
  isKnownNodeMarker,
  isKnownObjectPath,
  isKnownPageHref,
  isKnownQueryInvalidationExpr,
  isKnownRawText,
  isKnownRenderExpr,
  isKnownStyleMarker,
  isKnownTemplatedString,
  isKnownTplComponent,
  isKnownTplNode,
  isKnownTplRef,
  isKnownTplSlot,
  isKnownTplTag,
  isKnownVarRef,
  isKnownVirtualRenderExpr,
  Marker,
  NodeMarker,
  ObjectPath,
  Param,
  PlumeInstance,
  QueryData,
  QueryRef,
  RawText,
  RenderableType,
  RenderExpr,
  RenderFuncType,
  Rep,
  RichText,
  RuleSet,
  Scalar,
  SelectorRuleSet,
  Site,
  SlotParam,
  StyleExpr,
  StyleMarker,
  StyleScopeClassNamePropType,
  TargetType,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Type,
  Var,
  Variant,
  VariantSetting,
  VarRef,
} from "@/wab/shared/model/classes";
/* eslint-disable
    no-fallthrough,
*/
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { DeepReadonly } from "@/wab/commons/types";
import {
  TAG_TO_HTML_ATTRIBUTES,
  TAG_TO_HTML_INTERFACE,
} from "@/wab/component-metas/tag-to-html-interface";
import { isAdvancedProp } from "@/wab/shared/code-components/code-components";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  assert,
  check,
  checkUnique,
  ensure,
  ensureArray,
  ensureType,
  flexFlatten,
  InvalidCodePathError,
  isArrayOfStrings,
  isNonNil,
  maybe,
  mkShortId,
  notNil,
  strictZip,
  switchType,
  todo,
  tuple,
  unexpected,
  withoutNils,
  xDifference,
} from "@/wab/shared/common";
import {
  CodeComponent,
  findStateForOnChangeParam,
  getComponentDisplayName,
  getParamDisplayName,
  isCodeComponent,
  isHostLessCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import * as Exprs from "@/wab/shared/core/exprs";
import {
  isRealCodeExpr,
  isRealCodeExprEnsuringType,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { mkVar } from "@/wab/shared/core/lang";
import { metaSvc } from "@/wab/shared/core/metas";
import { isTagInline } from "@/wab/shared/core/rich-text-util";
import { extractComponentUsages, writeable } from "@/wab/shared/core/sites";
import { isSlotSelection, SlotSelection } from "@/wab/shared/core/slots";
import { isOnChangeParam } from "@/wab/shared/core/states";
import {
  ignoredConvertablePlainTextProps,
  typographyCssProps,
} from "@/wab/shared/core/style-props";
import * as styles from "@/wab/shared/core/styles";
import { getCssInitial } from "@/wab/shared/css";
import { CanvasEnv, evalCodeWithEnv } from "@/wab/shared/eval";
import { parseExpr, pathToString } from "@/wab/shared/eval/expression-parser";
import * as Html from "@/wab/shared/html";
import {
  FREE_CONTAINER_LOWER,
  GRID_LOWER,
  HORIZ_CONTAINER_LOWER,
  LAYOUT_CONTAINER_LOWER,
  VERT_CONTAINER_LOWER,
} from "@/wab/shared/Labels";
import {
  ContainerLayoutType,
  getRshContainerType,
} from "@/wab/shared/layoututils";
import { isRenderableType, typeFactory } from "@/wab/shared/model/model-util";
import {
  getPlumeCodegenPlugin,
  getPlumeEditorPlugin,
} from "@/wab/shared/plume/plume-registry";
import {
  ReadonlyIRuleSetHelpersX,
  RSH,
  RuleSetHelpers,
} from "@/wab/shared/RuleSetHelpers";
import {
  fillCodeComponentDefaultSlotContent,
  getSlotArgs,
  getSlotSelectionContainingTpl,
  getTplSlotForParam,
  isCodeComponentSlot,
  isDescendantOfVirtualRenderExpr,
  isPlainTextArgNode,
} from "@/wab/shared/SlotUtils";
import { smartHumanize } from "@/wab/shared/strs";
import {
  getTplComponentArg,
  setTplComponentArg,
  TplMgr,
} from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  makeVariantComboSorter,
  sortedVariantSettings,
} from "@/wab/shared/variant-sort";
import {
  ensureBaseVariantSetting,
  ensureVariantSetting,
  isBaseVariant,
  mkVariantSetting,
  tryGetBaseVariantSetting,
  VariantCombo,
} from "@/wab/shared/Variants";
import L, { uniq, uniqBy } from "lodash";
import * as US from "underscore.string";

/**
 * From
 * https://stackoverflow.com/questions/4898374/which-html-elements-cant-contain-child-nodes
 * and https://www.w3.org/TR/html/syntax.html#void-elements
 */
export const atomicTagsPattern =
  /^(AREA|BASE|BR|COL|COMMAND|EMBED|HR|IMG|INPUT|KEYGEN|LINK|META|PARAM|SOURCE|TRACK|WBR|template|script|style|textarea|title|svg)$/i;

/**
 * Extra atomic tags that we should not support appending into.
 */
export const extraAtomicTags = new Set(["select", "svg", "textarea"]);

export const isTableSubElement = (
  tpl: /*TWZ*/ TplTag | TplTag | TplTag | TplTag
) => [...Html.tableTags].includes(tpl.tag);

export const isTableTopElement = (tpl) => tpl.tag === "table";

export const isTableLeafElement = (tpl) => tuple("td", "th").includes(tpl.tag);

export const isTableNonLeafElement = (tpl: /*TWZ*/ TplTag | TplTag) =>
  isTableSubElement(tpl) && !isTableLeafElement(tpl);

export function isAtomicTag(tag: string) {
  return (
    !!tag.match(atomicTagsPattern) || extraAtomicTags.has(tag.toLowerCase())
  );
}

export const canBeWrapped = (tpl: TplNode) =>
  switchType(tpl)
    .when([TplComponent, TplSlot], (_tpl) => true)
    .when(
      TplTag,
      (_tpl) =>
        !isBodyTpl(_tpl) &&
        (!isTableSubElement(_tpl) || isTableTopElement(_tpl))
    )
    .result();

export type AttrsSpec = { [name: string]: Expr | string | number | object };

/**
 * @example mkTplTagSimple('div')
 * @example mkTplTagSimple('div', {title: 'hello'})
 * @example mkTplTagSimple('div', {}, mkTplTagSimple('div'))
 */
export const mkTplTagSimple = (
  tag: string,
  attrs?: AttrsSpec,
  ...children: TplNode[]
) => mkTplTagX(tag, { attrs }, ...children);

/**
 * @example mkTplTagX('div', {attrs: {title: 'hello'}}, [child])
 */
export const mkTplTagX = (
  tag: string,
  opts?: MkTplTagOpts,
  ...children: DirectChildSet[]
) => mkTplTag(tag, flexFlatten(children) as TplNode[], opts);

export type ChildNode = TplNode | string;
export type ChildSet = ChildNode | ChildNode[];

export type DirectChildSet = TplNode | TplNode[];

export enum TplTagType {
  Text = "text",
  Image = "image",
  Columns = "columns",
  Column = "column",
  Other = "other",
}

export enum TplTagCodeGenType {
  Auto = "auto",
  AlwaysTag = "alwaysTag",
  NoTag = "noTag",
}

export const mkTplInlinedText = (
  text: string,
  variantCombo: VariantCombo,
  tag = "span",
  opts: MkTplTagOpts = {}
) => {
  const tpl = mkTplTagX(tag, { type: TplTagType.Text, ...(opts || {}) });
  const baseCombo = isBaseVariant(variantCombo)
    ? variantCombo
    : [ensure(opts.baseVariant, "Should have base variant")];
  ensureVariantSetting(tpl, baseCombo);
  ensureVariantSetting(tpl, variantCombo).text = new RawText({
    text,
    markers: [],
  });
  return tpl;
};

export interface MkTplTagOpts {
  id?: string;
  name?: string;
  uuid?: string;
  attrs?: AttrsSpec;
  dataRep?: Rep;
  dataCond?: CustomCode | ObjectPath;
  variants?: VariantSetting[];
  baseVariant?: Variant;
  type?: TplTagType;
  codeGenType?: TplTagCodeGenType;
  columnsSetting?: ColumnsSetting;
  styles?: Record<string, string>;
}

/**
 * @example mkTplTag('div', [child], {attrs: {title: 'hello'}})
 */
export function mkTplTag(
  tag: string,
  rawChildren?: DirectChildSet,
  opts?: MkTplTagOpts
) {
  let v;
  if (rawChildren == null) {
    rawChildren = [];
  }
  if (opts == null) {
    opts = {};
  }
  // make a copy of rawChildren to avoid caller from changing the children
  const children = Array.isArray(rawChildren)
    ? rawChildren.slice(0)
    : [rawChildren];
  const node = new TplTag({
    tag,
    uuid: opts.uuid ?? mkShortId(),
    name: opts.name,
    children,
    parent: null,
    vsettings: opts.variants || [],
    type: opts.type ? opts.type : TplTagType.Other,
    locked: null,
    codeGenType: opts.codeGenType,
    columnsSetting: opts.columnsSetting,
  });
  if (opts.attrs || opts.dataRep || opts.dataCond || opts.styles) {
    const vs = ensureVariantSetting(node, [
      ensure(opts.baseVariant, "Should have base variant"),
    ]);

    const attrs =
      opts.attrs != null
        ? Object.fromEntries(
            (() => {
              const result1: [string, Expr][] = [];

              for (const k in opts.attrs) {
                v = opts.attrs[k];
                const v2 = isKnownExpr(v) ? v : Exprs.codeLit(v);
                result1.push(tuple(k, v2));
              }

              return result1;
            })()
          )
        : {};
    check(!attrs.class);
    L.merge(vs.attrs, attrs);

    if (opts.dataRep) {
      vs.dataRep = opts.dataRep;
    }

    if (opts.dataCond) {
      vs.dataCond = opts.dataCond;
    }

    if (opts.styles) {
      const expr = RSH(vs.rs, node);
      for (const [key, value] of Object.entries(opts.styles)) {
        expr.set(key, value);
      }
    }
  }
  for (const child of [...children]) {
    child.parent = node;
  }
  return node;
}

export function mkTplComponent(
  component: Component,
  baseVariant: Variant,
  args?: Arg[] | { [name: string]: Expr },
  children?: MaybeArray<TplNode | string>
) {
  return mkTplComponentX({
    component,
    baseVariant,
    ...(args && { args }),
    ...(children && { children }),
  });
}

export function mkTplComponentFlex(
  component: Component,
  baseVariant: Variant,
  args?: Arg[] | { [prop: string]: Expr },
  ...children: ChildNode[]
) {
  if (children.length === 1 && Array.isArray(children[0])) {
    children = children[0] as any;
  }
  return mkTplComponent(
    component,
    baseVariant,
    args ?? undefined,
    children.length === 0 ? undefined : children
  );
}

type MaybeArray<T> = T | T[];

export interface MkTplComponentParams {
  component: Component;
  name?: string;
  args?: Arg[] | { [name: string]: Expr };
  children?: MaybeArray<TplNode | string>;
  dataRep?: Rep;
  dataCond?: CustomCode | ObjectPath;
  baseVariant: Variant;
}

export function mkTplComponentX(obj: MkTplComponentParams) {
  const { component, args, children, dataRep, dataCond, baseVariant } = obj;
  const name2param = new Map(
    [...component.params].map(
      (p: /*TWZ*/ Param | Param | Param) =>
        tuple(p.variable.name, p) as [string, Param]
    )
  );
  const processRenderables = (contents: RenderExpr | ChildSet) => {
    return switchType(contents)
      .when(RenderExpr, (_contents) => _contents)
      .elseUnsafe(() => {
        return new RenderExpr({
          tpl: ensureArray(contents).map((child) => {
            return switchType(child)
              .when(TplNode, (_child) => _child)
              .when(String, (_child) =>
                mkTplInlinedText(_child, [obj.baseVariant])
              )
              .when(RenderExpr, () => unexpected("RenderExpr handled above"))
              .result();
          }),
        });
      });
  };
  const argArray = Array.isArray(args)
    ? args
    : (() => {
        const result: Arg[] = [];
        for (const argName in args) {
          let param: Param;
          const expr = ensureType<Expr | TplNode | ChildSet>(args[argName]);
          result.push(
            new Arg({
              param: (param = ensure(
                name2param.get(argName),
                "Checked before"
              )),
              expr: isRenderableType(param.type)
                ? processRenderables(expr as RenderExpr | ChildSet)
                : switchType(expr)
                    .when(Expr, (_expr) => _expr)
                    // We always assume an array is meant to be a renderable. Not
                    // sure about this decision, but so far it's been handy.
                    .when(TplNode, (_expr) => processRenderables(_expr))
                    .when(Array, (_expr: ChildNode[]) =>
                      processRenderables(_expr)
                    )
                    .elseUnsafe(() => Exprs.codeLit(expr)),
            })
          );
        }
        return result;
      })();
  if (children != null) {
    argArray.push(
      new Arg({
        param: ensure(name2param.get("children"), "Checked before"),
        expr: processRenderables(children),
      })
    );
  }
  checkUnique(argArray, (arg: /*TWZ*/ Arg | Arg) => arg.param.variable.name);
  const vsettings: VariantSetting[] = [];

  const baseVs = mkVariantSetting({ variants: [obj.baseVariant] });
  baseVs.args = argArray;
  if (dataCond) {
    baseVs.dataCond = dataCond;
  }
  if (dataRep) {
    baseVs.dataRep = dataRep;
  }
  vsettings.push(baseVs);

  const tpl = new TplComponent({
    uuid: mkShortId(),
    parent: null,
    name: obj.name,
    component,
    vsettings,
    locked: null,
  });

  if (isCodeComponent(component)) {
    if (component.codeComponentMeta.defaultStyles) {
      new RuleSetHelpers(baseVs.rs, "div").mergeRs(
        component.codeComponentMeta.defaultStyles
      );
    }

    for (const param of component.params) {
      if (isKnownClassNamePropType(param.type)) {
        const styledSelectors = [
          ...(Object.keys(param.type.defaultStyles).length > 0
            ? [
                {
                  label: "Base",
                  selector: null,
                  defaultStyles: param.type.defaultStyles,
                },
              ]
            : []),
          ...param.type.selectors.filter(
            (selector) => Object.keys(selector.defaultStyles).length > 0
          ),
        ];
        if (styledSelectors.length > 0) {
          const selectorRulesets = styledSelectors.map((s) =>
            styles.mkSelectorRuleSet({
              selector: s.selector,
              isBase: s.selector == null || s.label === "Base",
            })
          );
          const selectorToRuleSet = new Map<string, SelectorRuleSet>();
          selectorRulesets.forEach((s) => {
            selectorToRuleSet.set(!s.selector ? "base" : s.selector, s);
          });
          styledSelectors.forEach((s) => {
            const selector = !s.selector ? "base" : s.selector;
            new RuleSetHelpers(
              ensure(
                selectorToRuleSet.get(selector),
                () => `Should have selector ${selector}`
              ).rs,
              "div"
            ).mergeRs(styles.mkRuleSet({ values: s.defaultStyles }));
          });
          const expr = new StyleExpr({
            uuid: mkShortId(),
            styles: selectorRulesets,
          });
          setTplComponentArg(tpl, baseVs, param.variable, expr);
        }
      }
    }

    // This is the owner site of the _component_, not the owner site
    // of this TplComponent that we're building. That's fine, because
    // it can really only reference components from that same site.
    const ownerSite = tryGetOwnerSite(component);
    if (ownerSite) {
      for (const prop of Object.keys(
        component.codeComponentMeta.defaultSlotContents
      )) {
        if (!$$$(tpl).getSlotArg(prop)) {
          // But only fill in default content if no specified content
          fillCodeComponentDefaultSlotContent(
            tpl as TplCodeComponent,
            prop,
            baseVariant
          );
        }
      }
    }
  }

  for (const arg of baseVs.args) {
    if (isKnownRenderExpr(arg.expr)) {
      for (const child of [...arg.expr.tpl]) {
        if (child.parent == null) {
          child.parent = tpl;
        }
      }
    }
  }
  return tpl;
}

/**
 * This function recreates `tpl.children` based in NodeMarkers inside tpl's
 * variant settings. It's used after a text is edited, for example, to ensure
 * that there are no orphan children.
 */
export function fixTextChildren(tpl: TplTag) {
  assert(
    isTplTextBlock(tpl),
    "fixTextChildren expects a TplTag with 'text' type"
  );

  const childrenSet = new Set<TplNode>();

  for (const vs of tpl.vsettings) {
    if (!isKnownRawText(vs.text)) {
      continue;
    }
    const markers = vs.text.markers;
    for (const marker of markers) {
      if (isKnownNodeMarker(marker)) {
        childrenSet.add(marker.tpl);
      }
    }
  }

  const newChildrenArray = [...childrenSet];
  const newChildrenRec = new Set<TplNode>();

  newChildrenArray.forEach((child) =>
    walkTpls(child, {
      post: (node) => {
        newChildrenRec.add(node);
      },
    })
  );

  const deletedTpls: TplNode[] = [];

  tpl.children.forEach((child) =>
    walkTpls(child, {
      // post-order to delete bottom-up
      post: (node) => {
        if (!newChildrenRec.has(node)) {
          deletedTpls.push(node);
        }
      },
    })
  );

  deletedTpls.forEach((node) => $$$(node).remove({ deep: true }));

  tpl.children = [...newChildrenArray];
  tpl.children.forEach((child) => (child.parent = tpl));
  return tpl;
}

export function reconnectChildren(tpl: TplNode) {
  tplChildren(tpl).forEach((child) => (child.parent = tpl));
  return tpl;
}

type TplTagSettings = Pick<VariantSetting, "attrs" | "text" | "columnsConfig">;
type TplComponentSettings = Pick<VariantSetting, "args">;

export function cloneAttrs(attrs: { [key: string]: Expr }) {
  return Object.fromEntries(
    Object.keys(attrs || {}).map((name) => {
      const expr = attrs[name];

      return tuple(name, Exprs.clone(expr));
    })
  );
}

/**
 * `oldToNewChildren` is used to make duplication of tpls work properly
 * by making the weak references tpl.vsettings[i].text.markers[j].tpl
 * correspond to tpls that exist in tpl.children.
 *
 * `keepTplUuid` is used to preserve tpl uuids when cloning a TplTag
 * during evaluation (evalTplTag). We need that cloning to preserve
 * uuids so that after a text is edited in canvas we update the tpl
 * in all variant settings it is used.
 */
export function cloneMarker(
  marker: Marker,
  oldToNewChildren?: Map<TplNode, TplNode>,
  keepTplUuid = false
) {
  if (isKnownStyleMarker(marker)) {
    return new StyleMarker({
      length: marker.length,
      rs: styles.cloneRuleSet(marker.rs),
      position: marker.position,
    });
  } else if (isKnownNodeMarker(marker)) {
    assert(
      isTplTag(marker.tpl),
      "We only support TplTags in NodeMarkers at the moment"
    );
    const newMarker = new NodeMarker({
      length: marker.length,
      position: marker.position,
      tpl: oldToNewChildren?.get(marker.tpl) ?? clone(marker.tpl, keepTplUuid),
    });
    return newMarker;
  }
  unexpected();
}

export function cloneRichText(
  richText: RichText | null | undefined,
  oldToNewChildren?: Map<TplNode, TplNode>,
  keepTplUuid = false
) {
  if (!richText) {
    return undefined;
  }
  if (isKnownRawText(richText)) {
    return new RawText({
      text: richText.text,
      markers: richText.markers.map((marker) =>
        cloneMarker(marker, oldToNewChildren, keepTplUuid)
      ),
    });
  }
  if (isKnownExprText(richText)) {
    return new ExprText({
      expr: Exprs.clone(richText.expr),
      html: richText.html,
    });
  }
  unexpected();
}

export function cloneColumnsSetting(
  setting: ColumnsSetting | null | undefined
) {
  if (!setting) {
    return setting;
  }

  return new ColumnsSetting({
    screenBreakpoint: setting.screenBreakpoint,
  });
}

export function cloneColumnsConfig(config: ColumnsConfig | null | undefined) {
  if (!config) {
    return config;
  }

  return new ColumnsConfig({
    breakUpRows: config.breakUpRows,
    colsSizes: [...config.colsSizes],
  });
}

export function cloneTagSettings(
  vs: TplTagSettings,
  oldToNewChildren?: Map<TplNode, TplNode>,
  keepTplUuid?: boolean
) {
  return {
    attrs: cloneAttrs(vs.attrs),
    text: cloneRichText(vs.text, oldToNewChildren, keepTplUuid),
    columnsConfig: cloneColumnsConfig(vs.columnsConfig),
  };
}

export function cloneArgs(args: Array<Arg>) {
  return [...args].map(
    (arg) =>
      new Arg({
        param: arg.param,
        expr: Exprs.clone(arg.expr),
      })
  );
}

export function cloneComponentSettings(vs: TplComponentSettings) {
  return {
    args: cloneArgs(vs.args),
  };
}

export const cloneDataSettings = (vs: VariantSetting) => {
  return {
    dataCond: maybe(vs.dataCond, (cond) => Exprs.clone(cond)),
    dataRep: maybe(vs.dataRep, (rep) => cloneDataRep(rep)),
  };
};

export const cloneDataRep = (rep: Rep) => {
  return new Rep({
    element: mkVar(rep.element.name),
    index: maybe(rep.index, (v) => mkVar(v.name)),
    collection: Exprs.clone(rep.collection),
  });
};

export const cloneVariantSetting = (
  vs: VariantSetting,
  oldToNewChildren?: Map<TplNode, TplNode>,
  keepTplUuid?: boolean
) =>
  new VariantSetting({
    ...cloneTagSettings(vs, oldToNewChildren, keepTplUuid),
    ...cloneComponentSettings(vs),
    ...cloneDataSettings(vs),
    rs: styles.cloneRuleSet(vs.rs),
    variants: vs.variants.slice(0),
    columnsConfig: cloneColumnsConfig(vs.columnsConfig),
  });

const cloneTagComponentCommonFields = (
  tpl: TplTag | TplComponent,
  oldToNewChildren?: Map<TplNode, TplNode>,
  keepTplUuid?: boolean
) => ({
  name: tpl.name,
  locked: tpl.locked,
  vsettings: tpl.vsettings.map((vs) =>
    cloneVariantSetting(vs, oldToNewChildren, keepTplUuid)
  ),
});

// TODO This needs to be aware of what parts of expressions to clone vs.
// reference.  For instance, if internal to this sub-tree there's a let
// referencing another let, we should do different things depending on whether
// the latter let is also internal or is external!
export function clone(tpl: TplTag, keepTplUuid?: boolean): TplTag;
export function clone(tpl: TplComponent, keepTplUuid?: boolean): TplComponent;
export function clone(tpl: TplSlot): TplSlot;
export function clone(tpl: TplNode): TplNode;
export function clone(tpl: TplNode, keepTplUuid?: boolean): TplNode {
  return reconnectChildren(
    switchType(tpl)
      .when(
        TplSlot,
        (_tpl) =>
          new TplSlot({
            uuid: mkShortId(),
            parent: null,
            param: _tpl.param,
            defaultContents: [..._tpl.defaultContents].map((child) =>
              clone(child)
            ),
            vsettings: _tpl.vsettings.map((vs) => cloneVariantSetting(vs)),
            locked: _tpl.locked,
          })
      )
      .when(TplComponent, (_tpl) => {
        const cloned = new TplComponent(
          L.assignIn(
            {
              uuid: keepTplUuid ? _tpl.uuid : mkShortId(),
              parent: null,
              component: _tpl.component,
            },
            cloneTagComponentCommonFields(_tpl)
          )
        );
        cloned.vsettings
          .flatMap((vs) => vs.args)
          .forEach((arg) => {
            if (isKnownDataSourceOpExpr(arg.expr)) {
              arg.expr.parent = new QueryRef({ ref: cloned });
            }
          });
        return cloned;
      })
      .when(TplTag, function (_tpl) {
        const newChildren: TplNode[] = [];
        const oldToNewChildren = new Map<TplNode, TplNode>();
        for (const child of _tpl.children) {
          // TODO: At the moment, only TplTags support keeping uuids.
          const newChild = isKnownTplTag(child)
            ? clone(child, keepTplUuid)
            : clone(child);
          newChildren.push(newChild);
          oldToNewChildren.set(child, newChild);
        }
        const newTpl = new TplTag({
          uuid: keepTplUuid ? _tpl.uuid : mkShortId(),
          parent: null,
          tag: _tpl.tag,
          children: newChildren,
          type: _tpl.type,
          codeGenType: _tpl.codeGenType,
          columnsSetting: cloneColumnsSetting(_tpl.columnsSetting),
          ...cloneTagComponentCommonFields(_tpl, oldToNewChildren, keepTplUuid),
        });
        return newTpl;
      })
      .result()
  );
}

export class ExprLocationWithinTpl {
  _nameOrBinding: /*TWZ*/ Arg | Rep | string;
  constructor(_nameOrBinding) {
    this._nameOrBinding = _nameOrBinding;
  }
  key() {
    if (L.isString(this._nameOrBinding)) {
      return this._nameOrBinding;
    } else {
      return this._nameOrBinding.uid;
    }
  }
  nameOrBinding() {
    return this._nameOrBinding;
  }
  toString() {
    if (L.isString(this._nameOrBinding)) {
      switch (this._nameOrBinding) {
        case "dataText":
          return "text expression";
        case "dataCond":
          return "conditional expression";
        default:
          throw new InvalidCodePathError();
      }
    } else {
      return switchType(this._nameOrBinding)
        .when(Rep, (binding) => binding.element.name)
        .when(Arg, (binding) => binding.param.variable.name)
        .result();
    }
  }
}

// Analyze a single Tpl
export function analyzeExprsInTpl(
  {
    tpl,
    startingExpr = undefined,
    readExpr,
    defVar,
    rec,
  }: {
    tpl: TplNode;
    startingExpr?: Expr;
    readExpr: (expr: Expr, loc: ExprLocationWithinTpl) => void;
    defVar: (v: Var) => void;
    rec: any;
  } // /*TWZ*/{ defVar: (v: any) => any, readExpr: (expr: any,loc: any) => any, rec: (node: any) => any, startingExpr: null, tpl: TplTag }|{ defVar: (v: any) => any, readExpr: (expr: any,loc: any) => any, rec: (node: any) => any, startingExpr: null, tpl: TplText }|{ defVar: (v: any) => any, readExpr: (expr: any,location: any) => any, rec: (child: any) => any, startingExpr: undefined, tpl: TplTag }|{ defVar: (v: any) => any, readExpr: (expr: any,location: any) => any, rec: (child: any) => any, startingExpr: undefined, tpl: TplText }|{ defVar: (v: any) => any, readExpr: (expr: any,locationInTpl: any) => any, rec: (child: any) => any, startingExpr: null, tpl: TplTag }|{ defVar: (v: any) => any, readExpr: (expr: any,locationInTpl: any) => any, rec: (child: any) => any, startingExpr: null, tpl: TplText }|{ defVar: (variable: any) => any, readExpr: (expr: any,loc: any) => any, rec: () => any, startingExpr: undefined, tpl: TplComponent }|{ defVar: (variable: any) => any, readExpr: (expr: any,loc: any) => any, rec: () => any, startingExpr: undefined, tpl: TplTag }
) {
  let started = startingExpr == null;
  function _readExpr(
    expr: Expr | null | undefined,
    location: ExprLocationWithinTpl
  ) {
    if (expr != null) {
      if (startingExpr === expr) {
        started = true;
      }
      if (started) {
        return readExpr(expr, location);
      }
    }
  }
  function _defVar(v: /*TWZ*/ Var | Var | null | undefined) {
    if (started && v != null) {
      return defVar(v);
    }
  }

  function processTplData(_tpl: TplTag | TplComponent) {
    for (const vs of _tpl.vsettings) {
      _readExpr(vs.dataCond, new ExprLocationWithinTpl("dataCond"));
      _readExpr(
        vs.dataRep != null ? vs.dataRep.collection : undefined,
        new ExprLocationWithinTpl(vs.dataRep)
      );
      _defVar(vs.dataRep != null ? vs.dataRep.element : undefined);
      _defVar(vs.dataRep != null ? vs.dataRep.index : undefined);
      if (isKnownTplTag(_tpl)) {
        for (const [attr, expr] of Object.entries(vs.attrs)) {
          _readExpr(expr, new ExprLocationWithinTpl(`attr ${attr}`));
        }
      } else if (isKnownTplComponent(_tpl)) {
        for (const arg of vs.args) {
          _readExpr(arg.expr, new ExprLocationWithinTpl(arg));
        }
      } else {
        unexpected();
      }
    }
  }

  switchType(tpl)
    .when(TplTag, (_tpl) => {
      processTplData(_tpl);
    })
    .when(TplComponent, (_tpl) => {
      processTplData(_tpl);
    })
    .when(TplSlot, (_tpl) => {})
    .result();
  tplChildren(tpl).map((child) => rec(child));
}

export function hasNonTrivialCodeExprs(tplRoot: TplNode) {
  let found = false;
  const rec = (tpl: TplNode) =>
    analyzeExprsInTpl({
      tpl,
      readExpr(expr, _locationInTpl) {
        if (isKnownCustomCode(expr) && tryExtractJson(expr) === undefined) {
          found = true;
        }
      },
      defVar(_v) {},
      rec(child: TplNode) {
        return rec(child);
      },
    });
  rec(tplRoot);
  return found;
}

export function findVarDefs(tplRoot: TplNode) {
  const found: Var[] = [];
  const rec = (tpl: TplNode) =>
    analyzeExprsInTpl({
      tpl,
      readExpr(_expr, _locationInTpl) {},
      defVar(v) {
        found.push(v);
      },
      rec(child: TplNode) {
        return rec(child);
      },
    });
  rec(tplRoot);
  return found;
}

/**
 * Currently, this simply ensures the parent and child pointers are consistent.
 */
export function checkTplIntegrity(
  tplRoot: TplNode,
  { doThrow = false }: { doThrow?: boolean } = {}
) {
  function showPath(path: TplNode[]) {
    return `[${path.map((tpl) => summarizeTpl(tpl)).join(" > ")}]`;
  }
  function rec(path: TplNode[]) {
    const tpl = ensure(L.last(path), "Path should atleast have root");
    switchType(tpl)
      .when([TplTag, TplComponent], (_tpl) => {
        const children = $$$(_tpl).children().toArrayOfTplNodes();
        children.forEach((child) => {
          if (!(child.parent === _tpl)) {
            const msg = `Parent of ${showPath(tuple(...path, child))} is ${
              child.parent
            }`;
            if (doThrow) {
              throw new Error(msg);
            } else {
              console.warn(msg);
            }
          }
        });
        children.forEach((child) => rec(tuple(...path, child)));
      })
      .when(TplSlot, () => todo("TplSlot"))
      .result();
  }
  rec([tplRoot]);
}

/**
 * Walks the tpl tree, calling pre or post on each node.  pre is called before
 * descending on children, and post is called after.
 *
 * pre can return false to skip descending into children of the node.
 */
export function walkTpls(
  tplRoot: TplNode,
  {
    pre,
    post,
  }: {
    post?: (tpl: TplNode, path: TplNode[]) => void;
    pre?: (tpl: TplNode, path: TplNode[]) => void | boolean;
  }
) {
  const rec = function (node: TplNode, path: TplNode[]) {
    const descend = pre && pre(node, path);
    if (descend === false) {
      return;
    }
    const nextPath = [...path, node];
    tplChildren(node).forEach((child) => rec(child, nextPath));
    post && post(node, path);
  };
  return rec(tplRoot, []);
}

/**
 * Like walkTpls, but will also include the Arg that we're traversing
 * down if the parent is a TplComponent
 */
export function walkTplsAndArgs(
  tplRoot: TplNode,
  {
    pre,
    post,
  }: {
    post?: (tpl: TplNode | Arg, path: (TplNode | Arg)[]) => void;
    pre?: (tpl: TplNode | Arg, path: (TplNode | Arg)[]) => void | boolean;
  }
) {
  const getNextPaths = (node: TplNode | Arg, path: (TplNode | Arg)[]) => {
    const newPath = [...path, node];
    if (isTplTag(node)) {
      return node.children.map((n) => tuple(n, newPath));
    } else if (isTplComponent(node)) {
      return getSlotArgs(node).map((arg) => tuple(arg, newPath));
    } else if (isTplSlot(node)) {
      return node.defaultContents.map((n) => tuple(n, newPath));
    } else if (isKnownArg(node)) {
      if (isKnownRenderExpr(node.expr)) {
        return node.expr.tpl.map((n) => tuple(n, newPath));
      } else {
        return [];
      }
    } else {
      unexpected();
    }
  };

  const rec = function (node: TplNode | Arg, path: (TplNode | Arg)[]) {
    const descend = pre && pre(node, path);
    if (descend === false) {
      return;
    }
    const nextPaths = getNextPaths(node, path);
    for (const [childNode, childPath] of nextPaths) {
      rec(childNode, childPath);
    }
    post && post(node, path);
  };
  return rec(tplRoot, []);
}

/**
 * Returns direct child nodes, including ALL slots for TplComponents.
 *
 * See `childrenOnly()` to get only the "children" slot for TplComponents.
 */
export function tplChildren(node: TplNode) {
  return tplChildrenInternal(node, false);
}

/**
 * Returns direct child nodes, including the "children" slot for TplComponents.
 *
 * See `children()` to get ALL slots for TplComponents.
 */
export function tplChildrenOnly(node: TplNode) {
  return tplChildrenInternal(node, true);
}

function tplChildrenInternal(node: TplNode, childrenOnly: boolean) {
  return switchType(node)
    .when(TplTag, (_node) => _node.children)
    .when(TplComponent, (_node) =>
      getSlotArgs(_node)
        .filter((slot) =>
          childrenOnly ? slot.param.variable.name === "children" : true
        )
        .flatMap((arg) => (isKnownRenderExpr(arg.expr) ? arg.expr.tpl : []))
    )
    .when(TplSlot, (_node) => _node.defaultContents)
    .result();
}

export function filterTpls<T extends TplNode>(
  tplRoot: TplNode,
  filter: (tpl: TplNode) => tpl is T,
  excludeFilteredDescendants?: boolean
): T[];
export function filterTpls(
  tplRoot: TplNode,
  filter: (tpl: TplNode) => boolean,
  excludeFilteredDescendants?: boolean
): TplNode[];
export function filterTpls(
  tplRoot: TplNode,
  filter: (tpl: TplNode) => boolean,
  excludeFilteredDescendants = false
) {
  const result: TplNode[] = [];
  walkTpls(tplRoot, {
    pre(tpl) {
      if (filter(tpl)) {
        result.push(tpl);
        return true;
      } else if (excludeFilteredDescendants) {
        return false;
      } else {
        return true;
      }
    },
  });
  return result;
}

export function flattenTplsExcludingSubTrees(
  tree: TplNode,
  excludeTrees?: TplNode[]
): TplNode[] {
  const fullTree = new Set(flattenTpls(tree));
  const tplsToExclude = new Set(
    excludeTrees
      ? excludeTrees.flatMap((excludeTree) => flattenTpls(excludeTree))
      : []
  );
  const tpls = xDifference(fullTree, tplsToExclude);
  return [...tpls];
}

export function flattenTpls(tplRoot: TplNode) {
  return filterTpls(tplRoot, () => true);
}

export function flattenTplsBottomUp(tplRoot: TplNode) {
  const result: TplNode[] = [];
  walkTpls(tplRoot, {
    post(tpl) {
      result.push(tpl);
    },
  });
  return result;
}

/**
 * Flattens TplNode, but excludes descendants of VirtualRenderExpr (bottom up)
 */
export function flattenTplsWithoutVirtualDescendants(tplRoot: TplNode) {
  const result: TplNode[] = [];
  walkTplsAndArgs(tplRoot, {
    pre(tpl, _path) {
      if (isKnownArg(tpl) && isKnownVirtualRenderExpr(tpl.expr)) {
        return false;
      }
      if (isKnownTplNode(tpl)) {
        result.push(tpl);
      }
      return true;
    },
  });
  return result.reverse();
}

export function fixParentPointers(root: TplNode) {
  root.parent = null;
  walkTpls(root, {
    pre(tpl, path) {
      if (tpl !== root) {
        tpl.parent = ensure(L.last(path), "Path should atleast have root");
      }
    },
  });
}

/**
 * Returns in bottom-up order. Includes the argument `tpl` unless
 * `excludeSelf` is true.
 */
export function ancestorsUp(tpl: TplNode, excludeSelf = false) {
  const tpls: TplNode[] = [];
  let curTpl: TplNode | null | undefined = tpl;
  while (isNonNil(curTpl)) {
    tpls.push(curTpl);
    curTpl = curTpl.parent;
  }
  return excludeSelf ? tpls.slice(1) : tpls;
}

/** Returns in bottom-up order. Includes the argument `tpl` */
export function ancestorsUpWithSlotSelections(node: TplNode | SlotSelection) {
  const nodes: (TplNode | SlotSelection)[] = [];
  let curNode: TplNode | SlotSelection | null | undefined = node;
  while (isNonNil(curNode)) {
    nodes.push(curNode);
    curNode = getParentTplOrSlotSelection(curNode);
  }
  return nodes;
}

export function getParentTplOrSlotSelection(node: TplNode | SlotSelection) {
  if (node instanceof SlotSelection) {
    return node.getTpl();
  } else if (!node.parent) {
    return undefined;
  } else if (isTplComponent(node.parent)) {
    return ensure(
      getSlotSelectionContainingTpl(node),
      "Must belong to a TplComponent arg"
    );
  } else {
    return node.parent;
  }
}

/** Returns in top-down order. Includes the argument `tpl` */
export function ancestors(tpl: TplNode): TplNode[] {
  const tpls = ancestorsUp(tpl);
  return tpls.reverse();
}

/**
 * Returns the full list of ancestors of a given tpl, including the tpl itself.
 * Opposite of `ancestorsUp` will break through slot boundaries to include tpl nodes
 * that are present in the `tplTree` of the component owning the slot, this makes
 * the list of nodes returned by the function not necessarily respect the parent-child
 * relationship of the nodes in the tree. But this is useful when we want to know about
 * elements involved in the dom composition to render a given tpl.
 */
export function ancestorsThroughComponentsWithSlotSelections(
  tpl: TplNode | SlotSelection,
  opts: {
    includeTplComponentRoot?: boolean;
  } = {}
): (TplNode | SlotSelection)[] {
  const allAncestors: (TplNode | SlotSelection)[] = [];
  let curNode: TplNode | SlotSelection | undefined | null = tpl;

  if (
    isTplComponent(tpl) &&
    !isCodeComponent(tpl.component) &&
    opts.includeTplComponentRoot
  ) {
    // We will consider the tpl component root as part of the ancestors chain even if it is not
    // technically an ancestor of the tpl node, we may want to extend it later to go down in the
    // chain of nodes until finding a code component or tpl tag
    allAncestors.push(tpl.component.tplTree);
  }

  while (curNode) {
    allAncestors.push(curNode);
    if (isSlotSelection(curNode)) {
      // If the current node is a slot selection, we need to check if we can break through the
      // slot boundary to get to the tpl node that is present in the tplTree of the component owning the slot.
      // This only happens if we are dealing with a plasmic component
      const tplComponent = curNode.getTpl();
      if (isCodeComponent(tplComponent.component)) {
        curNode = tplComponent;
      } else {
        // Is unncessary to call getTplSlotParam here, but we call to validate what we are doing
        const tplSlot = getTplSlotForParam(
          tplComponent.component,
          curNode.slotParam
        );
        // Before updating the current node, we include all the ancestors of the tpl slot going
        // through the tpl tree of the component owning the slot
        allAncestors.push(
          ...ancestorsThroughComponentsWithSlotSelections(tplSlot)
        );
        curNode = tplComponent;
      }
    } else {
      curNode = getParentTplOrSlotSelection(curNode);
    }
  }
  return allAncestors;
}

export const summarizeTpl = (
  tpl: TplNode,
  rsh?: ReadonlyIRuleSetHelpersX
): string =>
  switchType(tpl)
    .when(
      TplSlot,
      (_tpl) => `Slot Target: ${US.quote(_tpl.param.variable.name)}`
    )
    .when(TplComponent, (_tpl: /*TWZ*/ TplComponent) =>
      getComponentDisplayName(_tpl.component)
    )
    .when(TplTag, (_tpl) => summarizeTplTag(_tpl, rsh))
    .result();

export const summarizeTplPath = (tpl) =>
  [...ancestors(tpl).slice(1)].map((node) => summarizeTpl(node)).join(" > ");

export function summarizeTplTag(tpl: TplTag, rsh?: ReadonlyIRuleSetHelpersX) {
  return getTplTagTypeDescription(tpl, rsh);
}

export function summarizeUnnamedTpl(
  tpl: TplNamable,
  rsh?: ReadonlyIRuleSetHelpersX
) {
  return `(unnamed ${summarizeTpl(tpl, rsh)})`;
}

export function summarizeTplNamable(
  tpl: TplNamable,
  rsh?: ReadonlyIRuleSetHelpersX
) {
  if (tpl.name) {
    return tpl.name;
  }
  return summarizeUnnamedTpl(tpl, rsh);
}

export function getTplTagTypeDescription(
  tpl: TplTag,
  rsh?: ReadonlyIRuleSetHelpersX
) {
  if (isTplColumn(tpl)) {
    return "column";
  }
  if (isTplColumns(tpl)) {
    return "columns";
  }
  switch (tpl.tag) {
    case "div": {
      if (isTplTextBlock(tpl)) {
        return "text";
      }

      const containerType = rsh && getRshContainerType(rsh);

      if (containerType === ContainerLayoutType.flexColumn) {
        return VERT_CONTAINER_LOWER;
      } else if (containerType === ContainerLayoutType.flexRow) {
        return HORIZ_CONTAINER_LOWER;
      } else if (containerType === ContainerLayoutType.grid) {
        return GRID_LOWER;
      } else if (containerType === ContainerLayoutType.contentLayout) {
        if (isComponentRoot(tpl)) {
          return "page";
        }
        return LAYOUT_CONTAINER_LOWER;
      }

      return FREE_CONTAINER_LOWER;
    }
    case "a":
      return "link";
    case "input": {
      const inputType = tagInputType(tpl);
      switch (inputType) {
        case "text":
          return "text input";
        case "checkbox":
          return "checkbox";
        case "radio":
          return "radio button";
        case "datetime-local":
          return "time input";
        default:
          return `${inputType} input`; // e.g. password, number, email, color, month, etc.
      }
    }
    default:
      return tpl.tag;
  }
}

export function tagInputType(tpl: TplTag) {
  assert(
    tpl.tag === "input",
    "Only call this function if it's a tag input type"
  );
  if (tpl.vsettings.length === 0) {
    return "text";
  } else {
    const typeExpr = ensure(
      tryGetBaseVariantSetting(tpl),
      "Should have base variant"
    ).attrs.type;
    if (!typeExpr) {
      return "text";
    }
    return Exprs.tryExtractLit(typeExpr);
  }
}

export function cloneType<T extends Type>(type_: T): T {
  const type: Type = type_;
  return switchType<Type>(type)
    .when([Scalar, Img, HrefType], () => typeFactory[type.name]())
    .when([AnyType, QueryData, TargetType], () => typeFactory[type.name]())
    .when(Choice, (t) =>
      typeFactory.choice(
        isArrayOfStrings(t.options)
          ? t.options
          : t.options.map((op) => ({
              label: op.label as string,
              value: op.value,
            }))
      )
    )
    .when(ComponentInstance, (t) => typeFactory.instance(t.component))
    .when(PlumeInstance, (t) => typeFactory.plumeInstance(t.plumeType))
    .when(ColorPropType, (t) => typeFactory.color({ noDeref: t.noDeref }))
    .when(DateString, (t) => typeFactory.dateString())
    .when(DateRangeStrings, (t) => typeFactory.dateRangeStrings())
    .when(ClassNamePropType, (t) =>
      typeFactory.classNamePropType(t.selectors, t.defaultStyles)
    )
    .when(StyleScopeClassNamePropType, (t) =>
      typeFactory.styleScopeClassNamePropType(t.scopeName)
    )
    .when(RenderFuncType, (tt) =>
      typeFactory[tt.name]({
        params: tt.params.map((t) => cloneType(t)),
        allowed: tt.allowed.map((t) => cloneType(t)),
        allowRootWrapper: tt.allowRootWrapper,
      })
    )
    .when(ArgType, (t) => typeFactory[t.name](t.argName, cloneType(t.type)))
    .when(FunctionType, (t) => typeFactory[t.name](...t.params.map(cloneType)))
    .when(RenderableType, (t) =>
      typeFactory[t.name]({
        params: t.params.map(cloneType),
        allowRootWrapper: t.allowRootWrapper,
      })
    )
    .when(DefaultStylesPropType, (t) => typeFactory[t.name]())
    .when(DefaultStylesClassNamePropType, (t) =>
      typeFactory.defaultStylesClassNamePropType(t.includeTagStyles)
    )
    .result();
}

export function mkSlot(param: SlotParam, defaultContents?: TplNode[]) {
  const slot = new TplSlot({
    uuid: mkShortId(),
    parent: null,
    param,
    defaultContents: defaultContents != null ? defaultContents : [],
    vsettings: [],
    locked: null,
  });
  writeable(param).tplSlot = slot;
  for (const child of [...slot.defaultContents]) {
    child.parent = slot;
  }
  return slot;
}

export function getTagOrComponentName(tpl: TplNode): string | undefined {
  return switchType(tpl)
    .when(TplComponent, (_tpl: /*TWZ*/ TplComponent) =>
      getComponentDisplayName(_tpl.component)
    )
    .when(TplTag, (_tpl: /*TWZ*/ TplTag) => _tpl.tag)
    .elseUnsafe(() => undefined);
}

export function summarizeSlotParam(slotParam: Param): string {
  return `Slot: "${slotParam.variable.name}"`;
}

export function mkRep(name: string, collection: CustomCode | ObjectPath): Rep {
  return new Rep({
    element: mkVar(name),
    index: undefined,
    collection,
  });
}

export function debugTplTree(tpl: TplNode): string {
  function* rec(_tpl: TplNode, indent = 0): Iterable<string> {
    yield L.repeat("  ", indent) + summarizeTpl(_tpl);
    for (const child of $$$(_tpl).children().toArrayOfTplNodes()) {
      yield* rec(child, indent + 1);
    }
  }

  return [...rec(tpl)].join("\n");
}

export function isBodyTpl(tpl: TplNode) {
  return isKnownTplTag(tpl) && tpl.tag === "body";
}

export function isGrid(tpl: TplNode) {
  return tpl.vsettings.some((vs) => RSH(vs.rs, tpl).get("display") === "grid");
}

export function isGridChild(tpl: TplNode) {
  if (!tpl.parent) {
    return false;
  }
  return isTplVariantable(tpl.parent) && isGrid(tpl.parent);
}

export function replaceTplTreeByEmptyBox(component: Component) {
  const oldTree = component.tplTree;
  const root = mkTplTagX("div", {
    variants: isTplVariantable(oldTree)
      ? oldTree.vsettings.map((v) => mkVariantSetting({ variants: v.variants }))
      : undefined,
  });
  const baseVs = ensure(
    tryGetBaseVariantSetting(root),
    "Root should have base vsetting"
  );
  RSH(baseVs.rs, root).set("display", "block");

  component.tplTree = root;
  $$$(root).insertAt(oldTree, 0);
  oldTree.parent = root;
  trackComponentRoot(component);
  $$$(oldTree).remove({ deep: true });
}

export function* findVariantSettingsUnderTpl(
  tplNode: TplNode,
  orderProvider?: {
    site: Site;
    component: Component;
  }
) {
  const tpls = flattenTpls(tplNode);
  const sorter = orderProvider
    ? makeVariantComboSorter(orderProvider.site, orderProvider.component)
    : undefined;
  for (const tpl of tpls) {
    if (isTplVariantable(tpl)) {
      let vsettings = [...tpl.vsettings];
      if (sorter) {
        vsettings = sortedVariantSettings(vsettings, sorter);
      }
      for (const vs of vsettings) {
        yield tuple(vs, tpl);
      }
    }
  }
}

export function* findVariantSettingsUnderComponents(
  components: Component[],
  orderProvider?: {
    site: Site;
  }
) {
  const seen = new Set<Component>();
  function* findVariantSettingsUnderComponent(component: Component) {
    if (seen.has(component)) {
      return;
    }
    seen.add(component);
    for (const [vs, tpl] of findVariantSettingsUnderTpl(
      component.tplTree,
      orderProvider ? { site: orderProvider.site, component } : undefined
    )) {
      if (isTplComponent(tpl)) {
        yield* findVariantSettingsUnderComponent(tpl.component);
      }
      yield tuple(vs, tpl);
    }
  }

  for (const component of components) {
    yield* findVariantSettingsUnderComponent(component);
  }
}

export function isTplTag(tplNode: any): tplNode is TplTag {
  return isKnownTplTag(tplNode);
}

export function canHaveChildren(tpl: TplTag) {
  return canTagHaveChildren(tpl.tag);
}

export function canTagHaveChildren(tag: string) {
  // This React tags https://github.com/yannickcr/eslint-plugin-react/issues/709
  // cannot have children.
  return ![
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "menuitem",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ].includes(tag.toLowerCase());
}

export class RawTextLike {
  constructor(public text: string, public markers: Marker[]) {}
}

export function isTplComponent(tplNode: any): tplNode is TplComponent {
  return isKnownTplComponent(tplNode);
}

export interface TplCodeComponent extends TplComponent {
  component: CodeComponent;
}

export function isTplCodeComponent(tplNode: any): tplNode is TplCodeComponent {
  return isKnownTplComponent(tplNode) && isCodeComponent(tplNode.component);
}

export function isNamedTplComponent(tplNode: TplNode) {
  return isTplComponent(tplNode) && tplNode.component.name;
}

export function isTplSlot(tplNode: any): tplNode is TplSlot {
  return isKnownTplSlot(tplNode);
}

export function isRawText(tplNode: any): tplNode is RawText {
  return isKnownRawText(tplNode);
}

export function isExprText(tplNode: any): tplNode is ExprText {
  return isKnownExprText(tplNode);
}

export function isTplTagOrComponent(
  tplNode: any
): tplNode is TplTag | TplComponent {
  return isTplTag(tplNode) || isTplComponent(tplNode);
}

export function isTplVariantable(tplNode: any): tplNode is TplNode {
  return isTplTagOrComponent(tplNode) || isTplSlot(tplNode);
}

export function canToggleVisibility(tplNode: any): tplNode is TplNode {
  return isTplVariantable(tplNode) && !hasTextAncestor(tplNode);
}

export type TplNamable = TplTag | TplComponent;
export function isTplNamable(tplNode: any): tplNode is TplTag | TplComponent {
  return isTplTag(tplNode) || isTplComponent(tplNode);
}

export function isTplNodeNamable(
  tplNode: TplNode
): tplNode is TplTag | TplComponent | TplSlot {
  return (
    (isTplTag(tplNode) && !isCodeComponentRoot(tplNode)) ||
    isTplComponent(tplNode) ||
    (isTplSlot(tplNode) && !isCodeComponentSlot(tplNode))
  );
}

export interface TplTextTag extends TplTag {
  type: "text";
  columnsSetting: never;
}

export interface TplImageTag extends TplTag {
  type: "image";
  children: never;
  columnsSetting: never;
}

export interface TplIconTag extends TplImageTag {
  tag: "svg";
}

export interface TplPictureTag extends TplImageTag {
  tag: "img";
}

export interface TplColumnsTag extends TplTag {
  type: TplTagType.Columns;
}

export interface TplColumnTag extends TplTag {
  type: TplTagType.Column;
}

/** I believe this means it's an actual container. */
export interface TplContainerTag extends TplTag {
  type: "other";
  columnsSetting: never;
}

// Constant factor used to store aspect ratio of images as an integer.
// We store Math.round(ASPECT_RATIO_SCALE_FACTOR * aspectRatio) in the model.
export const ASPECT_RATIO_SCALE_FACTOR = 1000000;

/**
 * Returns true if the argument `tplNode` is a `TplTag` of `text` type.
 */
export function isTplTextBlock(
  tplNode: any,
  tag?: string
): tplNode is TplTextTag {
  if (!isTplTag(tplNode)) {
    return false;
  }
  return (!tag || tplNode.tag === tag) && tplNode.type === TplTagType.Text;
}

export function hasTextAncestor(tplNode: TplNode): boolean {
  return ancestorsUp(tplNode, true).some(
    (t) => isKnownTplTag(t) && t.type === TplTagType.Text
  );
}

export function isTplRawString(tplNode: any): tplNode is TplTextTag {
  return (
    isTplTag(tplNode) &&
    tplNode.type === TplTagType.Text &&
    tplNode.codeGenType === TplTagCodeGenType.NoTag
  );
}

export function isTplImage(tplNode: TplNode): tplNode is TplImageTag {
  if (!isTplTag(tplNode)) {
    return false;
  }
  return tplNode.type === TplTagType.Image;
}

export function isTplIcon(tpl: TplNode): tpl is TplIconTag {
  return isTplImage(tpl) && tpl.tag === "svg";
}

export function isTplPicture(tpl: TplNode): tpl is TplPictureTag {
  return isTplImage(tpl) && tpl.tag === "img";
}

export function isTplOther(tplNode: TplNode): tplNode is TplContainerTag {
  if (!isTplTag(tplNode)) {
    return false;
  }
  return tplNode.type === TplTagType.Other;
}

export function isTplColumns(tplNode: TplNode): tplNode is TplColumnsTag {
  if (!isTplTag(tplNode)) {
    return false;
  }
  return tplNode.type === TplTagType.Columns;
}

export function isTplColumn(tplNode: TplNode): tplNode is TplColumnTag {
  if (!isTplTag(tplNode)) {
    return false;
  }
  return tplNode.type === TplTagType.Column;
}

export function isTplInput(
  tpl: TplNode
): tpl is TplTag & { tag: "input" | "textarea" } {
  return isTplTag(tpl) && (tpl.tag === "input" || tpl.tag === "textarea");
}

export function isTplContainer(tplNode: TplNode): tplNode is TplContainerTag {
  return isTplOther(tplNode) && !isAtomicTag(tplNode.tag);
}

export type TplReated = TplNode;
export function isTplRepeated(tpl: TplNode): tpl is TplNode {
  return (
    isTplVariantable(tpl) &&
    !!tpl.vsettings.find((vs) => isBaseVariant(vs.variants))?.dataRep
  );
}

export function tryGetVariantSettingStoringText(
  tplNode: TplTag,
  viewCtx: ViewCtx
) {
  return viewCtx.variantTplMgr().tryGetTargetVariantSetting(tplNode);
}

/**
 * If argument `tplNode` isTplTextBlock(), then returns the text content of its
 * TplText child.  Else returns undefined.
 */
export function getTplTextBlockContent(tplNode: TplNode, viewCtx: ViewCtx) {
  if (isTplTextBlock(tplNode)) {
    const vs = viewCtx.effectiveCurrentVariantSetting(tplNode);
    return vs.text ? getRichTextContent(vs.text) : undefined;
  }
  return undefined;
}

export function findFirstTextBlockInBaseVariant(tpl: TplNode) {
  if (isTplTextBlock(tpl)) {
    const baseVs = ensureBaseVariantSetting(tpl);
    return baseVs.text ? getRichTextContent(baseVs.text) : undefined;
  }
  for (const currTpl of flattenTpls(tpl).slice(1)) {
    const maybeText = findFirstTextBlockInBaseVariant(currTpl);
    if (maybeText) {
      return maybeText;
    }
  }
  return undefined;
}

export function getRichTextContent(text: RichText) {
  if (isKnownRawText(text)) {
    return text.text;
  }
  if (isKnownExprText(text)) {
    assert(
      isKnownCustomCode(text.expr) || isKnownObjectPath(text.expr),
      "Text expression is not CustomCode nor ObjectPath"
    );
    return isKnownCustomCode(text.expr)
      ? text.expr.code
      : pathToString(text.expr.path);
  }
  return undefined;
}

/**
 * Builds a Map from Param to owning Component
 */
export function buildParamToComponent(components: Component[]) {
  const map = new Map<Param, Component>();
  for (const component of components) {
    for (const param of component.params) {
      map.set(param, component);
    }
  }
  return map;
}

// This map keeps weak references from TplNode to the Component it belongs to.
// This Map is updated in three places:
// 1. Upon unbundling, we record the root of each Component in the unbundled site
// 2. Upon creating a new Component
// 3. Upon TplQuery operations
const TPLROOT_TO_COMPONENT = new WeakMap<TplNode, Component>();
export function getTplOwnerComponent(tpl: TplNode) {
  return ensure(
    tryGetTplOwnerComponent(tpl),
    `Tpl ${tpl.uuid} must have owner component`
  );
}

export function tryGetTplOwnerComponent(tpl: TplNode) {
  return TPLROOT_TO_COMPONENT.get(ensureKnownTplNode($$$(tpl).root().one()));
}

export function trackComponentRoot(component: Component) {
  TPLROOT_TO_COMPONENT.set(component.tplTree, component);
}

const COMPONENT_TO_SITE = new WeakMap<Component, Site>();
export function getOwnerSite(comp: Component) {
  return ensure(
    tryGetOwnerSite(comp),
    `Component ${comp.name} must have owner site`
  );
}

export function tryGetOwnerSite(comp: Component) {
  return COMPONENT_TO_SITE.get(comp);
}

export function trackComponentSite(comp: Component, site: Site) {
  COMPONENT_TO_SITE.set(comp, site);
}

export function deepTrackComponents(site: Site) {
  for (const component of site.components) {
    trackComponentRoot(component);
    trackComponentSite(component, site);
  }

  // Also do the same for any imported projects
  for (const dep of site.projectDependencies) {
    deepTrackComponents(dep.site);
  }
}

/**
 * Whether the first depends on the second, directly or indirectly.
 */
export function getDeepDependents(source: Component): Set<Component> {
  // // If these are part of a Site (vs. a package), they better belong to the same Site.
  // check(
  //   !getOwnerSite(dependent) ||
  //   !getOwnerSite(source) ||
  //   getOwnerSite(dependent) === getOwnerSite(source)
  // );
  // const site = ensure(getOwnerSite(dependent) || getOwnerSite(source));
  const site = tryGetOwnerSite(source);
  if (!site) {
    return new Set();
  }
  const tplMgr = new TplMgr({ site });
  const allTplComps = tplMgr.filterAllNodes(isTplComponent);
  // Crawl the DAG of dependencies starting from source in BFS order.
  let compsToVisit = [source];
  let compsEverQueued = new Set([source]);
  while (compsToVisit.length > 0) {
    // Find all the TplComponents of curComp, and see which components they belong to.
    const curComp = ensure(compsToVisit.shift(), "Length checked before");
    const newComps = L.uniq(
      allTplComps
        .filter((tpl) => tpl.component === curComp)
        .map((tpl) => $$$(tpl).tryGetOwningComponent())
        .filter(notNil)
        .filter((comp) => !compsEverQueued.has(comp))
    );
    compsToVisit = [...compsToVisit, ...newComps];
    compsEverQueued = new Set([...compsEverQueued, ...newComps]);
  }
  return compsEverQueued;
}

/**
 * Returns all instances of TplComponent for the argument component
 */
export function getTplComponentsInSite(site: Site, component: Component) {
  const instances: TplComponent[] = [];
  for (const comp of site.components) {
    for (const node of flattenTpls(comp.tplTree)) {
      if (isTplComponent(node) && node.component === component) {
        instances.push(node);
      }
    }
  }
  for (const node of site.globalContexts) {
    if (node.component === component) {
      instances.push(node);
    }
  }
  return instances;
}

export function canConvertToSlot(tpl: TplNode): tpl is TplTag | TplComponent {
  return (
    (isTplTag(tpl) || isTplComponent(tpl)) &&
    !isTplColumn(tpl) &&
    !hasTextAncestor(tpl)
  );
}

/**
 * Returns true if it's appropriate for the argument text node to convert its
 * "inner" text to a slot, rather than the whole thing; this means creating
 * a new container node that contains a TplSlot that contains a plain text node.
 * To qualify, `tpl` should be a text block that either is not a `div`, or
 * is a `div` containing non-typography css.
 */
export function canConvertInnerTextToSlot(tpl: TplNode): tpl is TplTextTag {
  return (
    isTplTextBlock(tpl) &&
    !isAtomicTag(tpl.tag) &&
    (tpl.tag !== "div" ||
      !hasOnlyStyles(tpl, typographyCssProps, {
        excludeProps: ignoredConvertablePlainTextProps,
      }))
  );
}

export function hasNoRichTextStyles(tpl: TplTextTag) {
  return tpl.vsettings.every(
    (vs) =>
      !isKnownRawText(vs.text) ||
      vs.text.markers.every(
        (m) =>
          isKnownStyleMarker(m) &&
          rulesetHasOnlyStyles(m.rs, [], {
            includeValuesThatEqualInitial: true,
          })
      )
  );
}

export function hasNoEventHandlers(tpl: TplNode) {
  return tpl.vsettings.every((vs) =>
    [...Object.values(vs.attrs), ...vs.args.map((arg) => arg.expr)].every(
      (expr) =>
        flattenExprs(expr).every(
          (innerExpr) =>
            !isKnownEventHandler(innerExpr) ||
            innerExpr.interactions.length === 0
        )
    )
  );
}

export function hasEventHandlers(tpl: TplNode) {
  return !hasNoEventHandlers(tpl);
}

export function hasNoExistingStyles(
  tpl: TplNode,
  opts: {
    excludeProps?: string[];
    includeValuesThatEqualInitial?: boolean;
  } = {}
) {
  return hasOnlyStyles(tpl, [], opts);
}

export function hasOnlyStyles(
  tpl: TplNode,
  props: string[],
  opts: {
    excludeProps?: string[];
    includeValuesThatEqualInitial?: boolean;
  } = {}
) {
  const subopts = {
    ...opts,
    tag: isTplTag(tpl) ? tpl.tag : undefined,
  };
  return tpl.vsettings.every((vs) =>
    rulesetHasOnlyStyles(vs.rs, props, subopts)
  );
}

/**
 * Returns true if the argument RuleSet has values _only_ for the argument `props`
 * and nothing else.
 * @param opts.excludeProps exclude these props from consideration
 * @param opts.includeValuesThatEqualInitial by default, values that are set to
 *   getCssInitial() count as "not set".  If you want to count them as set, set
 *   this to true
 */
function rulesetHasOnlyStyles(
  rs: RuleSet,
  props: string[],
  opts: {
    excludeProps?: string[];
    tag?: string;
    includeValuesThatEqualInitial?: boolean;
  } = {}
) {
  if (rs.mixins.length > 0) {
    return false;
  }
  for (const rule of Object.keys(rs.values)) {
    if (!opts.excludeProps || !opts.excludeProps.includes(rule)) {
      if (!props.includes(rule)) {
        // Uh oh, this prop is not allowed!
        const val = rs.values[rule];
        if (
          opts.includeValuesThatEqualInitial ||
          val !== getCssInitial(rule, opts.tag)
        ) {
          // if val is initial, then we don't count this value as set, unless
          // opts.includeValuesThatEqualInitial is set
          return false;
        }
      }
    }
  }
  return true;
}

export function detectComponentCycle(
  destOwner: Component,
  newItems: TplNode[]
) {
  if (newItems.length === 0) {
    // Early exit if no newItems to check against
    return false;
  }
  const deepDependents = getDeepDependents(destOwner);
  const hasComponentCycle = newItems
    .flatMap(flattenTpls)
    .filter(isTplComponent)
    .some((tplComp) => deepDependents.has(tplComp.component));
  return hasComponentCycle;
}

export function isSizable(tpl: TplNode) {
  if (isTplSlot(tpl)) {
    return false;
  }

  return true;
}

export function isComponentRoot(tpl: TplNode) {
  // tpl is a component root if it has no parent and we've tracked
  // it as a root.  It's not enough to just check tpl.parent, because
  // ArenaFrame.container are also TplComponents without parents, but
  // are not considered component roots.
  return !tpl.parent && TPLROOT_TO_COMPONENT.has(tpl);
}

export function getComponentIfRoot(tpl: TplNode) {
  return tpl.parent ? undefined : TPLROOT_TO_COMPONENT.get(tpl);
}

export function isTplFromComponent(tpl: TplNode, component: Component) {
  return isTplComponent(tpl) && tpl.component === component;
}

export function isCodeComponentRoot(tpl: TplNode) {
  const component = getComponentIfRoot(tpl);
  return !!component && isCodeComponent(component);
}

export function deriveDataCond(dataCond?: DeepReadonly<Expr> | null) {
  if (dataCond) {
    const val = Exprs.tryExtractLit(dataCond);
    if (val === false) {
      return "hidden";
    }
  }
  return "visible";
}

function markerPointsToTpl(marker: Marker, tpl: TplNode) {
  return isKnownNodeMarker(marker) && marker.tpl === tpl;
}

/**
 * Removes markers in text pointing to tpl, fixing text and marker positions.
 */
export function removeMarkersToTpl(text: RawText, tpl: TplNode) {
  const sortedMarkers = L.sortBy(text.markers, (m) => m.position);
  let delta = 0;
  for (const marker of sortedMarkers) {
    marker.position -= delta;
    if (markerPointsToTpl(marker, tpl)) {
      // Remove substring in [m.position, m.position + m.length) from text.
      const ar = text.text.split("");
      ar.splice(marker.position, marker.length);
      text.text = ar.join("");
      delta += marker.length;
    }
  }
  text.markers = text.markers.filter((m) => !markerPointsToTpl(m, tpl));
}

export function duplicateMarkerTpl(text: RawText, tpl: TplNode) {
  assert(
    isTplTag(tpl),
    "We only support NodeMarkers with TplTags at the moment"
  );
  assert(isTplTextBlock(tpl.parent), "Must be inside a text block");
  const sortedMarkers = L.sortBy(text.markers, (m) => m.position);
  assert(
    sortedMarkers.find((m) => markerPointsToTpl(m, tpl)),
    "Must have marker for tpl"
  );
  const newTpl = clone(tpl);
  newTpl.parent = tpl.parent;
  let delta = 0;
  for (const marker of sortedMarkers) {
    marker.position += delta;
    if (markerPointsToTpl(marker, tpl)) {
      // If we're duplicating a block TplTag, we need to add a "\n"
      // between the existing and the new tpl.
      const blockLineBreak = isTagInline(tpl.tag) ? "" : "\n";

      // Add marker.
      const newMarker = new NodeMarker({
        position: marker.position + marker.length + blockLineBreak.length,
        length: marker.length,
        tpl: newTpl,
      });
      text.markers.push(newMarker);

      // Fix text.
      const start = text.text.slice(0, marker.position);
      const markerText = text.text.slice(
        marker.position,
        marker.position + marker.length
      );
      const end = text.text.slice(marker.position + marker.length);
      text.text = start + markerText + blockLineBreak + markerText + end;
      delta += marker.length + blockLineBreak.length;
    }
  }
  fixTextChildren(tpl.parent);
  return newTpl;
}

export type ExprReference = {
  node?: TplNode;
  expr: Expr;
};

export function listHostLessComponentsInTplTree(tplTree: TplNode) {
  const hostLessComponents: string[] = [];
  walkTpls(tplTree, {
    pre: (tpl) => {
      if (isTplComponent(tpl) && isHostLessCodeComponent(tpl.component)) {
        hostLessComponents.push(tpl.component.name);
      }
      return true;
    },
  });
  return uniq(hostLessComponents);
}

export function pushExprs(exprs: Expr[], expr: Expr | null | undefined) {
  if (!expr) {
    return;
  }

  exprs.push(expr);

  if (isKnownCustomCode(expr) || isKnownObjectPath(expr)) {
    pushExprs(exprs, expr.fallback);
  } else if (isKnownEventHandler(expr)) {
    for (const interaction of expr.interactions) {
      exprs.push(...findExprsInInteraction(interaction));
    }
  } else if (isKnownPageHref(expr)) {
    for (const arg of Object.values(expr.params)) {
      pushExprs(exprs, arg);
    }
  } else if (isKnownCollectionExpr(expr)) {
    for (const _expr of expr.exprs) {
      pushExprs(exprs, _expr);
    }
  } else if (isKnownFunctionArg(expr)) {
    pushExprs(exprs, expr.expr);
  } else if (isKnownTemplatedString(expr)) {
    for (const subText of expr.text) {
      if (isKnownExpr(subText)) {
        pushExprs(exprs, subText);
      }
    }
  } else if (isKnownFunctionExpr(expr)) {
    pushExprs(exprs, expr.bodyExpr);
  } else if (isKnownDataSourceOpExpr(expr)) {
    pushExprs(exprs, expr.queryInvalidation);
    for (const template of Object.values(expr.templates)) {
      if (isKnownExpr(template.value)) {
        pushExprs(exprs, template.value);
      }
      if (template.bindings) {
        for (const binding of Object.values(template.bindings)) {
          pushExprs(exprs, binding);
        }
      }
    }
  } else if (isKnownQueryInvalidationExpr(expr)) {
    pushExprs(exprs, expr.invalidationKeys);
  } else if (isKnownCompositeExpr(expr)) {
    Object.values(expr.substitutions).forEach((subExpr) =>
      pushExprs(exprs, subExpr)
    );
  }
}

export function flattenExprs(expr: Expr) {
  const exprs: Expr[] = [];
  pushExprs(exprs, expr);
  return exprs;
}

/**
 * Finds all occurrences of exprs in given interaction.
 */
export function findExprsInInteraction(interaction: Interaction) {
  const exprs: Expr[] = [];
  pushExprs(exprs, interaction.condExpr);
  for (const arg of interaction.args) {
    pushExprs(exprs, arg.expr);
  }
  return exprs;
}

/**
 * Finds all occurrences of exprs in given node variant settings
 * args, attrs, texts, dataCond, dataRep, interactions.
 */
export function findExprsInNode(node: TplNode): ExprReference[] {
  const exprs: Expr[] = [];

  for (const vs of node.vsettings) {
    for (const arg of vs.args) {
      pushExprs(exprs, arg.expr);
    }

    for (const expr of Object.values(vs.attrs)) {
      pushExprs(exprs, expr);
    }

    if (isKnownExprText(vs.text)) {
      pushExprs(exprs, vs.text.expr);
    }

    pushExprs(exprs, vs.dataCond);

    pushExprs(exprs, vs.dataRep?.collection);
  }

  return exprs.map((expr) => ({ expr, node }));
}

/**
 * Returns expressions in `tree - excludeTree` (set difference of nodes
 * in `tree` and nodes in `excludeTree`).
 */
export function findExprsInTree(tree: TplNode, excludeTrees?: TplNode[]) {
  const tpls = flattenTplsExcludingSubTrees(tree, excludeTrees);
  return tpls.flatMap((node) => [...findExprsInNode(node)]);
}

/**
 * Returns expressions in the component (including param default expressions,
 * presets and tpl tree).
 */
export function findExprsInComponent(component: Component) {
  const componentExprs: Expr[] = [];

  for (const param of component.params) {
    if (param.defaultExpr) {
      pushExprs(componentExprs, param.defaultExpr);
    }
    if (param.previewExpr) {
      pushExprs(componentExprs, param.previewExpr);
    }
  }

  for (const query of component.dataQueries) {
    if (query.op) {
      pushExprs(componentExprs, query.op);
    }
  }

  const refs: ExprReference[] = componentExprs.map((expr) => ({
    expr,
  }));
  refs.push(...findExprsInTree(component.tplTree));

  return refs;
}

/**
 * Iterates through tpl tree rooted on `root` and adds fallbacks to
 * custom code expressions that uses `$ctx`
 *
 * Example:
 *  {
 *   code: (new Date($ctx.cms_row.date).getMonth())
 *   fallback: undefined
 *  }
 *
 * ... is transformed in:
 *
 *  {
 *   code: (new Date($ctx.cms_row.date).getMonth())
 *   fallback: 4
 *  }
 */
export function addFallbacksToCodeExpressions(
  getCanvasEnvForTpl: (node: TplNode) => CanvasEnv | undefined,
  newToOldTpl: <T extends TplNode>(t: T) => T,
  root: TplTag | TplComponent
) {
  flattenTpls(root).forEach((node) => {
    for (const { expr } of findExprsInNode(node)) {
      if (
        (isKnownCustomCode(expr) && isRealCodeExpr(expr)) ||
        isKnownObjectPath(expr)
      ) {
        if (expr.fallback !== undefined) {
          continue;
        }
        const info = parseExpr(expr);
        if (!info.usesDollarVars.$ctx) {
          continue;
        }

        const oldTpl = newToOldTpl(node);
        const canvasEnv = getCanvasEnvForTpl(oldTpl);
        if (!canvasEnv) {
          continue;
        }

        const evaluatedExpr = evalCodeWithEnv(
          isKnownCustomCode(expr) ? expr.code : pathToString(expr.path),
          canvasEnv
        );
        expr.fallback = Exprs.codeLit(evaluatedExpr);
      }
    }
  });
}

export function fixTplRefEpxrs(
  newTpls: TplNode[],
  oldTpls: TplNode[],
  errorFn?: (referencedTpl: TplNode) => void
) {
  const tplRefs = newTpls.flatMap((t) =>
    findExprsInNode(t).filter((ref) => isKnownTplRef(ref.expr))
  );
  if (tplRefs.length > 0) {
    const oldToNewTpls = new Map(strictZip(oldTpls, newTpls));
    for (const tplRef of tplRefs) {
      const expr = tplRef.expr;
      assert(isKnownTplRef(expr), "Fix only appliable to TplRefs");
      if (!oldToNewTpls.get(expr.tpl) && errorFn) {
        errorFn?.(expr.tpl);
        return;
      }
      expr.tpl = ensure(
        oldToNewTpls.get(expr.tpl),
        "Should only allow extracting if tplRefs are included"
      );
    }
  }
}

export function hasChildrenSlot(tpl: TplComponent) {
  return tpl.component.params.some((p) => p.variable.name === "children");
}

export function areSiblings(tpls: TplNode[]) {
  if (tpls.length === 0) {
    return true;
  }
  const parent = tpls[0].parent;
  return tpls.every((tpl) => tpl.parent === parent);
}

export function sortByTreeOrder<T extends TplNode>(tpls: T[]): T[] {
  if (tpls.length < 1) {
    return [];
  }

  const tplRoot = ancestors(tpls[0])[0];
  const flattenedTpls = flattenTpls(tplRoot);
  const tplToIndex = new Map<TplNode, number>();
  for (let i = 0; i < flattenedTpls.length; i++) {
    tplToIndex.set(flattenedTpls[i], i);
  }

  return L.sortBy(tpls, (tpl) => {
    assert(
      tplToIndex.has(tpl),
      "sortByTreeOrder requires nodes to be in the same tree"
    );
    return tplToIndex.get(tpl);
  });
}

export function prepareFocusedTpls<T extends TplNode>(
  tpls: (T | SlotSelection | null)[],
  opts?: { allowNodesWithAncestors: boolean }
): T[] {
  const filtered = tpls.filter((cur) => {
    if (!cur) {
      return false;
    }

    if (cur instanceof SlotSelection) {
      return false;
    }

    if (!opts?.allowNodesWithAncestors) {
      const curAncestors = ancestorsUpWithSlotSelections(cur).slice(1);
      for (const tpl of tpls) {
        for (const anc of curAncestors) {
          if (tpl === anc) {
            return false;
          }
        }
      }
    }

    return true;
  }) as T[];

  return sortByTreeOrder(filtered);
}

export interface KeyedEventHandler {
  key: EventHandlerKeyType;
  handler: EventHandler | undefined | null;
}

export interface ParamEventHandler {
  param: Param;
}

export interface AttrEventHandler {
  attr: string;
}

export interface GenericEventHandler {
  funcType: FunctionType;
}

export type EventHandlerKeyType =
  | ParamEventHandler
  | AttrEventHandler
  | GenericEventHandler;

export const isEventHandlerKeyForAttr = (
  eventHandlerKey: EventHandlerKeyType
): eventHandlerKey is AttrEventHandler => "attr" in eventHandlerKey;

export const isEventHandlerKeyForParam = (
  eventHandlerKey: EventHandlerKeyType
): eventHandlerKey is ParamEventHandler => "param" in eventHandlerKey;

export const isEventHandlerKeyForFuncType = (
  eventHandlerKey: EventHandlerKeyType
): eventHandlerKey is GenericEventHandler => "funcType" in eventHandlerKey;

export function getDisplayNameOfEventHandlerKey(
  eventHandlerKey: EventHandlerKeyType,
  ctx: { component: Component } | { tpl: TplNode }
): string {
  if (isEventHandlerKeyForAttr(eventHandlerKey)) {
    return smartHumanize(eventHandlerKey.attr);
  } else if (isEventHandlerKeyForParam(eventHandlerKey)) {
    const component =
      "component" in ctx
        ? ctx.component
        : isTplComponent(ctx.tpl)
        ? ctx.tpl.component
        : undefined;
    return getParamDisplayName(
      ensure(component, "event handler key must be for a component param"),
      eventHandlerKey.param
    );
  } else {
    unexpected();
  }
}

export function getNameOfEventHandlerKey(
  eventHandlerKey: EventHandlerKeyType
): string {
  if (isEventHandlerKeyForAttr(eventHandlerKey)) {
    return eventHandlerKey.attr;
  } else if (isEventHandlerKeyForParam(eventHandlerKey)) {
    return eventHandlerKey.param.variable.name;
  } else {
    throw new Error("Unknown event handler key type");
  }
}

export function isAttrEventHandler(attr: string) {
  return attr.startsWith("on");
}

function derefEventHandlerValue(
  component: Component,
  expr: EventHandler | VarRef | CustomCode | ObjectPath
) {
  if (!isKnownVarRef(expr)) {
    return expr;
  }
  const param = Exprs.extractReferencedParam(component, expr);
  assert(
    param &&
      (isKnownEventHandler(param.defaultExpr) ||
        isRealCodeExpr(param.defaultExpr) ||
        param.defaultExpr == null),
    "only eventHandler expr is supported for functionType param"
  );
  return param?.defaultExpr ?? undefined;
}

export function getEventHandlerByEventKey(
  component: Component,
  tpl: TplNode,
  key: EventHandlerKeyType
) {
  const baseVs = ensureBaseVariantSetting(tpl);
  const expr = isEventHandlerKeyForAttr(key)
    ? baseVs.attrs[key.attr]
    : isEventHandlerKeyForParam(key)
    ? baseVs.args.find((arg) => arg.param === key.param)?.expr
    : unexpected();
  if (!expr) {
    return undefined;
  }
  assert(
    isKnownEventHandler(expr) ||
      isKnownVarRef(expr) ||
      isRealCodeExprEnsuringType(expr),
    "only eventHandler and varRefs are supported for interactions"
  );
  return expr;
}

export function setEventHandlerByEventKey(
  tpl: TplNode,
  key: EventHandlerKeyType,
  expr: Expr
) {
  const baseVs = ensureBaseVariantSetting(tpl);
  if (isEventHandlerKeyForAttr(key)) {
    baseVs.attrs[key.attr] = expr;
  } else if (isEventHandlerKeyForParam(key)) {
    const arg = baseVs.args.find((iarg) => iarg.param === key.param);
    if (arg) {
      arg.expr = expr;
    } else {
      [
        baseVs.args.push(
          new Arg({
            param: key.param,
            expr,
          })
        ),
      ];
    }
  } else {
    unexpected();
  }
}

const ALWAYS_VISIBLE_EVENT_HANDLERS = {
  button: ["onClick"],
  input: ["onChange"],
  "text-input": ["onChange"],
  select: ["onChange"],
  a: ["onClick"],
};

export function getAllEventHandlerOptions(tpl: TplTag | TplComponent) {
  let options: EventHandlerKeyType[] = [];
  if (isTplComponent(tpl)) {
    options = uniqBy(
      [
        ...withoutNils(
          tpl.component.params
            .filter((param) => isKnownFunctionType(param.type))
            .filter((param) => {
              // Hide params for event handlers corresponding to
              // exposed implicit states that are not made public
              const maybeState = findStateForOnChangeParam(
                tpl.component,
                param
              );
              if (maybeState && maybeState.accessType === "private") {
                return false;
              }
              return true;
            })
            .map((param) => ({ param }))
        ),
        ...(
          (isPlumeComponent(tpl.component) &&
            getPlumeEditorPlugin(tpl.component)?.getEventHandlers?.()) ||
          []
        ).map((attr) => ({ attr })),
      ],
      (eventHandlerKey) =>
        getDisplayNameOfEventHandlerKey(eventHandlerKey, { tpl })
    );
  } else if (tpl.typeTag === "TplTag") {
    options = [
      { attr: "onClick" },
      ...metaSvc
        .eventHandlersForTag(tpl.tag)
        .map((attr) => ({ attr }))
        .filter(({ attr }) => attr !== "onClick"),
    ];
  }
  return options;
}

export function getAlwaysVisibleEventHandlerKeysForTpl(
  tpl: TplTag | TplComponent
) {
  if (isTplTag(tpl)) {
    return (
      ALWAYS_VISIBLE_EVENT_HANDLERS[
        tpl.tag as keyof typeof ALWAYS_VISIBLE_EVENT_HANDLERS
      ] ?? []
    ).map((attr) => ({ eventHandlerKey: { attr }, expr: undefined }));
  } else if (isPlumeComponent(tpl.component)) {
    return withoutNils(
      ALWAYS_VISIBLE_EVENT_HANDLERS[
        tpl.component.plumeInfo
          .type as keyof typeof ALWAYS_VISIBLE_EVENT_HANDLERS
      ]?.map((event) => {
        const param = tpl.component.params.find(
          (p) => p.variable.name === event
        );
        if (param) {
          // user may have deleted the event handler params
          return { eventHandlerKey: { param }, expr: undefined };
        } else {
          return { eventHandlerKey: { attr: event }, expr: undefined };
        }
      }) ?? []
    );
  } else {
    return withoutNils(
      tpl.component.params
        .filter((param) => {
          if (
            !isKnownFunctionType(param.type) ||
            isOnChangeParam(param, tpl.component)
          ) {
            return false;
          }
          if (!isTplCodeComponent(tpl)) {
            return true;
          }
          const propType = tpl.component._meta?.props[param.variable.name];
          return !isAdvancedProp(propType);
        })
        .map((param) => ({ eventHandlerKey: { param }, expr: undefined }))
    );
  }
}

export function getAllEventHandlersOfAttrType(
  component: Component,
  tpl: TplNode
) {
  const baseVs = ensureBaseVariantSetting(tpl);
  return Object.entries(baseVs.attrs)
    .filter(
      ([attr, expr]) => isKnownEventHandler(expr) || attr.startsWith("on")
    )
    .map(([attr, expr]) => {
      assert(
        isKnownEventHandler(expr) ||
          isKnownVarRef(expr) ||
          isRealCodeExprEnsuringType(expr),
        "unexpected expr type for event handler"
      );
      return {
        eventName: attr,
        varName: toVarName(attr),
        expr,
        eventHandlerKey: { attr },
      };
    });
}

export function getAllEventHandlersOfParamType(
  component: Component,
  tpl: TplNode
) {
  const baseVs = ensureBaseVariantSetting(tpl);
  return baseVs.args
    .filter((arg) => isKnownFunctionType(arg.param.type))
    .map((arg) => {
      assert(
        isKnownEventHandler(arg.expr) ||
          isKnownVarRef(arg.expr) ||
          isRealCodeExprEnsuringType(arg.expr),
        "unexpected expr type for event handler"
      );
      return {
        eventName: arg.param.variable.name,
        varName: toVarName(arg.param.variable.name),
        expr: arg.expr,
        eventHandlerKey: { param: arg.param },
      };
    });
}

export function getAllEventHandlersOfFuncType(
  component: Component,
  tpl: TplComponent
) {
  const eventHandlers: {
    eventName: string;
    varName: string;
    expr: EventHandler;
    eventHandlerKey: EventHandlerKeyType;
  }[] = [];

  for (const vs of tpl.vsettings) {
    for (const arg of vs.args) {
      for (const expr of flattenExprs(arg.expr)) {
        if (!isKnownGenericEventHandler(expr)) {
          continue;
        }
        eventHandlers.push({
          eventName: arg.param.variable.name,
          varName: toVarName(arg.param.variable.name),
          expr,
          eventHandlerKey: { funcType: expr.handlerType },
        });
      }
    }
  }
  return eventHandlers;
}

export function getAllEventHandlersForTpl(
  component: Component,
  tpl: TplNode,
  opts?: { omitFuncTypeEventHandlers?: boolean }
) {
  return [
    ...getAllEventHandlersOfAttrType(component, tpl),
    ...getAllEventHandlersOfParamType(component, tpl),
    ...(!opts?.omitFuncTypeEventHandlers && isTplCodeComponent(tpl)
      ? getAllEventHandlersOfFuncType(component, tpl)
      : []),
    ...(isTplComponent(tpl) ? tpl.component.params : [])
      .filter((param) => isKnownFunctionType(param.type) && !!param.defaultExpr)
      .map((param) => {
        const expr = param.defaultExpr;
        assert(
          isKnownEventHandler(expr) ||
            isKnownVarRef(expr) ||
            isRealCodeExprEnsuringType(expr),
          "unexpected expr type for event handler"
        );
        return {
          eventName: param.variable.name,
          varName: toVarName(param.variable.name),
          expr,
          eventHandlerKey: { param },
        };
      }),
  ];
}

// Find recursively the root tag for a component.
// For code-component, we always add a fake "div" as a root.
// TODO: If we want to attach event handlers to all tpl components we should
// traverse the code-component react tree to find the root tag.
export function getTplTagRoot(tplRoot: TplComponent): TplTag | undefined {
  const findRoot = (root: TplNode): TplTag | undefined => {
    return switchType(root)
      .when(TplTag, (tpl) => tpl)
      .when(TplComponent, (tpl) => {
        if (isCodeComponent(tpl.component)) {
          return undefined;
        } else {
          return findRoot(tpl.component.tplTree);
        }
      })
      .when(TplSlot, (_tpl) => unexpected("TplSlot cannot be a root"))
      .result();
  };
  return findRoot(tplRoot);
}

export function getReactEventHandlerTsType(
  tpl: TplComponent | TplTag,
  eventHandler: string
) {
  let tag = isTplTag(tpl)
    ? tpl.tag
    : isPlumeComponent(tpl.component)
    ? ensure(
        getPlumeCodegenPlugin(tpl.component),
        `didn't find a plume plugin for ${tpl.component.name}`
      ).tagToAttachEventHandlers ?? "div"
    : getTplTagRoot(tpl)?.tag;

  if (!tag) {
    tag = "div";
  }

  return `Parameters<Exclude<React.${TAG_TO_HTML_ATTRIBUTES[tag]}<${TAG_TO_HTML_INTERFACE[tag]}>["${eventHandler}"], undefined>>[0];`;
}

const ELEMENT_TAGS_WITH_REF = ["button", "input", "select", "textarea"];
export function tplHasRef(tpl: TplNode) {
  if (!isTplNamable(tpl) || !tpl.name || tpl.name === "") {
    return false;
  }
  if (ancestorsUp(tpl, true).some((node) => isKnownTplSlot(node))) {
    return false;
  }
  if (isDescendantOfVirtualRenderExpr(tpl)) {
    return false;
  }
  if (isKnownTplTag(tpl)) {
    return ELEMENT_TAGS_WITH_REF.includes(tpl.tag);
  } else if (isKnownTplComponent(tpl) && isCodeComponent(tpl.component)) {
    return !!tpl.component.codeComponentMeta.hasRef;
  } else {
    return false;
  }
}

export function getIdNameOfEventHandlerKey(opt: EventHandlerKeyType) {
  return isEventHandlerKeyForAttr(opt)
    ? opt.attr
    : isEventHandlerKeyForParam(opt)
    ? opt.param.variable.name
    : unexpected();
}

export function findAllInstancesOfComponent(site: Site, component: Component) {
  const usages = extractComponentUsages(site, component);
  return [
    ...usages.components,
    ...usages.frames.map((f) => f.container.component),
  ].flatMap((referencedComponent) =>
    flattenTpls(referencedComponent.tplTree)
      .filter((tpl) => isTplComponent(tpl) && tpl.component === component)
      .map((tpl) => ({
        referencedComponent,
        tpl: ensureKnownTplComponent(tpl),
      }))
  );
}

export const getParamVariable = (tpl: TplComponent, name: string) =>
  ensure(
    tpl.component.params.find((p) => p.variable.name === name),
    `component ${tpl.component.name} should have ${name} param`
  ).variable;

export const getTplComponentArgByParamName = (
  tpl: TplComponent,
  paramName: string,
  baseVs?: VariantSetting
) => {
  if (!baseVs) {
    baseVs = ensureBaseVariantSetting(tpl);
  }
  const param = tpl.component.params.find((p) => p.variable.name === paramName);
  if (!param) {
    return undefined;
  }
  const arg = getTplComponentArg(tpl, baseVs, param.variable);
  return arg;
};

/**
 * Flattens TplNodes in the component tree, but filters out nodes that should
 * not be serialized.
 */
export function flattenTplsWithoutThrowawayNodes(component: Component) {
  const result: TplNode[] = [];
  walkTpls(component.tplTree, {
    pre(tpl) {
      if (isThrowawayNode(tpl)) {
        return false;
      }
      result.push(tpl);
      return;
    },
  });
  return result;
}

function isThrowawayNode(node: TplNode) {
  if (isKnownTplSlot(node.parent)) {
    // If this is default content for a TplSlot, we don't need to allow overrides;
    // default content shouldn't really be used as-is.
    return true;
  }

  if (isPlainTextArgNode(node) && !node.name) {
    // Similarly, if this is text argument, then we also don't
    // need to generate styles or overrides... unless it has a name,
    // in which case, maybe the user intended to target it for
    // overrides.
    return true;
  }

  if (isDescendantOfVirtualRenderExpr(node)) {
    // If this node is part of the virtual tree, then it's not actually part of
    // this component and so won't be generated or named.
    return true;
  }
  return false;
}

export function getNumberOfRepeatingAncestors(node: TplNode) {
  return ancestorsUp(node).filter(isTplRepeated).length;
}
