// Forked from:
// https://github.com/figma/plugin-typings/blob/master/index.d.ts

// We don't just add this directly because it declares `figma` as a global type
// when we just need the data and node types. Properties which aren't exported
// by our serializer have also been removed.

// We also remove all the methods (since we consume these as just JSON blobs),
// and we also create SVGMixin to hold svgData exported by plugin.

////////////////////////////////////////////////////////////////////////////////
// Datatypes

export type Transform = [[number, number, number], [number, number, number]];

interface Vector {
  readonly x: number;
  readonly y: number;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface RGBA {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

interface FontName {
  readonly family: string;
  readonly style: string;
}

type TextCase = "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";

type TextDecoration = "NONE" | "UNDERLINE" | "STRIKETHROUGH";

interface ArcData {
  readonly startingAngle: number;
  readonly endingAngle: number;
  readonly innerRadius: number;
}

interface ShadowEffect {
  readonly type: "DROP_SHADOW" | "INNER_SHADOW";
  readonly color: RGBA;
  readonly offset: Vector;
  readonly radius: number;
  readonly spread?: number;
  readonly visible: boolean;
  readonly blendMode: BlendMode;
}

interface BlurEffect {
  readonly type: "LAYER_BLUR" | "BACKGROUND_BLUR";
  readonly radius: number;
  readonly visible: boolean;
}

type Effect = ShadowEffect | BlurEffect;

type ConstraintType = "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";

interface Constraints {
  readonly horizontal: ConstraintType;
  readonly vertical: ConstraintType;
}

interface ColorStop {
  readonly position: number;
  readonly color: RGBA;
}

interface ImageFilters {
  readonly exposure?: number;
  readonly contrast?: number;
  readonly saturation?: number;
  readonly temperature?: number;
  readonly tint?: number;
  readonly highlights?: number;
  readonly shadows?: number;
}

export interface SolidPaint {
  readonly type: "SOLID";
  readonly color: RGB;

  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: BlendMode;
}

interface GradientPaint {
  readonly type:
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND";
  readonly gradientTransform: Transform;
  readonly gradientStops: ReadonlyArray<ColorStop>;

  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: BlendMode;
}

interface ImagePaint {
  readonly type: "IMAGE";
  readonly scaleMode: "FILL" | "FIT" | "CROP" | "TILE";
  readonly imageHash: string | null;
  readonly imageTransform?: Transform; // setting for "CROP"
  readonly scalingFactor?: number; // setting for "TILE"
  readonly filters?: ImageFilters;

  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: BlendMode;
}

type Paint = SolidPaint | GradientPaint | ImagePaint;

interface Guide {
  readonly axis: "X" | "Y";
  readonly offset: number;
}

interface RowsColsLayoutGrid {
  readonly pattern: "ROWS" | "COLUMNS";
  readonly alignment: "MIN" | "MAX" | "STRETCH" | "CENTER";
  readonly gutterSize: number;

  readonly count: number; // Infinity when "Auto" is set in the UI
  readonly sectionSize?: number; // Not set for alignment: "STRETCH"
  readonly offset?: number; // Not set for alignment: "CENTER"

  readonly visible?: boolean;
  readonly color?: RGBA;
}

interface GridLayoutGrid {
  readonly pattern: "GRID";
  readonly sectionSize: number;

  readonly visible?: boolean;
  readonly color?: RGBA;
}

type LayoutGrid = RowsColsLayoutGrid | GridLayoutGrid;

interface ExportSettingsConstraints {
  readonly type: "SCALE" | "WIDTH" | "HEIGHT";
  readonly value: number;
}

interface ExportSettingsImage {
  readonly format: "JPG" | "PNG";
  readonly contentsOnly?: boolean; // defaults to true
  readonly suffix?: string;
  readonly constraint?: ExportSettingsConstraints;
}

interface ExportSettingsSVG {
  readonly format: "SVG";
  readonly contentsOnly?: boolean; // defaults to true
  readonly suffix?: string;
  readonly svgOutlineText?: boolean; // defaults to true
  readonly svgIdAttribute?: boolean; // defaults to false
  readonly svgSimplifyStroke?: boolean; // defaults to true
}

interface ExportSettingsPDF {
  readonly format: "PDF";
  readonly contentsOnly?: boolean; // defaults to true
  readonly suffix?: string;
}

type ExportSettings =
  | ExportSettingsImage
  | ExportSettingsSVG
  | ExportSettingsPDF;

type WindingRule = "NONZERO" | "EVENODD";

interface VectorVertex {
  readonly x: number;
  readonly y: number;
  readonly strokeCap?: StrokeCap;
  readonly strokeJoin?: StrokeJoin;
  readonly cornerRadius?: number;
  readonly handleMirroring?: HandleMirroring;
}

interface VectorSegment {
  readonly start: number;
  readonly end: number;
  readonly tangentStart?: Vector; // Defaults to { x: 0, y: 0 }
  readonly tangentEnd?: Vector; // Defaults to { x: 0, y: 0 }
}

interface VectorRegion {
  readonly windingRule: WindingRule;
  readonly loops: ReadonlyArray<ReadonlyArray<number>>;
}

interface VectorNetwork {
  readonly vertices: ReadonlyArray<VectorVertex>;
  readonly segments: ReadonlyArray<VectorSegment>;
  readonly regions?: ReadonlyArray<VectorRegion>; // Defaults to []
}

interface VectorPath {
  readonly windingRule: WindingRule | "NONE";
  readonly data: string;
}

type VectorPaths = ReadonlyArray<VectorPath>;

interface LetterSpacing {
  readonly value: number;
  readonly unit: "PIXELS" | "PERCENT";
}

type LineHeight =
  | {
      readonly value: number;
      readonly unit: "PIXELS" | "PERCENT";
    }
  | {
      readonly unit: "AUTO";
    };

type BlendMode =
  | "NORMAL"
  | "DARKEN"
  | "MULTIPLY"
  | "LINEAR_BURN"
  | "COLOR_BURN"
  | "LIGHTEN"
  | "SCREEN"
  | "LINEAR_DODGE"
  | "COLOR_DODGE"
  | "OVERLAY"
  | "SOFT_LIGHT"
  | "HARD_LIGHT"
  | "DIFFERENCE"
  | "EXCLUSION"
  | "HUE"
  | "SATURATION"
  | "COLOR"
  | "LUMINOSITY";

interface Font {
  fontName: FontName;
}

type Reaction = { action: Action; trigger: Trigger };

type Action =
  | { readonly type: "BACK" | "CLOSE" }
  | { readonly type: "URL"; url: string }
  | {
      readonly type: "NODE";
      readonly destinationId: string | null;
      readonly navigation: Navigation;
      readonly transition: Transition | null;
      readonly preserveScrollPosition: boolean;

      // Only present if navigation == "OVERLAY" and the destination uses
      // overlay position type "RELATIVE"
      readonly overlayRelativePosition?: Vector;
    };

interface SimpleTransition {
  readonly type: "DISSOLVE" | "SMART_ANIMATE";
  readonly easing: Easing;
  readonly duration: number;
}

interface DirectionalTransition {
  readonly type: "MOVE_IN" | "MOVE_OUT" | "PUSH" | "SLIDE_IN" | "SLIDE_OUT";
  readonly direction: "LEFT" | "RIGHT" | "TOP" | "BOTTOM";
  readonly matchLayers: boolean;

  readonly easing: Easing;
  readonly duration: number;
}

type Transition = SimpleTransition | DirectionalTransition;

type Trigger =
  | { readonly type: "ON_CLICK" | "ON_HOVER" | "ON_PRESS" | "ON_DRAG" }
  | { readonly type: "AFTER_TIMEOUT"; readonly timeout: number }
  | {
      readonly type: "MOUSE_ENTER" | "MOUSE_LEAVE" | "MOUSE_UP" | "MOUSE_DOWN";
      readonly delay: number;
    };

type Navigation = "NAVIGATE" | "SWAP" | "OVERLAY";

interface Easing {
  readonly type: "EASE_IN" | "EASE_OUT" | "EASE_IN_AND_OUT" | "LINEAR";
  readonly easingFunctionCubicBezier?: EasingFunctionBezier;
}

interface EasingFunctionBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type OverflowDirection = "NONE" | "HORIZONTAL" | "VERTICAL" | "BOTH";

type OverlayPositionType =
  | "CENTER"
  | "TOP_LEFT"
  | "TOP_CENTER"
  | "TOP_RIGHT"
  | "BOTTOM_LEFT"
  | "BOTTOM_CENTER"
  | "BOTTOM_RIGHT"
  | "MANUAL";

type OverlayBackground =
  | { readonly type: "NONE" }
  | { readonly type: "SOLID_COLOR"; readonly color: RGBA };

type OverlayBackgroundInteraction = "NONE" | "CLOSE_ON_CLICK_OUTSIDE";

type PublishStatus = "UNPUBLISHED" | "CURRENT" | "CHANGED";

////////////////////////////////////////////////////////////////////////////////
// Mixins

interface BaseNodeMixin {
  readonly id: string;
  readonly parent: (BaseNode & ChildrenMixin) | null;
  name: string; // Note: setting this also sets `autoRename` to false on TextNodes
  readonly removed: boolean;
}

export interface SceneNodeMixin {
  visible: boolean;
  locked: boolean;
  svgData?: string; // optional because SVG export may have failed
}

interface ChildrenMixin {
  readonly children?: ReadonlyArray<SceneNode>;
}

export interface ConstraintMixin {
  constraints: Constraints;
}

export interface LayoutMixin {
  readonly absoluteTransform: Transform;
  relativeTransform: Transform;
  x: number;
  y: number;
  rotation: number; // In degrees

  readonly width: number;
  readonly height: number;
  constrainProportions: boolean;

  layoutAlign: "MIN" | "CENTER" | "MAX" | "STRETCH" | "INHERIT"; // applicable only inside auto-layout frames
  layoutGrow: number;
  layoutSizingHorizontal: "FIXED" | "HUG";
  layoutSizingVertical: "FIXED" | "HUG";

  resize(width: number, height: number): void;
  resizeWithoutConstraints(width: number, height: number): void;
  rescale(scale: number): void;
}

export interface BlendMixin {
  opacity: number;
  blendMode: "PASS_THROUGH" | BlendMode;
  isMask: boolean;
  effects: ReadonlyArray<Effect>;
  effectStyleId: string;
}

interface ContainerMixin {
  expanded: boolean;
  backgrounds: ReadonlyArray<Paint>; // DEPRECATED: use 'fills' instead
  backgroundStyleId: string; // DEPRECATED: use 'fillStyleId' instead
}

type StrokeCap =
  | "NONE"
  | "ROUND"
  | "SQUARE"
  | "ARROW_LINES"
  | "ARROW_EQUILATERAL";
type StrokeJoin = "MITER" | "BEVEL" | "ROUND";
type HandleMirroring = "NONE" | "ANGLE" | "ANGLE_AND_LENGTH";

export interface GeometryMixin {
  fills: ReadonlyArray<Paint>;
  strokes: ReadonlyArray<Paint>;
  strokeWeight: number;
  strokeMiterLimit: number;
  strokeAlign: "CENTER" | "INSIDE" | "OUTSIDE";
  strokeCap: StrokeCap;
  strokeJoin: StrokeJoin;
  dashPattern: ReadonlyArray<number>;
  fillStyleId: string;
  strokeStyleId: string;
}

export interface CornerMixin {
  cornerRadius: number;
  cornerSmoothing: number;
}

export interface RectangleCornerMixin {
  topLeftRadius: number;
  topRightRadius: number;
  bottomLeftRadius: number;
  bottomRightRadius: number;
}

interface ExportMixin {
  exportSettings: ReadonlyArray<ExportSettings>;
  exportAsync(settings?: ExportSettings): Promise<Uint8Array>; // Defaults to PNG format
}

interface FramePrototypingMixin {
  overflowDirection: OverflowDirection;
  numberOfFixedChildren: number;

  readonly overlayPositionType: OverlayPositionType;
  readonly overlayBackground: OverlayBackground;
  readonly overlayBackgroundInteraction: OverlayBackgroundInteraction;
}

interface ReactionMixin {
  readonly reactions: ReadonlyArray<Reaction>;
}

interface PublishableMixin {
  description: string;
  readonly remote: boolean;
  readonly key: string; // The key to use with "importComponentByKeyAsync", "importComponentSetByKeyAsync", and "importStyleByKeyAsync"
  getPublishStatusAsync(): Promise<PublishStatus>;
}

export interface DefaultShapeMixin
  extends BaseNodeMixin,
    SceneNodeMixin,
    ReactionMixin,
    BlendMixin,
    GeometryMixin,
    LayoutMixin,
    ExportMixin {}

interface BaseFrameMixin
  extends BaseNodeMixin,
    SceneNodeMixin,
    ChildrenMixin,
    ContainerMixin,
    GeometryMixin,
    CornerMixin,
    RectangleCornerMixin,
    BlendMixin,
    ConstraintMixin,
    LayoutMixin,
    ExportMixin {
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisSizingMode: "FIXED" | "AUTO"; // applicable only if layoutMode != "NONE"
  counterAxisSizingMode: "FIXED" | "AUTO"; // applicable only if layoutMode != "NONE"

  primaryAxisAlignItems: "MIN" | "MAX" | "CENTER" | "SPACE_BETWEEN"; // applicable only if layoutMode != "NONE"
  counterAxisAlignItems: "MIN" | "MAX" | "CENTER"; // applicable only if layoutMode != "NONE"

  paddingLeft: number; // applicable only if layoutMode != "NONE"
  paddingRight: number; // applicable only if layoutMode != "NONE"
  paddingTop: number; // applicable only if layoutMode != "NONE"
  paddingBottom: number; // applicable only if layoutMode != "NONE"
  itemSpacing: number; // applicable only if layoutMode != "NONE"

  horizontalPadding: number; // DEPRECATED: use the individual paddings
  verticalPadding: number; // DEPRECATED: use the individual paddings

  layoutGrids: ReadonlyArray<LayoutGrid>;
  gridStyleId: string;
  clipsContent: boolean;
  guides: ReadonlyArray<Guide>;
}

export interface DefaultFrameMixin
  extends BaseFrameMixin,
    FramePrototypingMixin,
    ReactionMixin {}

////////////////////////////////////////////////////////////////////////////////
// Nodes

interface DocumentNode extends BaseNodeMixin {
  readonly type: "DOCUMENT";

  readonly children: ReadonlyArray<PageNode>;

  appendChild(child: PageNode): void;
  insertChild(index: number, child: PageNode): void;
  findChildren(callback?: (node: PageNode) => boolean): Array<PageNode>;
  findChild(callback: (node: PageNode) => boolean): PageNode | null;

  /**
   * If you only need to search immediate children, it is much faster
   * to call node.children.filter(callback) or node.findChildren(callback)
   */
  findAll(
    callback?: (node: PageNode | SceneNode) => boolean
  ): Array<PageNode | SceneNode>;

  /**
   * If you only need to search immediate children, it is much faster
   * to call node.children.find(callback) or node.findChild(callback)
   */
  findOne(
    callback: (node: PageNode | SceneNode) => boolean
  ): PageNode | SceneNode | null;
}

interface PageNode extends BaseNodeMixin, ChildrenMixin, ExportMixin {
  readonly type: "PAGE";

  guides: ReadonlyArray<Guide>;
  selection: ReadonlyArray<SceneNode>;
  selectedTextRange: { node: TextNode; start: number; end: number } | null;

  backgrounds: ReadonlyArray<Paint>;

  readonly prototypeStartNode:
    | FrameNode
    | GroupNode
    | ComponentNode
    | InstanceNode
    | null;
}

export interface FrameNode extends DefaultFrameMixin {
  readonly type: "FRAME";
}

export interface GroupNode
  extends BaseNodeMixin,
    SceneNodeMixin,
    ReactionMixin,
    ChildrenMixin,
    ContainerMixin,
    BlendMixin,
    LayoutMixin,
    ExportMixin {
  readonly type: "GROUP";
}

interface SliceNode
  extends BaseNodeMixin,
    SceneNodeMixin,
    LayoutMixin,
    ExportMixin {
  readonly type: "SLICE";
}

interface RectangleNode
  extends DefaultShapeMixin,
    ConstraintMixin,
    CornerMixin,
    RectangleCornerMixin {
  readonly type: "RECTANGLE";
}

interface LineNode extends DefaultShapeMixin, ConstraintMixin {
  readonly type: "LINE";
}

interface EllipseNode extends DefaultShapeMixin, ConstraintMixin, CornerMixin {
  readonly type: "ELLIPSE";
  arcData: ArcData;
}

interface PolygonNode extends DefaultShapeMixin, ConstraintMixin, CornerMixin {
  readonly type: "POLYGON";
  pointCount: number;
}

interface StarNode extends DefaultShapeMixin, ConstraintMixin, CornerMixin {
  readonly type: "STAR";
  pointCount: number;
  innerRadius: number;
}

interface VectorNode extends DefaultShapeMixin, ConstraintMixin, CornerMixin {
  readonly type: "VECTOR";
  vectorNetwork: VectorNetwork;
  vectorPaths: VectorPaths;
  handleMirroring: HandleMirroring;
}

export interface TextNode extends DefaultShapeMixin, ConstraintMixin {
  readonly type: "TEXT";
  readonly hasMissingFont: boolean;
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  textAutoResize: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT";
  paragraphIndent: number;
  paragraphSpacing: number;
  autoRename: boolean;

  textStyleId: string;
  fontSize: number;
  fontName: FontName;
  textCase: TextCase;
  textDecoration: TextDecoration;
  letterSpacing: LetterSpacing;
  lineHeight: LineHeight;

  characters: string;
}

interface ComponentSetNode extends BaseFrameMixin, PublishableMixin {
  readonly type: "COMPONENT_SET";
  readonly defaultVariant: ComponentNode;
}

export interface ComponentNode extends DefaultFrameMixin, PublishableMixin {
  readonly type: "COMPONENT";
  createInstance(): InstanceNode;
}

export interface ComponentProperties {
  [propertyName: string]: {
    type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT";
    value: string | number;
  };
}

export interface InstanceNode extends DefaultFrameMixin {
  readonly type: "INSTANCE";
  // We have to use a string here to keep backwards compatibility with the Figma Plugin API
  // Version <= 30 uses a string, and Version >= 31 uses a { id: string, name: string } object
  mainComponent?:
    | string
    | {
        id: string;
        name: string;
      };
  componentProperties?: ComponentProperties;
  componentPropertyReferences:
    | {
        [nodeProperty in "visible" | "characters" | "mainComponent"]?: string;
      }
    | null;
  exposedInstances?: [InstanceNode];
  scaleFactor: number;
}

export type ComponentPropertiesEntries = Array<
  [string, NonNullable<InstanceNode["componentProperties"]>[string]]
>;

interface BooleanOperationNode
  extends DefaultShapeMixin,
    ChildrenMixin,
    CornerMixin {
  readonly type: "BOOLEAN_OPERATION";
  booleanOperation: "UNION" | "INTERSECT" | "SUBTRACT" | "EXCLUDE";

  expanded: boolean;
}

type BaseNode = DocumentNode | PageNode | SceneNode;

export type SceneNode =
  | SliceNode
  | FrameNode
  | GroupNode
  | ComponentSetNode
  | ComponentNode
  | InstanceNode
  | BooleanOperationNode
  | VectorNode
  | StarNode
  | LineNode
  | EllipseNode
  | PolygonNode
  | RectangleNode
  | TextNode;
