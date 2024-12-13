import ListItem from "@/wab/client/components/ListItem";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { EffectsPanelSection } from "@/wab/client/components/sidebar-tabs/EffectsSection";
import { LayoutSection } from "@/wab/client/components/sidebar-tabs/LayoutSection";
import { ListStyleSection } from "@/wab/client/components/sidebar-tabs/ListStyleSection";
import { PositioningPanelSection } from "@/wab/client/components/sidebar-tabs/PositioningSection";
import { ShadowsPanelSection } from "@/wab/client/components/sidebar-tabs/ShadowsSection";
import { SizeSection } from "@/wab/client/components/sidebar-tabs/SizeSection";
import { SpacingSection } from "@/wab/client/components/sidebar-tabs/SpacingSection";
import { TransformPanelSection } from "@/wab/client/components/sidebar-tabs/TransformPanelSection";
import { TransitionsPanelSection } from "@/wab/client/components/sidebar-tabs/TransitionsSection";
import { TypographySection } from "@/wab/client/components/sidebar-tabs/TypographySection";
import { BackgroundSection } from "@/wab/client/components/sidebar-tabs/background-section";
import { FindReferencesModal } from "@/wab/client/components/sidebar/FindReferencesModal";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  ItemOrGroup,
  VirtualGroupedList,
} from "@/wab/client/components/sidebar/VirtualGroupedList";
import { useDepFilterButton } from "@/wab/client/components/sidebar/left-panel-utils";
import {
  BorderPanelSection,
  BorderRadiusSection,
} from "@/wab/client/components/style-controls/BorderControls";
import { OutlinePanelSection } from "@/wab/client/components/style-controls/OutlineControls";
import {
  MixinExpsProvider,
  mkStyleComponent,
  providesStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { Matcher } from "@/wab/client/components/view-common";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import MixinIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Mixin";
import ThemeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Theme";
import PlasmicLeftMixinsPanel from "@/wab/client/plasmic/plasmic_kit/PlasmicLeftMixinsPanel";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isTokenRef } from "@/wab/commons/StyleToken";
import { MIXIN_LOWER } from "@/wab/shared/Labels";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { makeTokenRefResolver } from "@/wab/shared/cached-selectors";
import { ensure, spawn, tuple } from "@/wab/shared/common";
import { extractTransitiveDepsFromMixins } from "@/wab/shared/core/project-deps";
import { isTagListContainer } from "@/wab/shared/core/rich-text-util";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { extractMixinUsages } from "@/wab/shared/core/styles";
import { Mixin, ProjectDependency, Variant } from "@/wab/shared/model/classes";
import { naturalSort } from "@/wab/shared/sort";
import { Menu, notification } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";

function _MixinPreview(props: {
  sc: StudioCtx;
  mixin: Mixin;
  vsh: VariantedStylesHelper;
}) {
  const { sc, mixin, vsh } = props;

  const tokenRefResolver = makeTokenRefResolver(sc.site);
  // We ignore the positioning properties for the preview
  const style = Object.fromEntries(
    Object.entries(mixin.rs.values)
      .filter(([r]) => !["left", "right", "top", "bottom"].includes(r))
      .map(([r, val]) =>
        tuple(
          L.camelCase(r),
          isTokenRef(val) ? tokenRefResolver(val, vsh) : val
        )
      )
  );

  return (
    <div className="style__assets__typography__preview">
      <EditableLabel
        doubleClickToEdit
        value={mixin.preview || "Preview"}
        defaultEditing={false}
        onEdit={(newValue) =>
          spawn(sc.changeUnsafe(() => (mixin.preview = newValue)))
        }
      >
        <div style={style}>{mixin.preview || "Preview"}</div>
      </EditableLabel>
    </div>
  );
}

export const MixinPreview = observer(_MixinPreview);

export interface MixinPanelSelection {
  // Each boolean below defines whether to show the corresponding panel or not.
  typography?: boolean;
  container?: boolean;
  spacing?: boolean;
  background?: boolean;
  effect?: boolean;
  border?: boolean;
  sizing?: boolean;
  outline?: boolean;
  shadow?: boolean;
  position?: boolean;
  transition?: boolean;
  transform?: boolean;
  list?: boolean;
}

