import { ArenaFrame, Component, Mixin, StyleToken } from "@/wab/classes";
import ListSectionSeparator from "@/wab/client/components/ListSectionSeparator";
import { menuSection } from "@/wab/client/components/menu-builder";
import { MixinPopup } from "@/wab/client/components/sidebar/MixinControls";
import ReferenceItem from "@/wab/client/components/sidebar/ReferenceItem";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { TokenEditModal } from "@/wab/client/components/sidebar/TokenEditModal";
import { Icon } from "@/wab/client/components/widgets/Icon";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import MixinIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Mixin";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import PlasmicFindReferencesModal from "@/wab/client/plasmic/plasmic_kit_find_references_modal/PlasmicFindReferencesModal";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, spawn } from "@/wab/common";
import { getComponentDisplayName, isPageComponent } from "@/wab/components";
import { FRAME_LOWER } from "@/wab/shared/Labels";
import { extractComponentUsages, getArenaFromFrame } from "@/wab/sites";
import {
  DefaultStyle,
  extractMixinUsages,
  extractTokenUsages,
} from "@/wab/styles";
import { Menu } from "antd";
import L, { sortBy } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { VariableSizeList } from "react-window";

const enum ItemType {
  page = "page",
  component = "component",
  token = "token",
  mixin = "mixin",
  theme = "theme",
  frame = "frame",
}

export interface UsageSummary {
  components: Component[];
  frames: ArenaFrame[];
  mixins?: Mixin[];
  tokens?: StyleToken[];
  themes?: DefaultStyle[];
}

type Reference = Component | StyleToken | Mixin | DefaultStyle | ArenaFrame;

type Item = {
  displayName: string;
  type: ItemType;
  onClick?: () => void;
  getUsageSummary?: () => UsageSummary;
  isSelected?: boolean;
};

function typeToIcon(type: ItemType) {
  if (type === ItemType.component) {
    return (
      <Icon
        icon={ComponentIcon}
        className="component-fg custom-svg-icon--lg monochrome-exempt"
      />
    );
  } else if (type === ItemType.mixin) {
    return (
      <Icon
        icon={MixinIcon}
        className="mixin-fg custom-svg-icon--lg monochrome-exempt"
      />
    );
  } else if (type === ItemType.token) {
    return (
      <Icon
        icon={TokenIcon}
        className="token-fg custom-svg-icon--lg monochrome-exempt"
      />
    );
  } else {
    throw new Error("Invalid item type to find references: " + type);
  }
}

