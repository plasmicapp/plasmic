import {
  ensureKnownTplTag,
  ImageAsset,
  RawText,
  Site,
  TplComponent,
  TplNode,
  TplTag,
  VariantsRef,
} from "@/wab/classes";
import { CENTERED_FRAME_PADDING } from "@/wab/client/ClientConstants";
import {
  PasteArgs,
  PasteResult,
  PLASMIC_CLIPBOARD_FORMAT,
} from "@/wab/client/clipboard/common";
import { SiteOps } from "@/wab/client/components/canvas/site-ops";
import { confirm } from "@/wab/client/components/quick-modals";
import { ImageAssetOpts, ResizableImage } from "@/wab/client/dom-utils";
import {
  createImageAssets,
  createNodeAssets,
  renameImageAssets,
  uploadFigmaImages,
  uploadNodeImages,
} from "@/wab/client/figma-importer/assets";
import {
  ComponentPropertiesEntries,
  InstanceNode,
  SceneNode,
} from "@/wab/client/figma-importer/plugin-types";
import {
  filterValidCodeComponentStyles,
  flattenStyles,
  styleForBlendMixin,
  styleForCornerMixin,
  styleForDefaultFrameMixin,
  styleForDefaultShapeMixin,
  styleForLayoutMixin,
  styleForLayoutMixinAndConstraintMixin,
  styleForRectangleCornerMixin,
  styleForTextNode,
} from "@/wab/client/figma-importer/styles";
import {
  FigmaClipboard,
  FigmaData,
  Serializable,
  Style,
} from "@/wab/client/figma-importer/types";
import {
  findMappedComponent,
  getAllSlotsInNode,
  getLayoutParent,
  isFigmaData,
  transformToMatrix,
  wrapInBox,
  wrapTplNodes,
} from "@/wab/client/figma-importer/utils";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  crunch,
  ensure,
  swallow,
  swallowAsync,
  tuple,
  uniqueName,
  withoutNils,
  withoutNilTuples,
} from "@/wab/common";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  ComponentType,
  isContextCodeComponent,
  isReusableComponent,
} from "@/wab/components";
import { parseCssNumericNew } from "@/wab/css";
import { codeLit } from "@/wab/exprs";
import { ImageAssetType } from "@/wab/image-asset-type";
import { mkImageAssetRef } from "@/wab/image-assets";
import { FrameViewMode, isMixedArena } from "@/wab/shared/Arenas";
import { extractUsedFontsFromComponents } from "@/wab/shared/codegen/fonts";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  GlobalVariantFrame,
  RootComponentVariantFrame,
} from "@/wab/shared/component-frame";
import { ARENA_LOWER } from "@/wab/shared/Labels";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { WaitForClipError } from "@/wab/shared/UserError";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import {
  flattenTpls,
  isTplNamable,
  isTplVariantable,
  mkTplComponentX,
  mkTplTagX,
  TplTagType,
  trackComponentRoot,
} from "@/wab/tpls";
import { notification } from "antd";
import { isString } from "lodash";
import React from "react";
import { Matrix } from "transformation-matrix";