export interface MixinPopupProps {
  studioCtx: StudioCtx;
  mixin: Mixin;
  show: boolean;
  onClose: () => void;
  autoFocusTitle?: boolean;
  tag?: string;
}

const iconClass = "mixin-fg custom-svg-icon--lg monochrome-exempt";

export const MixinPopup = observer(function MixinPopup(props: MixinPopupProps) {
  const { studioCtx, mixin, tag } = props;
  const isDefaultThemeStyle = !tag && mixin.forTheme;
  return (
    <SidebarModal
      title={
        mixin.forTheme ? (
          <>
            <Icon icon={ThemeIcon} className={iconClass} />
            <div> {mixin.name} </div>
          </>
        ) : (
          <>
            <Icon icon={MixinIcon} className={iconClass} />
            <SimpleTextbox
              defaultValue={mixin.name}
              onValueChange={(name) =>
                studioCtx.changeUnsafe(() =>
                  studioCtx.tplMgr().renameMixin(mixin, name)
                )
              }
              placeholder={`(unnamed ${MIXIN_LOWER})`}
              autoFocus={props.autoFocusTitle}
              selectAllOnFocus={true}
              fontSize="xlarge"
              fontStyle="bold"
            />
          </>
        )
      }
      show={props.show}
      onClose={() => props.onClose()}
    >
      <MixinFormContent
        studioCtx={studioCtx}
        mixin={mixin}
        panelSelection={isDefaultThemeStyle ? { typography: true } : undefined}
        inheritableTypographyPropsOnly={isDefaultThemeStyle}
        isDefaultTheme={mixin.forTheme}
        isList={!!(tag && isTagListContainer(tag))}
      />
    </SidebarModal>
  );
});

export const MixinFormContent = observer(function MixinFormContent(props: {
  studioCtx: StudioCtx;
  mixin: Mixin;
  // If not defined, show all panels.
  panelSelection?: MixinPanelSelection;
  inheritableTypographyPropsOnly: boolean;
  warnOnRelativeFontUnits?: boolean;
  isDefaultTheme?: boolean;
  isList?: boolean;
  targetGlobalVariants?: Variant[];
}) {
  const {
    studioCtx,
    mixin,
    panelSelection,
    inheritableTypographyPropsOnly,
    isDefaultTheme,
    isList,
    targetGlobalVariants,
  } = props;

  const vsh = new VariantedStylesHelper(
    studioCtx.site,
    targetGlobalVariants,
    targetGlobalVariants
  );

  const expsProvider = new MixinExpsProvider(
    mixin.rs,
    studioCtx,
    /*unremovableProps=*/ [],
    !!isDefaultTheme,
    mixin,
    vsh
  );

  const styleComponent = mkStyleComponent({ expsProvider });
  const s = panelSelection;

  return providesStyleComponent(
    styleComponent,
    `${mixin.uid}`
  )(
    <>
      {(!s || s.typography) && (
        <TypographySection
          expsProvider={expsProvider}
          inheritableOnly={inheritableTypographyPropsOnly}
          warnOnRelativeUnits={props.warnOnRelativeFontUnits}
          vsh={vsh}
        />
      )}

      {isList && (!s || s.list) && (
        <ListStyleSection expsProvider={expsProvider} />
      )}

      {(!s || s.sizing) && (
        <SizeSection expsProvider={expsProvider} vsh={vsh} />
      )}

      {(!s || s.position) && (
        <PositioningPanelSection expsProvider={expsProvider} />
      )}

      {(!s || s.spacing) && (
        <SpacingSection expsProvider={expsProvider} vsh={vsh} />
      )}

      {(!s || s.container) && (
        <LayoutSection expsProvider={expsProvider} vsh={vsh} allowConvert />
      )}

      {(!s || s.background) && (
        <BackgroundSection expsProvider={expsProvider} vsh={vsh} />
      )}

      {(!s || s.border) && (
        <BorderPanelSection expsProvider={expsProvider} vsh={vsh} />
      )}

      {(!s || s.border) && (
        <BorderRadiusSection expsProvider={expsProvider} vsh={vsh} />
      )}

      {(!s || s.outline) && <OutlinePanelSection />}

      {(!s || s.shadow) && (
        <ShadowsPanelSection expsProvider={expsProvider} vsh={vsh} />
      )}

      {(!s || s.effect) && <EffectsPanelSection expsProvider={expsProvider} />}

      {(!s || s.transition) && (
        <TransitionsPanelSection expsProvider={expsProvider} />
      )}

      {(!s || s.transform) && (
        <TransformPanelSection expsProvider={expsProvider} />
      )}

      <SidebarSection title="Preview">
        <MixinPreview sc={studioCtx} mixin={mixin} vsh={vsh} />
      </SidebarSection>
    </>
  );
});

