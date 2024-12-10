export const schema = `\
# @WeakRef annotations are used to enforce our model to be a tree.
# It means that the field references an existing instance of the model,
# so there's a path from the root to that instance without accessing any
# weakRef. This is useful for removing cycles and to ensure that there is
# only one path from the root to each instance in the model (considering only
# strong references).
# If a field wants to reference an existing instance in the model, it should
# always use @WeakRef.
# Otherwise, it will be considered a strong reference and we must make sure not
# to reference it with another strong reference.
# Fields that don't store \`ObjInst\`s don't need annotations.

# Avoid using \`Type\` as it's too generic!
Type
  PrimitiveType
    Scalar
      Num
        @Const name: 'num'
      Text
        @Const name: 'text'
      BoolType
        @Const name: 'bool'
    AnyType
      @Const name: 'any'
    Choice
      @Const name: 'choice'
      options: [String] | [Map[String, String | Number | Bool]]
  Img
    @Const name: 'img'
  ComponentInstance
    @Const name: 'instance'
    @WeakRef component: Component
  PlumeInstance
    @Const name: 'plumeInstance'
    plumeType: String
  RenderableType
    @Const name: 'renderable'
    params: [PlumeInstance | ComponentInstance]
    allowRootWrapper: Bool?
  HrefType
    @Const name: 'href'
  TargetType
    @Const name: 'target'
  RenderFuncType
    @Const name: 'renderFunc'
    params: [ArgType]
    allowed: [ComponentInstance]
    allowRootWrapper: Bool?
  QueryData
    @Const name: 'queryData'
  DateString
    @Const name: 'dateString'
  DateRangeStrings
    @Const name: 'dateRangeStrings'
  FunctionType
    @Const name: 'func'
    params: [ArgType]
  ArgType
    @Const name: 'arg'
    argName: String
    displayName: String?
    type: PrimitiveType | Img | HrefType | TargetType | DateString | DateRangeStrings | QueryData | StylePropType
  StylePropType
    ClassNamePropType
      @Const name: 'className'
      selectors: [LabeledSelector]
      defaultStyles: Map[String, String]
    StyleScopeClassNamePropType
      @Const name: 'styleScopeClassName'
      scopeName: String
    DefaultStylesClassNamePropType
      @Const name: 'defaultStylesClassName'
      includeTagStyles: Bool
    DefaultStylesPropType
      @Const name: 'defaultStyles'
    ColorPropType
      @Const name: 'color'
      noDeref: Bool
VariantedValue
  @WeakRef variants: [Variant]
  value: String
StyleToken
  # This is really more like a displayName, not treated as the stable ID (although it also needs to be unique).
  name: String
  # Such as color, size, and etc.
  @Const type: String
  @Const uuid: String
  value: String
  variantedValues: [VariantedValue]
  isRegistered: Bool
  # Unique key used to identify this token by the registration calls. Allows you to treat the name as a display name
  # that can change without breaking backcompat with projects.
  regKey: String?
HostLessPackageInfo
  name: String
  npmPkg: [String]
  cssImport: [String]
  deps: [String]
  # A hacky way of knowing when we should make separate calls instead of
  # 'registerAll', because some packages have two versions of registration
  # calls to the same component (e.g., prior to global contexts and with global
  # context). An empty array means 'registerAll'.
  registerCalls: [String]
  minimumReactVersion: String?
Site
  components: {Component}
  # AKA "Pages" in other design tools.
  arenas: [Arena]
  pageArenas: [PageArena]
  componentArenas: [ComponentArena]
  globalVariantGroups: [GlobalVariantGroup]
  # A list of fonts that is managed by user. Plasmic allow usages of all these
  # fonts, even if they are not available.
  userManagedFonts: [String]

  # All the ArenaFrame.container TplComponents will have their vsettings
  # stored by this globalVariant.
  @Const globalVariant: Variant
  styleTokens: [StyleToken]
  mixins: [Mixin]
  @Const themes: [Theme]
  @WeakRef activeTheme: Theme?
  imageAssets: [ImageAsset]
  # projectDependencies are marked as WeakRef because the bundler sees them as
  # external references, and since xrefs are not injected into the tree, they
  # are expected to be unreachable (the only exceptions are base types, which
  # are handled in a special way).
  @WeakRef projectDependencies: [ProjectDependency]
  @WeakRef activeScreenVariantGroup: GlobalVariantGroup?
  flags: Map[String, String|Bool|Number?]
  @Const hostLessPackageInfo: HostLessPackageInfo?
  globalContexts: [TplComponent]
  splits: [Split]
  @WeakRef defaultComponents: Map[String, Component]
  defaultPageRoleId: String?
  @WeakRef pageWrapper: Component?
  customFunctions: [CustomFunction]
  codeLibraries: [CodeLibrary]

ArenaFrameGrid
  rows: [ArenaFrameRow]

ArenaFrameRow
  cols: [ArenaFrameCell]
  @WeakRef rowKey: VariantGroup? | Variant?

ArenaFrameCell
  @Const frame: ArenaFrame
  @WeakRef cellKey: Variant? | [Variant]?

ComponentArena
  @Const @WeakRef component: Component
  @Transient _focusedFrame: ArenaFrame?
  matrix: ArenaFrameGrid
  customMatrix: ArenaFrameGrid

PageArena
  @Const @WeakRef component: Component
  @Transient _focusedFrame: ArenaFrame?
  matrix: ArenaFrameGrid
  customMatrix: ArenaFrameGrid

Arena
  name: String
  children: [ArenaChild]

ArenaChild
  name: String
  top: Number?
  left: Number?
  ArenaFrame
    @Const uuid: String
    # Width of the viewport to preview the component. CSS vw units will respond to this.
    width: Number
    # Height of the viewport to preview the component. CSS vh units will respond to this.
    height: Number

    # This is what identifies which component we are rendering, which variant,
    # what args, etc.
    container: TplComponent
    # This one is special - not really a variant at all.
    lang: String
    # This contains a mapping of context variants to render.  TODO Not yet done.
    # selectedGlobalVariants: [Variant]

    # This contains a Map of Variant UUID to whether it is pinned or not. This
    # determines what variants are turned on for the root TplComponent for this
    # frame.  It is stored in this map, instead of specified as args to the
    # root TplComponent, because not all variants are args (for example,
    # StyleVariants).
    pinnedVariants: Map[String, Bool]

    # The list of selected variants that stores the current settings.
    @WeakRef targetVariants: [Variant]

    # Settings of the global variants. This is stored separately so that we
    # could have separate observable objects for the root TplComponent frame
    # and global frame.
    pinnedGlobalVariants: Map[String, Bool]
    @WeakRef targetGlobalVariants: [Variant]

    # Describes how the root component is displayed
    viewMode: 'stretch' | 'centered'

    # Background color for the frame; transparent if not specified
    bgColor: String?

  # This is a sub-arena managed by Plasmic for showing cross-products of
  # variants.  TODO Not yet done.
  # Matrix
  #   component: Component
  #   rows: [MatrixFactor]
  #   cols: [MatrixFactor]
  # MatrixFactor
  #   selectedComponent: Component?
  #   # Either a global or local variant.
  #   selectedVariantGroup: VariantGroup
  #   # These can be global variants.
  #   selectedVariants: [Variant]

CustomFunction
  importPath: String
  importName: String
  defaultExport: Bool
  namespace: String?

CodeLibrary
  name: String
  importPath: String
  jsIdentifier: String
  importType: 'default' | 'namespace' | 'named'
  namedImport: String?
  isSyntheticDefaultImport: Bool

StyleNode
  RuleSet
    values: Map[String, String]
    #children: [Rule]
    @WeakRef mixins: [Mixin]
  Rule
    @Const name: String
    values: [String]
VariantedRuleSet
  @Const @WeakRef variants: [Variant]
  rs: RuleSet
Mixin
  name: String
  rs: RuleSet
  # Contents for preview. If not set, defaults to "Preview"
  preview: String?
  @Const uuid: String
  # Whether this Mixin belongs to a Theme object. If so, then when generated
  # as CSS, we generate references to a variable as
  # "--var(mixin-default-<prop>)". In this way, when theme is switched, we only
  # need to change "mixin-default-<prop>" to "--var(mixin-<uuid>-<prop>)" where
  # uuid is the effective theme's defaultStyle.uuid.
  @Const forTheme: Bool
  variantedRs: [VariantedRuleSet]
Theme
  defaultStyle: Mixin
  styles: [ThemeStyle]
  layout: ThemeLayoutSettings?
  # Default styles when new elements are added
  addItemPrefs: Map[String, RuleSet]
  # whether this theme is active or not. At most one theme is active.
  @Const active: Bool
  # TBD: add tokens support to Theme.
  #   Option 1 - each Theme can specify overrides of token values, which
  #   will change both defaultStyle and the mixins that references the tokens.
  #   Option 2 - each Theme object can have the same set of tokens. Each token
  #   in the ASSETs tab can refer to tokens in the Theme object. To simplify the
  #   model, in this case, Theme's defaultStyle can only refer to tokens in
  #   Theme object. Essentially, we are treating Theme as the most basic assets.
  #   Option 3 - move tokens from Site into Theme object. Each Theme will have
  #   the same set of tokens, but could have different values. This model is
  #   simplest.
ThemeStyle
  @Const selector: String
  style: Mixin
ThemeLayoutSettings
  rs: RuleSet
ProjectDependency
  @Const uuid: String
  pkgId: String
  projectId: String
  version: String
  name: String
  site: Site
ImageAsset
  @Const uuid: String
  name: String
  # "picture" (opaque, rendered as data-uri) or "icon" (rendered as svg)
  @Const type: 'picture' | 'icon'
  dataUri: String?
  width: Number?
  height: Number?
  # Aspect ratio is multiplied by ASPECT_RATIO_SCALE_FACTOR so become integer.
  # It's only used by picture SVGs.
  aspectRatio: Number?
TplNode
  @Const uuid: String
  @WeakRef parent: TplNode?
  locked: Bool?
  vsettings: [VariantSetting]
  TplTag
    tag: String
    name: String?
    children: [TplNode]
    # "text" or "image" or "column" or "columns" or "other". Text node's tag
    # can be converted to any other container.
    # A type of "image" means this tag should not have any children.
    type: 'text' | 'image' | 'column' | 'columns' | 'other'
    # Directive on codegen.
    #  "auto": Plasmic decides whether generate the code with the tag or not.
    #     used on text node, where we don't generate the wrapper if the node
    #     has no style.
    #  "alwaysTag": Plasmic always generate the tag, even if it is plain text.
    #  "noTag": Plasmic don't generate the tag. Used only for text node to
    #     represents raw string.
    #  The default value is "auto".
    codeGenType: 'auto'? | 'alwaysTag'? | 'noTag'?
    # Used by responsive columns.
    columnsSetting: ColumnsSetting?
  TplComponent
    name: String?
    @WeakRef component: Component
  TplSlot
    @Const @WeakRef param: SlotParam
    defaultContents: [TplNode]
ColumnsSetting
  @WeakRef screenBreakpoint: Variant?
PageMeta
  path: String
  # Key-value pairs for page URL parameters (e.g. if path is /products/[slug]
  # this will contain {"slug": "value-configured-in-studio"}).
  params: Map[String,String]
  # Key-value pairs for page URL query parameters.
  query: Map[String,String]
  title: String?
  description: String
  canonical: String?
  roleId: String?
  @WeakRef openGraphImage: ImageAsset? | String?
ComponentDataQuery
  @Const uuid: String
  name: String
  op: DataSourceOpExpr?
CodeComponentHelper
  importPath: String
  importName: String
  defaultExport: Bool
CodeComponentVariantMeta
  cssSelector: String
  displayName: String
CodeComponentMeta
  importPath: String
  defaultExport: Bool
  displayName: String?
  importName: String?
  description: String?
  section: String?
  thumbnailUrl: String?
  classNameProp: String?
  refProp: String?
  defaultStyles: RuleSet?
  defaultDisplay: String?
  isHostLess: Bool
  isContext: Bool
  isAttachment: Bool
  providesData: Bool
  hasRef: Bool
  isRepeatable: Bool
  styleSections: Bool?
  helpers: CodeComponentHelper?
  # where Any is PlasmicElement|PlasmicElement[]
  defaultSlotContents: Map[String, Any]
  variants: Map[String, CodeComponentVariantMeta]
Component
  @Const uuid: String
  name: String
  params: {Param}
  states: {State}
  tplTree: TplNode
  editableByContentEditor: Bool
  hiddenFromContentEditor: Bool
  # Excludes the ones under variantGroups
  variants: [Variant]
  variantGroups: [ComponentVariantGroup]
  # If pageMeta is set, the component is a page.
  pageMeta: PageMeta?
  codeComponentMeta: CodeComponentMeta?
  type: 'plain' | 'page' | 'code' | 'frame'
  @WeakRef subComps: [Component]
  @WeakRef superComp: Component?
  @Const plumeInfo: PlumeInfo?
  # If this component was created from a template
  templateInfo: ComponentTemplateInfo?
  metadata: Map[String, String]
  dataQueries: [ComponentDataQuery]
  figmaMappings: [FigmaComponentMapping]
  alwaysAutoName: Bool
  trapsFocus: Bool
NameArg
  name: String
  expr: Expr

PlumeInfo
  type: String

ComponentTemplateInfo
  # Unique name of the template if it's a component template
  name: String?
  # Extra information about how the component was created from a template
  projectId: String?
  componentId: String?

Variant
  @Const uuid: String
  name: String
  # Set if this is a style variant
  selectors: [String]?
  # For code component variants, both codeComponentName and codeComponentVariantKeys should be set.
  # For other variants, both should be undefined
  codeComponentName: String?
  codeComponentVariantKeys: [String]?
  # The parent of the variant. A base variant doesn't have any parent.
  @WeakRef parent: VariantGroup?
  # Used for screen variant to specify the screen.
  mediaQuery: String?
  # Description of this variant
  description: String?
  @WeakRef forTpl: TplTag? | TplComponent? | TplSlot?
VariantGroup
  @Const uuid: String
  variants: [Variant]
  multi: Bool
  GlobalVariantGroup
    type: 'global-screen' | 'global-user-defined'
    @Const param: GlobalVariantGroupParam
  ComponentVariantGroup
    type: 'component'
    @Const @WeakRef param: StateParam
    @Const @WeakRef linkedState: VariantGroupState
VariantSetting
  @WeakRef variants: [Variant]
  args: [Arg]
  attrs: Map[String, Expr]
  # This is for static styles (these become classes).
  rs: RuleSet
  dataCond: CustomCode? | ObjectPath?
  dataRep: Rep?
  text: RichText?
  # Only available on TplTagColumns
  columnsConfig: ColumnsConfig?
Interaction
  interactionName: String
  actionName: String
  args: [NameArg]
  condExpr: CustomCode? | ObjectPath?
  conditionalMode: 'always' | 'never' | 'expression'
  @Const uuid: String
  @WeakRef parent: EventHandler
ColumnsConfig
  breakUpRows: Bool
  colsSizes: [Number]
Marker
  # A special marker to denote stylish annotations inside rich text.
  position: Number
  length: Number
  StyleMarker
    # For particular styles inside the text field
    rs: RuleSet
  NodeMarker
    @WeakRef tpl: TplNode
RichText
  RawText
    markers: [Marker]
    text: String
  ExprText
    expr: CustomCode | ObjectPath
    html: Bool
Var
  name: String
  @Const uuid: String
BindingStruct
  Rep
    element: Var
    index: Var?
    # Collection[Any]
    collection: CustomCode | ObjectPath
  Param
    variable: Var
    @Const uuid: String
    # When the type is Any,String,Bool or Num, this is used to constrain the
    # value as an enum. "Any" is used when the enum contains combination of
    # different type of values.
    enumValues: [String|Bool|Number]
    # The source of the property. If it is a number, then it resolves to
    # the ComponentPropOrigin enum; otherwise, it is free-formed.
    origin: String|Number?
    # How the Parameter is exported to code. One of three values
    #  - Internal: The parameter can be set only internally in a
    #    component, which is derived from the property or state of a component.
    #    For example, suppose a BookShelf component that display a list of books.
    #    The component has a "books: Array<Book>" property, and has an
    #    emptyBookList variant. The emptyBookList is an internal parameter that
    #    is turned on when books is empty.
    #  - External: the parameter is generated as a property of the component.
    #  - ToolsOnly: the parameters is used in Plasmic only, i.e.
    #    the are not used for code generation. One example is for VariantGroups
    #    that are used for design only.
    exportType: 'Internal' | 'External' | 'ToolsOnly'
    defaultExpr: Expr?
    previewExpr: Expr?
    # The uncontrolled prop where we should map the values to. For example,
    # if a code component has props "open" and "defaultOpen", we might want
    # to create a "open" param to manipulate the component in the Studio, but
    # set the propEffect to be "defaultOpen" so the value passed in Studio
    # will be mapped to it in codegen.
    propEffect: String?
    description: String?
    displayName: String?
    about: String?
    isRepeated: Bool?
    isMainContentSlot: Bool
    required: Bool
    mergeWithParent: Bool
    isLocalizable: Bool
    SlotParam
      type: RenderableType | RenderFuncType
      @Const @WeakRef tplSlot: TplSlot
    StateParam
      type: PrimitiveType | Img | HrefType | TargetType | DateString | DateRangeStrings | QueryData | StylePropType
      @Const @WeakRef state: State
    GlobalVariantGroupParam
      type: Text | BoolType | Choice | AnyType
    StateChangeHandlerParam
      type: FunctionType
      @Const @WeakRef state: State
    PropParam
      type: PrimitiveType | Img | HrefType | TargetType | DateString | DateRangeStrings | QueryData | FunctionType | StylePropType
  Arg
    @WeakRef param: Param
    expr: Expr
# Avoid using \`Expr\` as it's too generic!
Expr
  # This is really probably better named a TplExpr, if not changed into a
  # TplSlotArg (see doc/arch.txt).
  RenderExpr (concrete)
    tpl: [TplNode]
    VirtualRenderExpr
  CustomCode
    code: String
    fallback: Expr?
  DataSourceOpExpr
    parent: QueryRef?
    sourceId: String
    opId: String
    opName: String
    templates: Map[String, DataSourceTemplate]
    cacheKey: TemplatedString?
    queryInvalidation: QueryInvalidationExpr?
    # Minimum role necessary to execute this operation
    roleId: String?
  VarRef
    @WeakRef variable: Var
  TplRef
    @WeakRef tpl: TplNode
  StyleTokenRef
    @WeakRef token: StyleToken
  ImageAssetRef
    @WeakRef asset: ImageAsset
  PageHref
    @WeakRef page: Component
    params: Map[String, TemplatedString | CustomCode | ObjectPath | VarRef]
  VariantsRef
    @WeakRef variants: [Variant]
  ObjectPath
    path: [String|Number]
    fallback: Expr?
  EventHandler (concrete)
    interactions: [Interaction]
    # GenericEventHandler is used for EventHandler exprs that are embedded in
    # JSON types; it holds a copy of the arguments that it is supposed to
    # be called with.  See HandlerSection.ensureGenericFuncTypes() for more
    # details.
    GenericEventHandler
      handlerType: FunctionType
  FunctionArg (concrete)
    @Const uuid: String
    @WeakRef argType: ArgType
    expr: Expr
    # FunctionArg makes a WeakRef to ArgType, which only works if
    # the FunctionType that owns ArgType is stored in the model.
    # If not, then use StrongFunctionArg, which owns its
    # ArgType
    StrongFunctionArg
      argType: ArgType
  CollectionExpr
    exprs: [Expr?]
  MapExpr
    mapExpr: Map[String, Expr]
  StyleExpr
    uuid: String
    styles: [SelectorRuleSet]
  TemplatedString
    text: [String|ObjectPath|CustomCode]
  FunctionExpr
    argNames: [String]
    bodyExpr: Expr
  QueryInvalidationExpr
    invalidationQueries: [QueryRef|String]
    invalidationKeys: CustomCode?|ObjectPath?
  CompositeExpr
    hostLiteral: String
    substitutions: Map[String, Expr]

SelectorRuleSet
  rs: RuleSet
  selector: String?
LabeledSelector
  selector: String
  label: String?
  defaultStyles: Map[String, String]

DataSourceTemplate
  # RawType from data-sources.ts
  fieldType: String
  value: TemplatedString | String
  bindings: Map[String, TemplatedString | CustomCode | ObjectPath]?
QueryRef
  @WeakRef ref: TplNode|ComponentDataQuery

State (concrete)
  @Const @WeakRef param: StateParam
  accessType: 'private' | 'readonly' | 'writable'
  variableType: 'text' | 'number' |'boolean' | 'array' | 'object' | 'variant' | 'dateString' | 'dateRangeStrings'
  # onChangeParam should be a StateChangeHandlerParam, except for code / plume
  # components since the event handlers are registered as normal props
  # and can be used as change handlers for multiple states
  @Const @WeakRef onChangeParam: StateChangeHandlerParam | PropParam
  # implicit state
  @WeakRef tplNode: TplComponent? | TplTag?
  @WeakRef implicitState: State?
  NamedState
    # There are two cases where we use NamedState: code component
    # states and TplTag implicit states. For others (Plasmic explicit
    # states and TplComponent implicit states), we use 'param' for
    # both value prop and state name.
    variableType: 'text' | 'number' |'boolean' | 'array' | 'object' | 'dateString' | 'dateRangeStrings'
    name: String
  VariantGroupState
    @Const @WeakRef variantGroup: ComponentVariantGroup

Split
  @Const uuid: String
  name: String
  splitType: 'experiment' | 'segment' | 'schedule'
  slices: [SplitSlice]
  status: 'new' | 'running' | 'stopped'
  targetEvents: [String]
  description: String?
  externalId: String?

SplitSlice
  @Const uuid: String
  name: String
  externalId: String?
  contents: [SplitContent]

  RandomSplitSlice
    prob: Number

  SegmentSplitSlice
    # json blob like FilterClause
    cond: String

SplitContent
  # Defines the content for this split

  GlobalVariantSplitContent
    # What global variants should be activated?
    @WeakRef group: GlobalVariantGroup
    @WeakRef variant: Variant

  ComponentVariantSplitContent
    # What component variants should be activated?
    @WeakRef component: Component
    @WeakRef group: ComponentVariantGroup
    @WeakRef variant: Variant

  ComponentSwapSplitContent
    # What component should be swapped for another component?
    @WeakRef fromComponent: Component
    @WeakRef toComponent: Component

FigmaComponentMapping
  figmaComponentName: String
`;