export const FindReferencesModal = observer(
  function FindReferencesModal(props: {
    displayName: string;
    icon: React.ReactNode;
    usageSummary: UsageSummary;
    studioCtx: StudioCtx;
    onClose: () => void;
  }) {
    const { usageSummary, studioCtx, icon, displayName } = props;
    const currentArena = studioCtx.currentArena;

    const [editToken, setEditToken] = React.useState<StyleToken | undefined>(
      undefined
    );
    const [editMixin, setEditMixin] = React.useState<Mixin | undefined>(
      undefined
    );
    const [editTag, setEditTag] = React.useState<string | undefined>(undefined);

    const [findReferenceItem, setFindReferenceItem] = React.useState<
      Item | undefined
    >(undefined);

    const toItem = (type: ItemType, item: Reference): Item => {
      if (type === ItemType.component || type === ItemType.page) {
        const component = item as Component;
        const arena = studioCtx.getDedicatedArena(component);
        return {
          displayName: getComponentDisplayName(component),
          type: type,
          onClick: () =>
            spawn(
              studioCtx.change(({ success }) => {
                studioCtx.switchToComponentArena(component);
                return success();
              })
            ),
          isSelected: arena === currentArena,
          getUsageSummary:
            type === ItemType.component
              ? () => extractComponentUsages(studioCtx.site, component)
              : undefined,
        };
      } else if (type === ItemType.frame) {
        const frame = item as ArenaFrame;
        const arena = getArenaFromFrame(studioCtx.site, frame);
        return {
          displayName: frame.name || `unnamed ${FRAME_LOWER}`,
          type: type,
          onClick: () =>
            spawn(
              studioCtx.change(({ success }) => {
                studioCtx.switchToArena(arena);
                return success();
              })
            ),
          isSelected: arena === currentArena,
        };
      } else if (type === ItemType.token) {
        const token = item as StyleToken;
        return {
          displayName: token.name,
          type: type,
          onClick: () => setEditToken(token),
          getUsageSummary: () => extractTokenUsages(studioCtx.site, token)[1],
        };
      } else if (type === ItemType.mixin) {
        const mixin = item as Mixin;
        return {
          displayName: mixin.name,
          type: type,
          onClick: () => setEditMixin(mixin),
          getUsageSummary: () => extractMixinUsages(studioCtx.site, mixin)[1],
        };
      } else if (type === ItemType.theme) {
        const theme = item as DefaultStyle;
        return {
          displayName: theme.selector
            ? `Default "${theme.selector}"`
            : `Default Typography`,
          type: type,
          onClick: () => {
            setEditTag(theme.selector?.split(":")[0]);
            setEditMixin(theme.style);
          },
        };
      } else {
        throw new Error("Invalid reference item type: " + type);
      }
    };

    const getSection = (type: ItemType, items: Reference[]) => {
      const _items = items.map((item) => toItem(type, item));
      sortBy(_items);
      return [...(_items.length ? ["separator"] : []), ..._items];
    };
    const items = [
      ...getSection(
        ItemType.page,
        usageSummary.components.filter(isPageComponent)
      ),
      ...getSection(
        ItemType.component,
        usageSummary.components.filter((c) => !isPageComponent(c))
      ),
      ...getSection(ItemType.frame, usageSummary.frames),
      ...getSection(ItemType.token, usageSummary.tokens ?? []),
      ...getSection(ItemType.mixin, usageSummary.mixins ?? []),
      ...getSection(ItemType.theme, usageSummary.themes ?? []),
    ];

    const itemSizer = (index: number) => {
      const item = items[index];
      if (item === "separator") {
        return 9;
      } else {
        return 32;
      }
    };

    const height = L.sum(L.range(items.length).map(itemSizer));

    return (
      <SidebarModal
        show={true}
        title={
          <>
            {icon}
            <div> References to {displayName} </div>
          </>
        }
        onClose={() => props.onClose()}
      >
        <PlasmicFindReferencesModal>
          <VariableSizeList
            height={height}
            itemSize={itemSizer}
            itemData={items}
            layout="vertical"
            width="100%"
            overscanCount={2}
            itemCount={items.length}
          >
            {({ data, index, style }) => {
              if (index === 0) {
                return <></>;
              }
              if (data[index] === "separator") {
                return <ListSectionSeparator style={style} center />;
              }
              const item = data[index] as Item;
              return (
                <li style={style}>
                  <ReferenceItem
                    type={item.type}
                    onClick={item.onClick}
                    selected={item.isSelected}
                    menu={
                      item.getUsageSummary !== undefined
                        ? getReferenceItemMenuRenderer({
                            item,
                            setFindReferenceItem,
                          })
                        : undefined
                    }
                  >
                    {item.displayName}
                  </ReferenceItem>
                </li>
              );
            }}
          </VariableSizeList>
        </PlasmicFindReferencesModal>

        {editToken && (
          <TokenEditModal
            studioCtx={studioCtx}
            token={editToken}
            onClose={() => {
              setEditToken(undefined);
            }}
          />
        )}
        {editMixin && (
          <MixinPopup
            mixin={editMixin}
            studioCtx={studioCtx}
            show={true}
            onClose={() => {
              setEditMixin(undefined);
              setEditTag(undefined);
            }}
            tag={editTag}
          />
        )}
        {findReferenceItem && (
          <FindReferencesModal
            studioCtx={studioCtx}
            displayName={findReferenceItem.displayName}
            icon={typeToIcon(findReferenceItem.type)}
            usageSummary={ensure(
              findReferenceItem.getUsageSummary,
              "setFindReferenceItem should only be used for itens with getUsageSummary"
            )()}
            onClose={() => {
              setFindReferenceItem(undefined);
            }}
          />
        )}
      </SidebarModal>
    );
  }
);

function getReferenceItemMenuRenderer({
  item,
  setFindReferenceItem,
}: {
  item: Item;
  setFindReferenceItem: (i: Item) => void;
}) {
  return () => {
    const onFindReferences = () => setFindReferenceItem(item);

    return (
      <Menu onClick={(e) => e.domEvent.stopPropagation()}>
        {menuSection(
          <Menu.Item key="references" onClick={onFindReferences}>
            Find all references
          </Menu.Item>
        )}
      </Menu>
    );
  };
}