function _MixinsPanel() {
  const sc = useStudioCtx();
  const [query, setQuery] = React.useState("");
  const { filterDeps, filterProps } = useDepFilterButton({
    studioCtx: sc,
    deps: sc.site.projectDependencies.filter((d) => d.site.mixins.length > 0),
  });
  const readOnly = sc.getLeftTabPermission("mixins") === "readable";
  const matcher = new Matcher(query);

  const [editMixin, setEditMixin] = React.useState<Mixin | undefined>(
    undefined
  );

  const [justAdded, setJustAdded] = React.useState<Mixin | undefined>(
    undefined
  );

  const [findReferenceMixin, setFindReferenceMixin] = React.useState<
    Mixin | undefined
  >(undefined);

  const onDuplicate = async (mixin: Mixin) => {
    const transitiveDeps = extractTransitiveDepsFromMixins(sc.site, [mixin]);

    const badTransitiveDeps = transitiveDeps.filter((dep) =>
      sc.projectDependencyManager.getDependencyData(dep.pkgId)
    );

    if (badTransitiveDeps.length > 0) {
      notification.error({
        message: `Before duplicating this ${MIXIN_LOWER} you have to update your imported projects: ${badTransitiveDeps
          .map((dep) => dep.name)
          .join(", ")}`,
      });
      return;
    }

    if (
      !(await sc
        .siteOps()
        .maybePromptForTransitiveImports(
          <>
            The mixin you are cloning uses tokens from the following projects.
            To clone this mixin, you will also need to import these projects.
            Are you sure you want to continue?
          </>,
          transitiveDeps
        ))
    ) {
      return;
    }
    await sc.changeUnsafe(() => {
      for (const dep of transitiveDeps) {
        sc.projectDependencyManager.addTransitiveDepAsDirectDep(dep);
      }
      const newMixin = sc.tplMgr().duplicateMixin(mixin);
      setEditMixin(newMixin);
      setJustAdded(newMixin);
    });
  };

  const onDelete = async (mixin: Mixin) => {
    await sc.siteOps().tryDeleteMixins([mixin]);
  };

  const addMixin = async () => {
    return sc.changeUnsafe(() => {
      const mixin = sc.tplMgr().addMixin();
      setJustAdded(mixin);
      setEditMixin(mixin);
    });
  };

  const onSelect = (mixin: Mixin) => setEditMixin(mixin);

  const onFindReferences = (mixin: Mixin) => {
    setFindReferenceMixin(mixin);
  };

  const makeMixinsItems = (mixins: Mixin[]) => {
    mixins = mixins.filter(
      (mixin) => matcher.matches(mixin.name) || justAdded === mixin
    );
    mixins = naturalSort(mixins, (mixin) => mixin.name);
    return mixins.map((mixin) => ({
      type: "item" as const,
      item: mixin,
      key: mixin.uuid,
    }));
  };

  const makeDepsItems = (deps: ProjectDependency[]) => {
    deps = deps.filter(
      (dep) => filterDeps.length === 0 || filterDeps.includes(dep)
    );
    deps = naturalSort(deps, (dep) =>
      sc.projectDependencyManager.getNiceDepName(dep)
    );
    return deps.map((dep) => ({
      type: "group" as const,
      key: dep.uuid,
      group: dep,
      items: makeMixinsItems(dep.site.mixins),
      defaultCollapsed: true,
    }));
  };

  const items: ItemOrGroup<ProjectDependency, Mixin>[] = [
    ...(filterDeps.length === 0 ? [...makeMixinsItems(sc.site.mixins)] : []),
    ...makeDepsItems(
      sc.site.projectDependencies.filter((d) => !isHostLessPackage(d.site))
    ),
    ...makeDepsItems(
      sc.site.projectDependencies.filter((d) => isHostLessPackage(d.site))
    ),
  ];

  const editableMixins = new Set(sc.site.mixins);

  return (
    <>
      <PlasmicLeftMixinsPanel
        leftSearchPanel={{
          searchboxProps: {
            value: query,
            onChange: (e) => setQuery(e.target.value),
            autoFocus: true,
          },
          filterProps,
        }}
        newMixinButton={
          readOnly
            ? { render: () => null }
            : {
                onClick: () => addMixin(),
              }
        }
        content={
          <>
            <VirtualGroupedList
              items={items}
              renderItem={(mixin) => (
                <MixinRow
                  mixin={mixin}
                  sc={sc}
                  matcher={matcher}
                  onDuplicate={readOnly ? undefined : () => onDuplicate(mixin)}
                  onFindReferences={() => onFindReferences(mixin)}
                  readOnly={readOnly || !editableMixins.has(mixin)}
                  onDelete={
                    !readOnly && editableMixins.has(mixin)
                      ? () => onDelete(mixin)
                      : undefined
                  }
                  onClick={
                    !readOnly && editableMixins.has(mixin)
                      ? () => onSelect(mixin)
                      : undefined
                  }
                />
              )}
              itemHeight={32}
              renderGroupHeader={(dep) =>
                `Imported from "${sc.projectDependencyManager.getNiceDepName(
                  dep
                )}"`
              }
              headerHeight={50}
              hideEmptyGroups
              forceExpandAll={matcher.hasQuery() || filterDeps.length > 0}
            />
          </>
        }
      />

      {editMixin && (
        <MixinPopup
          mixin={editMixin}
          studioCtx={sc}
          show={true}
          onClose={() => {
            setEditMixin(undefined);
            setJustAdded(undefined);
          }}
          autoFocusTitle={editMixin === justAdded}
        />
      )}

      {findReferenceMixin && (
        <FindReferencesModal
          studioCtx={sc}
          displayName={findReferenceMixin.name}
          icon={<Icon icon={MixinIcon} className={iconClass} />}
          usageSummary={extractMixinUsages(sc.site, findReferenceMixin)[1]}
          onClose={() => {
            setFindReferenceMixin(undefined);
          }}
        />
      )}
    </>
  );
}