export async function pasteFromFigma(
  text: string,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  const figmaData = await studioCtx.app.withSpinner(
    readFigmaClipboard(studioCtx, text)
  );
  if (!figmaData) {
    return {
      handled: false,
    };
  }

  const replaceComponentInstances = !!(await confirm({
    message: (
      <>
        <p>
          Figma components instances can be converted into existing components
          of the same name, in your Plasmic project, including code components.
          If there's no component of the same name, it will be converted into
          basic elements.
        </p>
        <p>Try converting Figma components to Plasmic components?</p>
        <a
          href="https://docs.plasmic.app/learn/importing-from-figma/#converting-component-instances"
          target="_blank"
        >
          Learn more.
        </a>
      </>
    ),
    confirmLabel: "Yes, use existing Plasmic components",
    cancelLabel: "No, use basic elements",
  }));

  const showFigmaError = () => {
    notification.error({
      message: "No Figma layers to paste",
      description:
        "This could happen if (for example) the entire selection was invisible in Figma. If you aren't expecting this behavior, please share the Figma file with team@plasmic.app.",
    });
  };
  const vc = studioCtx.focusedViewCtx();
  if (vc) {
    return {
      handled: true,
      success: unwrap(
        await studioCtx.change(({ success }) => {
          const maybeNode = tplNodeFromFigmaData(
            vc.variantTplMgr(),
            studioCtx.site,
            studioCtx.siteOps(),
            figmaData.nodes,
            figmaData.uploadedImages,
            figmaData.nodeImages,
            figmaData.imagesToRename,
            replaceComponentInstances
          );
          if (maybeNode) {
            const pasteSuccess = vc
              .getViewOps()
              .pasteNode(maybeNode, cursorClientPt, undefined, insertRelLoc);
            if (pasteSuccess) {
              extractUsedFontsFromComponents(studioCtx.site, [
                vc.component,
              ]).forEach((usage) =>
                studioCtx.fontManager.useFont(studioCtx, usage.fontFamily)
              );
              return success(true);
            } else {
              return success(false);
            }
          } else {
            showFigmaError();
            return success(false);
          }
        })
      ),
    };
  } else {
    // No existing artboard, so paste the Figma content as its own artboard
    const arena = studioCtx.currentArena;
    if (!isMixedArena(arena)) {
      notification.error({
        message: `Please select where you want to paste. (If you want to paste multiple Figma artboards, create a ${ARENA_LOWER}.)`,
      });
      return {
        handled: true,
        success: false,
      };
    }

    return {
      handled: true,
      success: unwrap(
        await studioCtx.change(({ success }) => {
          const newComponent = studioCtx
            .tplMgr()
            .addComponent({ type: ComponentType.Frame });
          const newFrame = studioCtx
            .siteOps()
            .createNewFrameForMixedArena(newComponent);
          const tplMgr = studioCtx.tplMgr();
          const vtm = new VariantTplMgr(
            [new RootComponentVariantFrame(newFrame)],
            studioCtx.site,
            studioCtx.tplMgr(),
            new GlobalVariantFrame(studioCtx.site, newFrame)
          );
          const maybeNode = tplNodeFromFigmaData(
            vtm,
            studioCtx.site,
            studioCtx.siteOps(),
            figmaData.nodes,
            figmaData.uploadedImages,
            figmaData.nodeImages,
            figmaData.imagesToRename,
            replaceComponentInstances
          );
          if (!maybeNode) {
            // Paste was unsuccessful, so delete the new frame / component we made :-/
            tplMgr.removeExistingArenaFrame(arena, newFrame, {
              pruneUnnamedComponent: true,
            });
            showFigmaError();
            return success(false);
          }
          newComponent.tplTree = maybeNode;
          trackComponentRoot(newComponent);
          if (isTplVariantable(newComponent.tplTree)) {
            const rsh = RSH(
              vtm.ensureBaseVariantSetting(newComponent.tplTree).rs,
              newComponent.tplTree
            );
            const widthParsed = parseCssNumericNew(rsh.get("width"));
            const heightParsed = parseCssNumericNew(rsh.get("height"));
            if (
              widthParsed &&
              widthParsed.units === "px" &&
              heightParsed &&
              heightParsed.units === "px"
            ) {
              const width = widthParsed.num;
              const height = heightParsed.num;
              const area = width * height;
              if (area >= 400 * 700) {
                // We're just going to guess that a frame of at least iphone size
                // is a "page". We set frame to stretch mode, and set the root
                // element dimensions to stretch instead
                newFrame.width = width;
                newFrame.height = height;
                newFrame.viewMode = FrameViewMode.Stretch;
                rsh.set("width", "stretch");
                rsh.set("height", "stretch");
              } else {
                newFrame.width = width + CENTERED_FRAME_PADDING * 2;
                newFrame.height = height + CENTERED_FRAME_PADDING * 2;
              }
            }
          }
          studioCtx.setStudioFocusOnFrame({ frame: newFrame, autoZoom: true });
          extractUsedFontsFromComponents(studioCtx.site, [
            newComponent,
          ]).forEach((usage) =>
            studioCtx.fontManager.useFont(studioCtx, usage.fontFamily)
          );
          return success(true);
        })
      ),
    };
  }
}

async function readFigmaClipboard(
  sc: StudioCtx,
  clipboardText: string
): Promise<FigmaClipboard | null> {
  const figmaData = await getFigmaData(sc, clipboardText);
  if (!figmaData) {
    return null;
  }

  const uploadedImages = await uploadFigmaImages(figmaData, sc.appCtx);
  const { nodes, imagesToRename } = denormalizeFigmaData(figmaData);
  const nodeImages = await uploadNodeImages(nodes, sc.appCtx);

  return {
    nodes,
    uploadedImages,
    nodeImages,
    imagesToRename,
  };
}

