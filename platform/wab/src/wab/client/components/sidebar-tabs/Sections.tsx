import {
  ensureKnownTplComponent,
  isKnownClassNamePropType,
  TplComponent,
  TplNode,
  TplTag,
} from "@/wab/classes";
import {
  hasSimplifiedMode,
  isTplCodeComponentStyleable,
} from "@/wab/client/code-components/code-components";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  BorderPanelSection,
  BorderRadiusSection,
} from "@/wab/client/components/style-controls/BorderControls";
import {
  ExpsProvider,
  mkStyleComponent,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { asOne, assert, ensure, ensureArray } from "@/wab/common";
import {
  getComponentDisplayName,
  isCodeComponent,
  isCodeComponentTpl,
  isPageComponent,
} from "@/wab/components";
import { DEVFLAGS, DevFlagsType } from "@/wab/devflags";
import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import { isTagListContainer } from "@/wab/shared/core/rich-text-util";
import { isGridTag } from "@/wab/shared/grid-utils";
import {
  getAncestorSlotArg,
  getAncestorTplSlot,
  isTypographyNode,
} from "@/wab/shared/SlotUtils";
import { canEditStyleSection } from "@/wab/shared/ui-config-utils";
import { getApplicableSelectors } from "@/wab/styles";
import {
  canToggleVisibility,
  EventHandlerKeyType,
  getAllEventHandlerOptions,
  hasTextAncestor,
  isComponentRoot,
  isSizable,
  isTplCodeComponent,
  isTplColumn,
  isTplColumns,
  isTplComponent,
  isTplContainer,
  isTplIcon,
  isTplImage,
  isTplSlot,
  isTplTag,
  isTplTextBlock,
  isTplVariantable,
  TplColumnsTag,
  TplColumnTag,
} from "@/wab/tpls";
import { ValComponent } from "@/wab/val-nodes";
import { Alert } from "antd";
import $ from "jquery";
import { observer } from "mobx-react";
import * as React from "react";
import { BackgroundSection } from "./background-section";
import { ColumnSection, ColumnsPanelSection } from "./columns-section";
import { ComponentPropsSection } from "./ComponentPropsSection";
import { CustomBehaviorsSection } from "./CustomBehaviorsSection";
import { EffectsPanelSection } from "./EffectsSection";
import { GridChildSection } from "./GridChildSection";
import { HTMLAttributesSection, TplTagSection } from "./HTMLAttributesSection";
import { ImageSection, ImageSectionForCodeComponent } from "./image-section";
import { LayoutSection } from "./LayoutSection";
import { ListStyleSection } from "./ListStyleSection";
import {
  MergedSlotsPropsSection,
  MergedSlotsTextSection,
} from "./MergedSlotsSection";
import { MixinsSection } from "./MixinsSection";
import { OverflowSection } from "./OverflowSection";
import { PositioningPanelSection } from "./PositioningSection";
import { PrivateStyleVariantsPanel } from "./private-style-variants-section";
import { RepeaterSection } from "./RepeaterSection";
import { RepeatingElementSection } from "./RepeatingElementSection";
import { ShadowsPanelSection } from "./ShadowsSection";
import { SimplifiedCodeComponentModeSection } from "./SimplifiedCodeComponentModeSection";
import {
  PageSizePanelSection,
  SizeSection,
  SizeWidthOnlySection,
} from "./SizeSection";
import { SlotSettingsSection } from "./slot-section";
import { SpacingSection } from "./SpacingSection";
import InteractionsSection from "./StateManagement/InteractionsSection";
import { TransformPanelSection } from "./TransformPanelSection";
import { TransitionsPanelSection } from "./TransitionsSection";
import { TextOnlySection, TypographySection } from "./TypographySection";
import { VariantsPickerPanel } from "./VariantsPicker";
import { VisibilitySection } from "./VisibilitySection";

export enum Section {
  Tag = "tag",
  RepeatingElement = "repeating-element",
  CustomBehaviors = "custom-behavior",
  HTMLAttributes = "html-attributes",
  PrivateStyleVariants = "private-style-variants",
  ComponentProps = "component-props",
  ComponentStyleProps = "component-style-props",
  VariantsPicker = "variants-picker",
  MissingPositionClass = "missing-position-class",
  Mixins = "mixins",
  Repeater = "repeater",
  Visibility = "visibility",
  Column = "column",
  ColumnsPanel = "columns-panel",
  GridChild = "grid-child",
  Size = "size",
  SizeWidthOnly = "size-width",
  ImageCodeComponent = "image-code-component",
  Image = "image",
  ListStyle = "list-style",
  Typography = "typography",
  TextContentOnly = "text",
  ComponentMergedSlotProps = "component-merged-slots-props",
  ComponentMergedSlotText = "component-merged-slots-text",
  ComponentMergedSlotTypography = "component-merged-slots-typography",
  PositioningPanel = "positioning-panel",
  Spacing = "spacing",
  Layout = "layout",
  Overflow = "overflow",
  Background = "background",
  Border = "border",
  ShadowsPanel = "shadows-panel",
  EffectsPanel = "effects-panel",
  TransitionsPanel = "transitions-panel",
  TransformPanel = "transform-panel",
  Interactions = "interactions",
  SlotSettings = "slot-settings",
  SimplifiedCodeComponentMode = "simplified-cc-mode",
}

type AllSectionsPresent<T> = {
  [k in Section]: T;
};

/**
 * Sets the visibility option for a Section
 */
interface SectionSetting {
  /**
   * If specified, then its visibility depends on how it is configured in UiConfig.
   * If undefined, then its visibility is not configurable and depends on
   * defaultContentEditorVisible
   */
  publicSection: PublicStyleSection | undefined;

  /**
   * If this section has no PublicStyleSection, or its PublicStyleSection config is
   * set to "default", then this configures whether it is by default visible to
   * a content editor
   */
  defaultContentEditorVisible?: boolean;
}

const SECTION_SETTINGS: AllSectionsPresent<SectionSetting> = {
  [Section.Typography]: {
    publicSection: PublicStyleSection.Typography,
  },
  [Section.TextContentOnly]: {
    publicSection: PublicStyleSection.Typography,
  },
  [Section.ComponentMergedSlotText]: {
    publicSection: PublicStyleSection.Typography,
  },
  [Section.ComponentMergedSlotTypography]: {
    publicSection: PublicStyleSection.Typography,
  },
  [Section.Visibility]: { publicSection: PublicStyleSection.Visibility },
  [Section.Background]: { publicSection: PublicStyleSection.Background },
  [Section.ShadowsPanel]: { publicSection: PublicStyleSection.Shadows },
  [Section.Layout]: { publicSection: PublicStyleSection.Layout },
  [Section.GridChild]: { publicSection: PublicStyleSection.Layout },
  [Section.Column]: { publicSection: PublicStyleSection.Layout },
  [Section.ColumnsPanel]: { publicSection: PublicStyleSection.Layout },
  [Section.Spacing]: { publicSection: PublicStyleSection.Spacing },
  [Section.PositioningPanel]: { publicSection: PublicStyleSection.Positioning },
  [Section.TransformPanel]: { publicSection: PublicStyleSection.Transform },
  [Section.Size]: { publicSection: PublicStyleSection.Sizing },
  [Section.SizeWidthOnly]: { publicSection: PublicStyleSection.Sizing },
  [Section.TransitionsPanel]: { publicSection: PublicStyleSection.Transitions },
  [Section.Overflow]: { publicSection: PublicStyleSection.Overflow },
  [Section.Border]: { publicSection: PublicStyleSection.Border },
  [Section.EffectsPanel]: { publicSection: PublicStyleSection.Effects },
  [Section.MissingPositionClass]: { publicSection: PublicStyleSection.Layout },
  [Section.Interactions]: { publicSection: PublicStyleSection.Interactions },
  [Section.CustomBehaviors]: {
    publicSection: PublicStyleSection.CustomBehaviors,
  },
  [Section.RepeatingElement]: {
    publicSection: PublicStyleSection.Repetition,
  },
  [Section.Repeater]: { publicSection: PublicStyleSection.Repetition },
  [Section.Tag]: { publicSection: PublicStyleSection.HTMLAttributes },
  [Section.HTMLAttributes]: {
    publicSection: PublicStyleSection.HTMLAttributes,
  },
  [Section.PrivateStyleVariants]: {
    publicSection: PublicStyleSection.ElementStates,
  },
  [Section.Mixins]: { publicSection: PublicStyleSection.Mixins },

  // never visible to content creators
  [Section.SlotSettings]: { publicSection: undefined },

  // always visible to content creators
  [Section.ComponentProps]: {
    publicSection: undefined,
    defaultContentEditorVisible: true,
  },
  [Section.VariantsPicker]: {
    publicSection: undefined,
    defaultContentEditorVisible: true,
  },
  [Section.ComponentStyleProps]: {
    publicSection: undefined,
    defaultContentEditorVisible: true,
  },
  [Section.ImageCodeComponent]: {
    publicSection: undefined,
    defaultContentEditorVisible: true,
  },
  [Section.Image]: {
    publicSection: undefined,
    defaultContentEditorVisible: true,
  },
  [Section.ListStyle]: {
    publicSection: undefined,
    defaultContentEditorVisible: true,
  },
  [Section.ComponentMergedSlotProps]: {
    publicSection: undefined,
    defaultContentEditorVisible: true,
  },
  [Section.SimplifiedCodeComponentMode]: {
    publicSection: undefined,
    defaultContentEditorVisible: true,
  },
};

function getSectionSetting(section: Section) {
  return ensure(
    SECTION_SETTINGS[section],
    `No settings configured for section ${section}`
  );
}

//
// The following groups can duplicate certain sections - meaning we want to show this section in both tabs.
// Should do this sparingly.
//

const settingSections = new Set([
  Section.SizeWidthOnly,
  Section.Tag,
  Section.RepeatingElement,
  Section.CustomBehaviors,
  Section.HTMLAttributes,
  Section.ComponentProps,
  Section.VariantsPicker,
  Section.Repeater,
  Section.ImageCodeComponent,
  Section.Image,
  Section.Interactions,
  Section.Visibility,
  Section.TextContentOnly,
  Section.SlotSettings,
  Section.ComponentMergedSlotProps,
  Section.ComponentMergedSlotText,
  Section.SimplifiedCodeComponentMode,
]);

const styleSections = new Set([
  Section.PrivateStyleVariants,
  Section.Visibility,
  Section.MissingPositionClass,
  Section.Mixins,
  Section.ImageCodeComponent,
  Section.Image,
  Section.Column,
  Section.ColumnsPanel,
  Section.GridChild,
  Section.Size,
  Section.ListStyle,
  Section.Typography,
  Section.PositioningPanel,
  Section.Spacing,
  Section.Layout,
  Section.Overflow,
  Section.Background,
  Section.Border,
  Section.ShadowsPanel,
  Section.EffectsPanel,
  Section.TransitionsPanel,
  Section.TransformPanel,
  Section.ComponentStyleProps,
  Section.ComponentMergedSlotTypography,
]);

const isSectionActive = (section: Section, devflags: DevFlagsType) => {
  if (section === Section.TextContentOnly) {
    return devflags.rightTabs;
  }
  if (section === Section.SlotSettings) {
    return devflags.focusable;
  }
  if (section === Section.SimplifiedCodeComponentMode) {
    return devflags.simplifiedForms;
  }
  return true;
};

const htmlTagsWithAttributes = new Set([
  "a",
  "button",
  "textarea",
  "password",
  "input",
]);

export function getRenderBySection(
  tpl: TplNode,
  viewCtx: ViewCtx,
  renderOpts: Map<Section, boolean>
) {
  const isSlot = isTplSlot(tpl);
  const isTag = isTplTag(tpl);
  const isColumns = isTplColumns(tpl);
  const isColumn = isTplColumn(tpl);
  const isGridChild =
    isTplVariantable(tpl) && tpl.parent && isGridTag(tpl.parent);
  // We show container settings for TplComponent of code component.
  const codeComponentTpl = isCodeComponentTpl(tpl);
  const isContainer = isTplContainer(tpl) || codeComponentTpl;
  const isComponent = isTplComponent(tpl);
  const styleAncestorSlot = getAncestorTplSlot(tpl, false);
  const isRoot = isComponentRoot(tpl);
  const component = viewCtx.currentComponent();
  const isTypographyTpl = isTypographyNode(tpl);
  const isIcon = isTplIcon(tpl);
  const isAttachmentComp =
    isComponent &&
    isCodeComponent(tpl.component) &&
    tpl.component.codeComponentMeta.isAttachment;
  const isRichTextDescendant = hasTextAncestor(tpl);

  let options: EventHandlerKeyType[] = [];

  if (tpl.typeTag === "TplTag" || tpl.typeTag === "TplComponent") {
    options = getAllEventHandlerOptions(tpl);
  }

  const missingPositionClass = codeComponentTpl
    ? shouldAlertMissingPositionClass(viewCtx)
    : false;
  const showStyleSections = shouldShowStyleSections(
    tpl,
    viewCtx,
    missingPositionClass
  );

  const expsProvider = new TplExpsProvider(viewCtx, tpl as TplNode);
  const sc = mkStyleComponent({
    expsProvider,
  });
  const hasSize = isSizable(tpl);
  const contentEditorMode = viewCtx.studioCtx.contentEditorMode;
  const contentCreatorConfig = viewCtx.studioCtx.getCurrentUiConfig();

  const enabledStyleSections = (
    isTplCodeComponent(tpl)
      ? viewCtx.getTplCodeComponentMeta(tpl)?.styleSections
      : undefined
  ) as PublicStyleSection[] | boolean | undefined;

  const showSection = (section: Section) => {
    const setting = getSectionSetting(section);
    SECTION_SETTINGS[section];
    const publicSection = setting.publicSection;
    if (
      enabledStyleSections &&
      publicSection &&
      Array.isArray(enabledStyleSections) &&
      !enabledStyleSections.includes(publicSection) &&
      // Positioning is always enabled if styling is enabled,
      // which include `position` and `margin`
      publicSection !== PublicStyleSection.Positioning &&
      publicSection !== PublicStyleSection.Spacing
    ) {
      return false;
    }
    if (
      contentEditorMode &&
      publicSection &&
      !contentCreatorConfig.styleSectionVisibilities?.[publicSection]
    ) {
      return false;
    }
    return true;
  };

  const map = new Map([
    [
      Section.SimplifiedCodeComponentMode,
      () =>
        isComponent &&
        hasSimplifiedMode(viewCtx, tpl.component) &&
        DEVFLAGS.simplifiedForms && (
          <SimplifiedCodeComponentModeSection tpl={tpl} viewCtx={viewCtx} />
        ),
    ],
    [
      Section.RepeatingElement,
      () =>
        (isTag || isComponent) &&
        !isRoot && (
          <RepeatingElementSection
            key={`${tpl.uuid}-repeating`}
            viewCtx={viewCtx}
            tpl={tpl}
          />
        ),
    ],
    [
      Section.ComponentProps,
      () =>
        isComponent && (
          <ComponentPropsSection
            key={`${tpl.uuid}-component-props`}
            viewCtx={viewCtx}
            tpl={tpl as TplComponent}
            expsProvider={expsProvider}
            tab="settings"
          />
        ),
    ],
    [
      Section.ComponentStyleProps,
      () =>
        isComponent &&
        codeComponentTpl &&
        tpl.component.params.some((p) => isKnownClassNamePropType(p.type)) && (
          <ComponentPropsSection
            key={`${tpl.uuid}-component-props`}
            viewCtx={viewCtx}
            tpl={tpl as TplComponent}
            expsProvider={expsProvider}
            tab="style"
          />
        ),
    ],
    [
      Section.VariantsPicker,
      () =>
        isComponent && (
          <VariantsPickerPanel
            key={`${tpl.uuid}-variants-picker`}
            tpl={ensureKnownTplComponent(tpl)}
          />
        ),
    ],
    [
      Section.MissingPositionClass,
      () =>
        !showStyleSections &&
        missingPositionClass &&
        isComponent &&
        showSection(Section.MissingPositionClass) && (
          <MissingPositionClassSection
            key={`${tpl.uuid}-missing-class`}
            componentName={getComponentDisplayName(tpl.component)}
          />
        ),
    ],
    [
      Section.Size,
      () => {
        if (
          hasSize &&
          (isTag || isComponent) &&
          !isColumn &&
          showSection(Section.Size)
        ) {
          if (isRoot) {
            // For root element of page, show special size section
            if (isPageComponent(component)) {
              return (
                <PageSizePanelSection
                  key={`${tpl.uuid}-page-size`}
                  expsProvider={sc.props.expsProvider}
                />
              );
            }
          }
          // Else, show normal size section
          return (
            <SizeSection
              key={`${tpl.uuid}-size`}
              expsProvider={sc.props.expsProvider}
            />
          );
        }
        return undefined;
      },
    ],
    [
      Section.SizeWidthOnly,
      () => {
        if (
          hasSize &&
          !missingPositionClass &&
          (isTag || isComponent) &&
          !isColumn &&
          showSection(Section.SizeWidthOnly)
        ) {
          if (isRoot && isPageComponent(component)) {
            // Can't change width of page root
            return null;
          }
          // Else, show normal size section
          return (
            <SizeWidthOnlySection
              key={`${tpl.uuid}-size-width`}
              expsProvider={sc.props.expsProvider}
            />
          );
        }
        return undefined;
      },
    ],
    [
      Section.Spacing,
      () =>
        showSection(Section.Spacing) && (
          <SpacingSection
            key={`${tpl.uuid}-spacing`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.PositioningPanel,
      () =>
        (isTag || isComponent) &&
        !isRoot &&
        !isColumn &&
        !isTplTextBlock(tpl.parent) &&
        showSection(Section.PositioningPanel) && (
          <PositioningPanelSection
            key={`${tpl.uuid}-positioning`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.Visibility,
      () =>
        canToggleVisibility(tpl) &&
        showSection(Section.Visibility) && (
          <VisibilitySection
            key={`${tpl.uuid}-visibility`}
            tpl={tpl}
            viewCtx={viewCtx}
            expsProvider={expsProvider}
          />
        ),
    ],
    [
      Section.Mixins,
      () =>
        canRenderMixins(tpl, viewCtx) &&
        renderOpts.get(Section.Mixins) && (
          <MixinsSection
            key={`${tpl.uuid}-mixins`}
            tpl={tpl}
            viewCtx={viewCtx}
          />
        ),
    ],
    [
      Section.PrivateStyleVariants,
      () =>
        canRenderPrivateStyleVariants(tpl, viewCtx) &&
        renderOpts.get(Section.PrivateStyleVariants) && (
          // Cannot have private variants if you are default slot content,
          // as default slot content can only target base variant
          <PrivateStyleVariantsPanel
            key={`${tpl.uuid}-private-variants`}
            tpl={tpl as TplTag}
            viewCtx={viewCtx}
            studioCtx={expsProvider.studioCtx}
          />
        ),
    ],
    [
      Section.CustomBehaviors,
      () =>
        DEVFLAGS.ccAttachs &&
        isTplVariantable(tpl) &&
        !isColumn &&
        !isComponentRoot(tpl) &&
        !isAttachmentComp &&
        !isSlot &&
        showSection(Section.CustomBehaviors) &&
        !isRichTextDescendant && (
          <CustomBehaviorsSection
            key={`${tpl.uuid}-custom-behaviors`}
            tpl={tpl}
            viewCtx={viewCtx}
          />
        ),
    ],
    [
      Section.Repeater,
      () =>
        isTplComponent(tpl.parent) &&
        getAncestorSlotArg(tpl)?.arg.param.isRepeated && (
          <RepeaterSection
            key={`${tpl.uuid}-repeater`}
            tpl={tpl}
            viewCtx={viewCtx}
          />
        ),
    ],
    [
      Section.Column,
      () =>
        isColumn &&
        showSection(Section.Column) && (
          <ColumnSection
            key={`${tpl.uuid}-column`}
            viewCtx={viewCtx}
            tpl={tpl as TplColumnTag}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.ColumnsPanel,
      () =>
        isColumns &&
        showSection(Section.ColumnsPanel) && (
          <ColumnsPanelSection
            key={`${tpl.uuid}-columns`}
            studioCtx={viewCtx.studioCtx}
            expsProvider={sc.props.expsProvider}
            tpl={tpl as TplColumnsTag}
          />
        ),
    ],
    [
      Section.GridChild,
      () =>
        isGridChild &&
        showSection(Section.GridChild) && (
          <GridChildSection
            key={`${tpl.uuid}-grid-child`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.ImageCodeComponent,
      () =>
        isComponent &&
        isCodeComponent(tpl.component) &&
        isImageCodeComponent(viewCtx) && (
          <ImageSectionForCodeComponent
            key={`${tpl.uuid}-image-code-component`}
            expsProvider={sc.props.expsProvider as TplExpsProvider}
          />
        ),
    ],
    [
      Section.Image,
      () =>
        isTplImage(tpl) && (
          <ImageSection
            key={`${tpl.uuid}-image`}
            expsProvider={sc.props.expsProvider as TplExpsProvider}
            ancestorSlot={styleAncestorSlot}
          />
        ),
    ],
    [
      Section.ListStyle,
      () =>
        isTag &&
        isTagListContainer(tpl.tag) && (
          <ListStyleSection
            key={`${tpl.uuid}-list`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.Typography,
      () =>
        isTypographyTpl &&
        !isIcon &&
        showSection(Section.Typography) && (
          <TypographySection
            key={`${tpl.uuid}-typography`}
            expsProvider={sc.props.expsProvider}
            ancestorSlot={styleAncestorSlot}
            inheritableOnly={false}
            viewCtx={viewCtx}
          />
        ),
    ],
    [
      Section.TextContentOnly,
      () =>
        hasTextContent(tpl) &&
        showSection(Section.Typography) && (
          <TextOnlySection
            key={`${tpl.uuid}-text`}
            expsProvider={sc.props.expsProvider}
            viewCtx={viewCtx}
          />
        ),
    ],
    [
      Section.Layout,
      () =>
        isContainer &&
        showSection(Section.Layout) && (
          <LayoutSection
            key={`${tpl.uuid}-layout`}
            expsProvider={sc.props.expsProvider}
            isCodeComponentTpl={codeComponentTpl}
            allowConvert
          />
        ),
    ],
    [
      Section.Overflow,
      () =>
        shouldShowOverflowControl(expsProvider) &&
        showSection(Section.Overflow) && (
          <OverflowSection
            key={`${tpl.uuid}-overflow`}
            expsProvider={expsProvider}
          />
        ),
    ],
    [
      Section.Background,
      () =>
        (isTag || codeComponentTpl) &&
        showSection(Section.Background) &&
        !isTplImage(tpl) && (
          <BackgroundSection
            key={`${tpl.uuid}-background`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.Border,
      () =>
        (isTag || codeComponentTpl) &&
        showSection(Section.Border) && (
          <React.Fragment key={`${tpl.uuid}-border`}>
            <BorderPanelSection
              key={`${tpl.uuid}-border-width`}
              expsProvider={sc.props.expsProvider}
            />
            <BorderRadiusSection
              key={`${tpl.uuid}-border-radius`}
              expsProvider={sc.props.expsProvider}
            />
          </React.Fragment>
        ),
    ],
    [
      Section.ShadowsPanel,
      () =>
        (isTag || codeComponentTpl) &&
        showSection(Section.ShadowsPanel) && (
          <ShadowsPanelSection
            key={`${tpl.uuid}-shadow`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.EffectsPanel,
      () =>
        (isTag || codeComponentTpl) &&
        showSection(Section.EffectsPanel) && (
          <EffectsPanelSection
            key={`${tpl.uuid}-effects`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.TransitionsPanel,
      () =>
        (isSlot || isComponent || codeComponentTpl || isTag) &&
        isTplVariantable(tpl) &&
        showSection(Section.TransitionsPanel) && (
          <TransitionsPanelSection
            key={`${tpl.uuid}-transitions`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.TransformPanel,
      () =>
        (isTag || isComponent || codeComponentTpl) &&
        showSection(Section.TransformPanel) && (
          <TransformPanelSection
            key={`${tpl.uuid}-transform`}
            expsProvider={sc.props.expsProvider}
          />
        ),
    ],
    [
      Section.Tag,
      () =>
        isTag && (
          <TplTagSection
            key={`${tpl.uuid}-tag`}
            viewCtx={viewCtx}
            tpl={tpl as TplTag}
          />
        ),
    ],
    [
      Section.HTMLAttributes,
      () =>
        isTag && (
          <HTMLAttributesSection
            key={`${tpl.uuid}-html-attrs`}
            viewCtx={viewCtx}
            tpl={tpl as TplTag}
            expsProvider={expsProvider}
            component={component}
          />
        ),
    ],
    [
      Section.SlotSettings,
      () => isSlot && <SlotSettingsSection expsProvider={expsProvider} />,
    ],
    [
      Section.ComponentMergedSlotProps,
      () =>
        isTplComponent(tpl) && (
          <MergedSlotsPropsSection tpl={tpl} viewCtx={viewCtx} tab="settings" />
        ),
    ],
    [
      Section.ComponentMergedSlotText,
      () =>
        isTplComponent(tpl) && (
          <MergedSlotsTextSection tpl={tpl} viewCtx={viewCtx} tab="settings" />
        ),
    ],
    [
      Section.ComponentMergedSlotTypography,
      () =>
        isTplComponent(tpl) && (
          <MergedSlotsTextSection tpl={tpl} viewCtx={viewCtx} tab="style" />
        ),
    ],
    ...(isTplVariantable(tpl)
      ? ([
          [
            Section.Interactions,
            () =>
              (isTag || isComponent) &&
              options.length > 0 && (
                <InteractionsSection
                  key={`${tpl.uuid}-interactions`}
                  sc={viewCtx.studioCtx}
                  component={component}
                  tpl={tpl}
                  vc={viewCtx}
                />
              ),
          ],
        ] as const)
      : []),
  ]);

  return new Map(
    [...map.entries()].map(([name, render]) => [
      name,
      () =>
        (showStyleSections ||
          !isStyleSection(name) ||
          name === Section.MissingPositionClass ||
          name === Section.ComponentStyleProps) &&
        render(),
    ])
  );
}

function getOrderedSections(tpl: TplNode, viewCtx: ViewCtx): Set<Section> {
  const orderedSections = new Set<Section>();

  const pushIfNew = (...sections: Section[]) => {
    sections.forEach((section) => {
      if (!orderedSections.has(section)) {
        orderedSections.add(section);
      }
    });
  };

  if (isTplCodeComponent(tpl) && !isTplCodeComponentStyleable(viewCtx, tpl)) {
    // This code component explicitly opted out of styles
    pushIfNew(Section.Visibility);
    if (tpl.component.codeComponentMeta.isRepeatable) {
      pushIfNew(Section.RepeatingElement);
    }
    pushIfNew(Section.ComponentProps);
    pushIfNew(Section.CustomBehaviors);
    pushIfNew(Section.Interactions);
    pushIfNew(Section.ComponentStyleProps);
    return orderedSections;
  }

  // Top Sections
  pushIfNew(Section.PrivateStyleVariants);
  pushIfNew(Section.Mixins);
  pushIfNew(Section.Visibility);
  pushIfNew(Section.RepeatingElement);
  pushIfNew(Section.SizeWidthOnly);

  if (viewCtx.appCtx.appConfig.simplifiedForms) {
    pushIfNew(Section.SimplifiedCodeComponentMode);
  }
  // Priority Sections
  if (isTplImage(tpl)) {
    pushIfNew(Section.Image);
  }
  if (
    isTplComponent(tpl) &&
    isCodeComponent(tpl.component) &&
    isImageCodeComponent(viewCtx)
  ) {
    pushIfNew(Section.ImageCodeComponent);
  }
  if (isTplTextBlock(tpl)) {
    pushIfNew(Section.Tag);
  }
  if (isTplTag(tpl) && htmlTagsWithAttributes.has(tpl.tag)) {
    pushIfNew(Section.HTMLAttributes);
  }
  if (isTplTag(tpl) && isTagListContainer(tpl.tag)) {
    pushIfNew(Section.ListStyle);
  }
  if (isTplComponent(tpl)) {
    pushIfNew(Section.ComponentProps, Section.VariantsPicker);
  }
  if (isTypographyNode(tpl)) {
    pushIfNew(Section.Typography);
    if (viewCtx.appCtx.appConfig.rightTabs) {
      pushIfNew(Section.TextContentOnly);
    }
  }
  if (isTplContainer(tpl)) {
    pushIfNew(
      Section.Size,
      Section.Layout,
      Section.Spacing,
      Section.Overflow,
      Section.Background
    );
  }
  if (isTplColumn(tpl)) {
    pushIfNew(Section.Column, Section.Spacing, Section.Background);
  }
  if (isTplColumns(tpl)) {
    pushIfNew(
      Section.Size,
      Section.ColumnsPanel,
      Section.Spacing,
      Section.Overflow,
      Section.Background
    );
  }
  if (isTplVariantable(tpl) && tpl.parent && isGridTag(tpl.parent)) {
    pushIfNew(Section.GridChild);
  }

  pushIfNew(Section.Interactions);
  if (isTplComponent(tpl)) {
    pushIfNew(Section.ComponentMergedSlotText);
    pushIfNew(Section.ComponentMergedSlotTypography);
  }

  // All sections with generic ordering
  pushIfNew(Section.ComponentProps);
  pushIfNew(Section.ComponentStyleProps);
  pushIfNew(Section.VariantsPicker);
  pushIfNew(Section.ComponentMergedSlotProps);
  pushIfNew(Section.MissingPositionClass);
  pushIfNew(Section.Size);
  pushIfNew(Section.Spacing);
  pushIfNew(Section.PositioningPanel);
  pushIfNew(Section.Repeater);
  pushIfNew(Section.Column);
  pushIfNew(Section.ColumnsPanel);
  pushIfNew(Section.GridChild);
  pushIfNew(Section.ImageCodeComponent);
  pushIfNew(Section.Image);
  pushIfNew(Section.ListStyle);
  pushIfNew(Section.Typography);
  if (viewCtx.appCtx.appConfig.rightTabs) {
    pushIfNew(Section.TextContentOnly);
  }
  pushIfNew(Section.Layout);
  pushIfNew(Section.Overflow);
  pushIfNew(Section.Background);
  pushIfNew(Section.Border);
  pushIfNew(Section.ShadowsPanel);
  pushIfNew(Section.EffectsPanel);
  pushIfNew(Section.TransitionsPanel);
  pushIfNew(Section.TransformPanel);
  pushIfNew(Section.Tag);
  pushIfNew(Section.HTMLAttributes);

  pushIfNew(Section.CustomBehaviors);
  if (viewCtx.appCtx.appConfig.focusable) {
    pushIfNew(Section.SlotSettings);
  }

  pushIfNew(Section.ComponentMergedSlotText);
  pushIfNew(Section.ComponentMergedSlotTypography);
  pushIfNew(Section.ComponentMergedSlotProps);

  const activeSections = Object.values(Section).filter((section) =>
    isSectionActive(section as Section, viewCtx.appCtx.appConfig)
  );
  assert(
    orderedSections.size === activeSections.length,
    () =>
      `All sections should be ordered; missing ${Array.from(orderedSections)
        .filter((s) => !activeSections.includes(s))
        .join(", ")}, extras ${activeSections
        .filter((s) => !orderedSections.has(s))
        .join(", ")}`
  );
  return orderedSections;
}

function isSettingsSection(section: Section): boolean {
  return settingSections.has(section);
}

function isStyleSection(section: Section): boolean {
  return styleSections.has(section);
}

export type StyleTabFilter = "all" | "style-only" | "settings-only";

export function getOrderedSectionRender(
  tpl: TplNode,
  viewCtx: ViewCtx,
  renderOpts: Map<Section, boolean>,
  styleTabFilter: StyleTabFilter
) {
  const renderBySection = getRenderBySection(tpl, viewCtx, renderOpts);
  const orderedSections = getOrderedSections(tpl, viewCtx);
  return [...orderedSections]
    .filter(
      (section) =>
        canEditSection(viewCtx.studioCtx, section) &&
        ((styleTabFilter === "style-only" && isStyleSection(section)) ||
          (styleTabFilter === "settings-only" && isSettingsSection(section)))
    )
    .map((section) =>
      ensure(
        renderBySection.get(section),
        "All sections should have a render function"
      )
    );
}

function isImageCodeComponent(vc: ViewCtx) {
  const selectable = vc.focusedSelectable();
  if (selectable instanceof ValComponent) {
    const $doms =
      ensureArray(vc.renderState.sel2dom(selectable, vc.canvasCtx)) ?? [];
    return $doms.length > 0 && $doms.every((el) => el?.tagName === "IMG");
  }
  return false;
}

function shouldAlertMissingPositionClass(vc: ViewCtx) {
  const selectable = vc.focusedSelectable();
  if (selectable instanceof ValComponent) {
    // Subscribe to changes to the DOM elt
    vc.focusedDomElt();
    return isCodeComponentMissingPositionClass(vc, selectable);
  }
  return false;
}

/**
 * Always show style sections, unless it's a code component that
 * - has missing className, so can't be styled at all, and does
 * not specify `styleSections: true`
 * - explicitly specified `styleSections: false` in registration
 */
function shouldShowStyleSections(
  tpl: TplNode,
  viewCtx: ViewCtx,
  missingPositionClass: boolean
) {
  if (isTplCodeComponent(tpl)) {
    if (viewCtx.getTplCodeComponentMeta(tpl)?.styleSections === true) {
      return true;
    }
    if (missingPositionClass) {
      // className not being used
      return false;
    }
    if (!isTplCodeComponentStyleable(viewCtx, tpl)) {
      return false;
    }
  }
  return true;
}

export function isCodeComponentMissingPositionClass(
  vc: ViewCtx,
  val: ValComponent
) {
  const $doms = $(asOne(vc.renderState.sel2dom(val, vc.canvasCtx)) ?? []);
  if ($doms?.length && isCodeComponent(val.tpl.component)) {
    const positionClassesSelector = val.className
      ?.split(" ")
      .map((className) => `.${className}`)
      .join("");
    if (positionClassesSelector && !$doms.is(positionClassesSelector)) {
      return true;
    }
  }
  return false;
}

const MissingPositionClassSection = observer(
  function MissingPositionClassSection(props: { componentName: string }) {
    return (
      <SidebarSection>
        <div className="panel-row mt-lg">
          <Alert
            type="warning"
            message="Not able to style code component"
            description={
              <p>
                <strong>
                  Component {props.componentName} does not support styling
                </strong>
                <br />
                It looks like the code component {props.componentName} does not
                make use of a "className" prop, so you cannot set styles on the
                component.
              </p>
            }
          />
        </div>
      </SidebarSection>
    );
  }
);

function shouldShowOverflowControl(expsProvider: ExpsProvider) {
  if (expsProvider instanceof TplExpsProvider) {
    return (
      isTplContainer(expsProvider.tpl) ||
      isTplColumns(expsProvider.tpl) ||
      isTplColumn(expsProvider.tpl) ||
      (isTplComponent(expsProvider.tpl) &&
        isCodeComponent(expsProvider.tpl.component))
    );
  }
  return true;
}

export function canEditSection(studioCtx: StudioCtx, section: Section) {
  const uiConfig = studioCtx.getCurrentUiConfig();
  const sectionSetting = getSectionSetting(section);
  const publicSection = sectionSetting.publicSection;
  const isContentCreator = studioCtx.contentEditorMode;
  if (!publicSection) {
    return isContentCreator
      ? !!sectionSetting.defaultContentEditorVisible
      : true;
  } else {
    return canEditStyleSection(uiConfig, publicSection, {
      isContentCreator,
      defaultContentEditorVisible: sectionSetting.defaultContentEditorVisible,
    });
  }
}

export function canRenderMixins(
  tpl: TplNode,
  viewCtx: ViewCtx
): tpl is TplNode {
  const missingPositionClass = isCodeComponentTpl(tpl)
    ? shouldAlertMissingPositionClass(viewCtx)
    : false;
  const showStyleSections = shouldShowStyleSections(
    tpl,
    viewCtx,
    missingPositionClass
  );

  return (
    isTplVariantable(tpl) &&
    showStyleSections &&
    canEditSection(viewCtx.studioCtx, Section.Mixins)
  );
}

export function canRenderPrivateStyleVariants(
  tpl: TplNode,
  viewCtx: ViewCtx
): tpl is TplTag {
  const ancestorSlot = getAncestorTplSlot(tpl, true);
  return (
    isTplTag(tpl) &&
    !ancestorSlot &&
    getApplicableSelectors(tpl.tag, true, isComponentRoot(tpl)).length !== 0 &&
    canEditSection(viewCtx.studioCtx, Section.PrivateStyleVariants)
  );
}

function hasTextContent(tpl: TplNode) {
  return isTplTextBlock(tpl);
}