export const MixinsPanel = observer(_MixinsPanel);

const MixinRow = observer(function MixinRow(props: {
  mixin: Mixin;
  sc: StudioCtx;
  onDuplicate?: () => void;
  onFindReferences: () => void;
  onDelete?: () => void;
  matcher: Matcher;
  readOnly?: boolean;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) {
  const { mixin, matcher, readOnly, onClick, isDragging, dragHandleProps } =
    props;

  const renderMenu = () => {
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item key="references" onClick={() => props.onFindReferences()}>
          Find all references
        </Menu.Item>
      );
      if (props.onDuplicate) {
        push(
          <Menu.Item key="clone" onClick={() => props.onDuplicate!()}>
            Duplicate
          </Menu.Item>
        );
      }

      if (!readOnly && props.onDelete) {
        push(
          <Menu.Item
            key="delete"
            onClick={() =>
              ensure(
                props.onDelete,
                `props.onDelete must exist for this menu item to exist`
              )()
            }
          >
            Delete
          </Menu.Item>
        );
      }
    });
    return builder.build({
      onMenuClick: (e) => e.domEvent.stopPropagation(),
      menuName: "mixin-item-menu",
    });
  };
  return (
    <ListItem
      menu={renderMenu}
      onClick={onClick}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
      isDraggable={!readOnly}
      icon={<Icon icon={MixinIcon} />}
    >
      {matcher.boldSnippets(mixin.name)}
    </ListItem>
  );
});

export const EditMixinButton = observer(function EditMixinButton(props: {
  mixin: Mixin;
  className?: string;
  children?: React.ReactNode;
  onShowPopup?: (editing: boolean) => void;
  tag?: string;
}) {
  const { mixin, className, children, tag } = props;
  const studioCtx = useStudioCtx();
  const [editing, setEditing] = React.useState(false);

  return (
    <>
      <button
        className={className}
        onClick={() => {
          setEditing(true);
          props.onShowPopup && props.onShowPopup(true);
        }}
      >
        {children}
      </button>
      {editing && (
        <MixinPopup
          mixin={mixin}
          show={true}
          onClose={() => {
            setEditing(false);
            props.onShowPopup && props.onShowPopup(false);
          }}
          studioCtx={studioCtx}
          tag={tag}
        />
      )}
    </>
  );
});