async function getFigmaData(sc: StudioCtx, clipboardText: string) {
  const figmaData = figmaDataFromStr(clipboardText);
  if (figmaData) {
    return figmaData;
  }

  const clipId = figmaClipIdFromStr(clipboardText);
  if (!clipId) {
    return undefined;
  }

  const getClipResponse = await swallowAsync(sc.appCtx.api.getClip(clipId));
  if (!getClipResponse) {
    throw new WaitForClipError();
  }

  return figmaDataFromStr(getClipResponse.content);
}

function figmaClipIdFromStr(clipboardText: string): string | undefined {
  const maybeFigmaKey = swallow(() => JSON.parse(clipboardText));
  if (!maybeFigmaKey) {
    return undefined;
  }
  if (maybeFigmaKey.__clipType !== PLASMIC_CLIPBOARD_FORMAT) {
    return undefined;
  }
  return maybeFigmaKey.clipId;
}

const figmaDataFromStr = (figmaDataStr: string): FigmaData | undefined => {
  try {
    const maybeFigmaData = JSON.parse(figmaDataStr);
    if (isFigmaData(maybeFigmaData)) {
      return maybeFigmaData;
    }
    return;
  } catch (e) {
    return;
  }
};

export const tplNodeFromFigmaData = (
  vtm: VariantTplMgr,
  site: Site,
  siteOps: SiteOps,
  nodes: Array<SceneNode>,
  uploadedImages: Map<
    string,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >,
  nodeImages: Map<
    SceneNode,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >,
  imagesToRename: Map<string, string>,
  replaceComponentInstances: boolean
): TplNode | undefined => {
  const imageAssets = createImageAssets(uploadedImages, siteOps);
  const nodeAssets = createNodeAssets(nodeImages, siteOps);
  renameImageAssets(siteOps, imagesToRename, imageAssets);
  const maker = getNodeToTplNode(
    site,
    vtm,
    imageAssets,
    nodeAssets,
    replaceComponentInstances
  );
  const nodeToTpl = new Map(
    withoutNilTuples(nodes.map((node) => tuple(node, maker(node))))
  );
  const wrapped = wrapTplNodes(nodeToTpl, vtm);
  if (wrapped) {
    ensureUniqueNames(wrapped);
  }
  return wrapped;
};

function ensureUniqueNames(node: TplNode) {
  const seenNormalized = new Set<string>();
  for (const descendant of flattenTpls(node)) {
    if (isTplNamable(descendant) && descendant.name) {
      let name = descendant.name;
      if (seenNormalized.has(toVarName(name))) {
        name = uniqueName([...seenNormalized], name, {
          normalize: toVarName,
        });
        descendant.name = name;
      }
      seenNormalized.add(toVarName(name));
    }
  }
}

export const denormalizeFigmaData = (
  data: FigmaData
): { nodes: Array<SceneNode>; imagesToRename: Map<string, string> } => {
  const imagesToRename: Map<string, string> = new Map();
  const denormalize = (
    object: any,
    parent: { [key: string]: Serializable } | null = null
  ) => {
    if (Array.isArray(object)) {
      return object.map((obj) => denormalize(obj, parent));
    } else if (typeof object === "object") {
      const denormalized: { [key: string]: Serializable } = { parent };
      Object.entries(object).forEach(
        ([key, value]) =>
          (denormalized[data.k[parseInt(key, 36)]] = denormalize(
            value,
            denormalized
          ))
      );
      if (typeof denormalized.imageHash === "string") {
        // Set the imageAsset's name to the first named using node.
        const par = denormalized["parent"];
        if (
          !imagesToRename.has(denormalized.imageHash) &&
          par &&
          isString(par["name"])
        ) {
          imagesToRename.set(denormalized.imageHash, par["name"]);
        }
      }
      if (typeof denormalized.svgHash === "string") {
        denormalized.svgData = data.v[denormalized.svgHash as string];
      }
      const children = (denormalized.children || []) as any as Array<SceneNode>;
      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        const { layoutParent, indexOfSibling } = getLayoutParent(children[i]);
        if (indexOfSibling !== -1) {
          c.x -= (layoutParent as SceneNode).x;
          c.y -= (layoutParent as SceneNode).y;
        }
      }
      return denormalized;
    } else if (typeof object === "string") {
      return data.s[parseInt(object, 36)];
    } else {
      return object;
    }
  };
  return {
    nodes: (denormalize(data.n) as Array<SceneNode>).reverse(),
    imagesToRename,
  };
};

/**
 * Returns whether the transform has any effect, ignoring translations.
 */
function isIdentityTransform({ a, b, c, d }: Matrix) {
  return a === 1 && b === 0 && c === 0 && d === 1;
}

const getNodeToTplNode = (
  site: Site,
  vtm: VariantTplMgr,
  imageAssets: Map<string, ImageAsset>,
  nodeAssets: Map<SceneNode, { asset: ImageAsset; iconColor?: string }>,
  replaceComponentInstances: boolean
) => {
  const setNodeStyle = (
    node: SceneNode,
    tpl: TplTag | TplComponent,
    styles: Array<Style>
  ) => {
    const vs = vtm.ensureBaseVariantSetting(tpl);
    RSH(vs.rs, tpl).merge(flattenStyles(styles));
    if (!node.visible) {
      vs.dataCond = codeLit(false);
    }
  };

  function setMaskForTag(node: SceneNode, tag: TplTag) {
    // If the node has a direct mask children, add it via css masks.
    const firstMaskNode =
      "children" in node
        ? ensure(node.children, "checked before").find(
            (child) => "isMask" in child && child.isMask
          )
        : undefined;
    const asset = firstMaskNode ? nodeAssets.get(firstMaskNode) : undefined;

    if (asset) {
      setNodeStyle(node, tag, [
        {
          "-webkit-mask-image": mkImageAssetRef(asset.asset),
          "-webkit-mask-size": `${asset.asset.width}px ${asset.asset.height}px`,
          "-webkit-mask-repeat": "no-repeat",
        } as any,
      ]);
    }
  }

  const adjustedChildren = (
    children: ReadonlyArray<SceneNode>,
    isAutoLayoutParent = false
  ) => {
    const tplChildren = children.map(nodeToTplNode);

    const newChildren: Array<TplNode> = [];
    for (let i = 0; i < children.length; i++) {
      const tpl = tplChildren[i];
      if (!tpl) {
        continue;
      }
      const node = children[i];
      // Unlike in CSS, transforms in Figma actually affect layout. So whenever
      // we encounter a node that has been transformed (and it's within an
      // auto-layout), we wrap it in a div that is simply a fixed-size free
      // container (basically the bounding box).
      let adjustedTpl = tpl;
      if (
        isAutoLayoutParent &&
        !isIdentityTransform(transformToMatrix(node.relativeTransform))
      ) {
        adjustedTpl = wrapInBox(vtm, [tuple(node, tpl)]);
      }
      const { indexOfSibling } = getLayoutParent(node);
      if (indexOfSibling !== -1) {
        const tplParent = ensureKnownTplTag(tplChildren[indexOfSibling]);
        tplParent.children.push(tpl);
        tpl.parent = tplParent;
      } else {
        newChildren.push(adjustedTpl);
      }
    }

    return newChildren;
  };

  function convertToAsset(node: SceneNode) {
    const asset = nodeAssets.get(node);

    // An invisible node. Just discard it.
    if (!asset) {
      return undefined;
    }

    const tag = vtm.mkTplImage({
      asset: asset.asset,
      type: ImageAssetType.Icon,
      iconColor: asset.iconColor,
    });

    // Fills should be inside the SVG.
    if ("fills" in node) {
      node.fills = [];
    }

    // Instead of using DefaultShapeMixin, just use the mixins which
    // aren't encoded in the SVG itself
    const style =
      node.type === "BOOLEAN_OPERATION"
        ? styleForLayoutMixin(node)
        : styleForDefaultFrameMixin(node, new Map([]));

    // Set the size to the node as the size of the image
    setNodeStyle(node, tag, [
      style,
      { width: `${asset.asset.width}px`, height: `${asset.asset.height}px` },
    ]);
    return tag;
  }

  const allComponents = [
    ...site.components,
    ...site.projectDependencies.flatMap((dep) => dep.site.components),
  ].filter(
    (comp) => isReusableComponent(comp) && !isContextCodeComponent(comp)
  );

  const nodeToTplNode = (
    node: SceneNode
  ): TplTag | TplComponent | undefined => {
    if ("isMask" in node && node.isMask) {
      return undefined; // Masks will be handled by the parent.
    }
    if (
      node.type == "INSTANCE" &&
      replaceComponentInstances &&
      node.mainComponent
    ) {
      const component = findMappedComponent(node, allComponents);
      if (component) {
        function getAllProperties(
          inst: InstanceNode
        ): ComponentPropertiesEntries {
          const localProps: ComponentPropertiesEntries = Object.entries(
            inst.componentProperties ?? {}
          );

          const exposedInstances: InstanceNode[] = inst.exposedInstances ?? [];

          const exposedProps = exposedInstances.reduce(
            (acc, _inst): ComponentPropertiesEntries => {
              return [...acc, ...getAllProperties(_inst)];
            },
            [] as ComponentPropertiesEntries
          );

          /*
            When creating the nodes while denormalizing the data, we always create an
            "parent" prop to every Object, which just points to its parent on the
            entire tree, but that applies to every object (since we don't know before
              which objects are nodes), so we also add the parent to the object
              "ComponentProperties"... which is why we filter it here
          */
          return [...localProps, ...exposedProps].filter(
            ([k]) => k !== "parent"
          );
        }

        function getAllDescendants(inst: InstanceNode): InstanceNode[] {
          const children = inst.children ?? [];
          const descendants = children.flatMap((child) =>
            child.type === "INSTANCE"
              ? [child, ...getAllDescendants(child)]
              : []
          );
          return descendants;
        }

        const allNodeProperties = getAllProperties(node);

        const ACCEPTED_TYPES = ["TEXT", "BOOLEAN", "VARIANT", "INSTANCE_SWAP"];

        const allDescendants = getAllDescendants(node);

        function getChildComponentNameFromPropertyKey(key: string | undefined) {
          if (!key) {
            return undefined;
          }
          const refNode = allDescendants.find(
            (child) => child.componentPropertyReferences?.mainComponent === key
          );

          const nodeName = refNode?.name;
          if (!nodeName) {
            return undefined;
          }

          // if the name contains `/` it means it uses group naming, so we will use the last part of the name
          return nodeName.includes("/") ? nodeName.split("/").pop() : nodeName;
        }

        const propsArgs = withoutNils(
          allNodeProperties.map(([k, prop]) => {
            if (!ACCEPTED_TYPES.includes(prop.type)) {
              return null;
            }
            // Fix property name, removing the suffix that figma adds to text and boolean properties
            const key =
              prop.type === "VARIANT" ? k : k.substring(0, k.lastIndexOf("#"));
            const param = component.params.find(
              (p) => toVarName(p.variable.name) === toVarName(key)
            );

            if (!param) {
              return null;
            }

            // We don't handle slots here, they are handled in the next step
            if (param?.type.name === "renderable") {
              return null;
            }

            const parsedValue =
              prop.type === "INSTANCE_SWAP"
                ? getChildComponentNameFromPropertyKey(k)
                : prop.value;

            const variantGroup = component.variantGroups.find(
              (group) => group.param === param
            );
            const isTrueishValue =
              parsedValue === 1 ||
              ["true", "on"].includes(`${parsedValue}`.trim().toLowerCase());
            if (variantGroup) {
              // Currently only will toggle single-variants if the Property and Value has the same name, the value has the name "on" or if its
              // a boolean prop. For variant groups, works as expected (matches figma property with group name, and value with variant name)
              if (isStandaloneVariantGroup(variantGroup)) {
                return isTrueishValue
                  ? [
                      param.variable.name,
                      new VariantsRef({ variants: [variantGroup.variants[0]] }),
                    ]
                  : null;
              } else {
                const variant = variantGroup.variants.find(
                  (v) => toVarName(v.name) === toVarName(`${parsedValue}`)
                );
                return variant
                  ? [
                      param.variable.name,
                      new VariantsRef({ variants: [variant] }),
                    ]
                  : null;
              }
            }
            // Link props crashes studio if assigned an boolean
            if (param.type.name === "href" && prop.type === "BOOLEAN") {
              return null;
            }
            // Parse text to number if param is number
            if (param.type.name === "num" && prop.type === "TEXT") {
              return [param.variable.name, Number(parsedValue)];
            }
            if (param.type.name === "bool") {
              return isTrueishValue ? [param.variable.name, true] : null;
            }
            return [param.variable.name, parsedValue];
          })
        );

        const slotsArgs = Object.entries(
          getAllSlotsInNode(node, nodeToTplNode)
        ).filter(([key]) => {
          const param = component.params.find((p) => p.variable.name === key);
          return !!param && param.type.name === "renderable";
        });

        const args = Object.fromEntries([...propsArgs, ...slotsArgs]);
        const tplComponent = mkTplComponentX({
          component,
          baseVariant: vtm.getBaseVariantForNewNode(),
          args,
          name: node.name,
        });
        setNodeStyle(node, tplComponent, [
          filterValidCodeComponentStyles(
            styleForLayoutMixinAndConstraintMixin(node)
          ),
        ]);
        return tplComponent;
      }
    }
    if ("svgData" in node) {
      return convertToAsset(node);
    }
    switch (node.type) {
      case "BOOLEAN_OPERATION":
      case "LINE":
      case "POLYGON":
      case "STAR":
      case "ELLIPSE":
      case "VECTOR": {
        return convertToAsset(node);
      }
      case "INSTANCE":
      case "FRAME":
      case "COMPONENT":
      case "COMPONENT_SET": {
        const tag = mkTplTagX(
          "div",
          { name: node.name },
          adjustedChildren(node.children || [], node.layoutMode !== "NONE")
        );
        setNodeStyle(node, tag, [styleForDefaultFrameMixin(node, imageAssets)]);
        setMaskForTag(node, tag);
        return tag;
      }
      case "GROUP": {
        const tag = mkTplTagX(
          "div",
          { name: node.name },
          adjustedChildren(node.children || [])
        );
        setNodeStyle(node, tag, [
          styleForBlendMixin(node),
          styleForLayoutMixin(node),
        ]);
        setMaskForTag(node, tag);
        return tag;
      }
      case "RECTANGLE": {
        const tag = mkTplTagX("div", { name: node.name });
        setNodeStyle(node, tag, [
          styleForDefaultShapeMixin(node, imageAssets),
          styleForLayoutMixinAndConstraintMixin(node),
          styleForCornerMixin(node),
          styleForRectangleCornerMixin(node),
        ]);
        return tag;
      }
      case "TEXT": {
        // Text node names are never truncated, only consecutive whitespaces are
        // replaced with a single space (exactly the behavior of crunch()).
        // (Determined experimentally.)

        // Note: although .characters should never be undefined, we've seen it
        // in the wild, such as with
        // https://app.clubhouse.io/plasmic/story/9747/figma-import-text-nodes-might-not-have-name-or-characters.
        // So we err on the safe side and use an empty string. (In that design,
        // I would expect that text node to be empty.)
        const chars = node.characters ?? "";

        const isAutoNamed = crunch(node.name) === crunch(chars);
        const textTag = mkTplTagX("div", {
          name: isAutoNamed ? undefined : node.name,
          type: TplTagType.Text,
        });
        const variantSetting = vtm.ensureBaseVariantSetting(textTag);
        variantSetting.text = new RawText({
          text: chars,
          markers: [],
        });

        const styleForText = styleForTextNode(node);

        const styles = flattenStyles(
          styleForDefaultShapeMixin(node, imageAssets),
          styleForLayoutMixinAndConstraintMixin(node),
          styleForText
        );

        if (!styleForText || styleForText["color"] !== "transparent") {
          delete styles["background"];
        }

        // Separate off the layout related styles in case we need to add a
        // wrapper to this
        const {
          alignSelf,
          position,
          top,
          left,
          bottom,
          right,
          width,
          height,
          transform,
          transformOrigin,
          ...textStyle
        } = styles;

        const layoutStyle = Object.fromEntries(
          Object.entries({
            alignSelf,
            position,
            top,
            left,
            bottom,
            right,
            width,
            height,
            transform,
            transformOrigin,
          }).filter(([_, value]) => typeof value !== "undefined")
        );

        // Only set the text styles for now
        RSH(variantSetting.rs, textTag).merge(textStyle);
        if (!node.visible) {
          variantSetting.dataCond = codeLit(false);
        }

        // If the text isn't a fixed size, or the alignment is set to top we
        // don't need to wrap it, that's how it already behaves
        if (
          node.textAutoResize !== "NONE" ||
          node.textAlignVertical === "TOP"
        ) {
          RSH(variantSetting.rs, textTag).merge(layoutStyle);
          return textTag;
        } else {
          const wrapperTag = mkTplTagX("div", { name: node.name }, [textTag]);
          RSH(vtm.ensureBaseVariantSetting(wrapperTag).rs, wrapperTag).merge({
            ...layoutStyle,
            display: "flex",
            flexDirection: "column",
            justifyContent:
              node.textAlignVertical === "BOTTOM" ? "flex-end" : "center",
          });
          return wrapperTag;
        }
      }
      default:
        return;
    }
  };

  return nodeToTplNode;
};
