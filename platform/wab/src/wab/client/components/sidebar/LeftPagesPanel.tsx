import ListItem from "@/wab/client/components/ListItem";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import promptDeleteComponent from "@/wab/client/components/modals/componentDeletionModal";
import { reactPrompt } from "@/wab/client/components/quick-modals";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { ListSpace } from "@/wab/client/components/widgets/ListStack";
import { SimpleReorderableVirtualList } from "@/wab/client/components/widgets/SimpleReorderableVirtualList";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import {
  DefaultLeftPagesPanelProps,
  PlasmicLeftPagesPanel,
} from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicLeftPagesPanel";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { moveIndex } from "@/wab/common";
import {
  isCodeComponent,
  isPageComponent,
  PageComponent,
} from "@/wab/components";
import { isMixedArena } from "@/wab/shared/Arenas";
import { FRAME_CAP } from "@/wab/shared/Labels";
import { Menu } from "antd";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";

type LeftPagesPanelProps = DefaultLeftPagesPanelProps;

const LeftPagesPanel = observer(function LeftPagesPanel(
  _props: LeftPagesPanelProps
) {
  const studioCtx = useStudioCtx();
  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);

  const pages = studioCtx.site.components.filter(isPageComponent);

  return (
    <PlasmicLeftPagesPanel
      leftSearchPanel={{
        searchboxProps: {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          autoFocus: true,
        },
      }}
      newPageButton={{
        onClick: () => studioCtx.siteOps().createFrameForNewPage(),
      }}
      content={
        <>
          <PagesList studioCtx={studioCtx} pages={pages} matcher={matcher} />
        </>
      }
    />
  );
});

const PagesList = observer(function PagesList(props: {
  studioCtx: StudioCtx;
  pages: PageComponent[];
  matcher: Matcher;
}) {
  const { studioCtx, matcher } = props;
  const pages = props.pages.filter((page) =>
    matcher.matches(`${page.name} - ${page.pageMeta?.path ?? ""}`)
  );

  return (
    <ListSpace space={pages.length * 32}>
      {({ height }) => (
        <SimpleReorderableVirtualList
          onReordered={(fromIndex, toIndex) =>
            studioCtx.changeUnsafe(() => {
              const fromRealIndex = studioCtx.site.components.indexOf(
                pages[fromIndex]
              );

              const toRealIndex = studioCtx.site.components.indexOf(
                pages[toIndex]
              );

              moveIndex(studioCtx.site.components, fromRealIndex, toRealIndex);
            })
          }
          items={pages}
          itemKey={(component) => component.uuid}
          height={height}
          itemSize={32}
          customDragHandle
        >
          {({ item, isDragging, dragHandleProps }) => (
            <PageRow
              studioCtx={studioCtx}
              page={item}
              matcher={matcher}
              isDragging={isDragging}
              dragHandleProps={dragHandleProps}
            />
          )}
        </SimpleReorderableVirtualList>
      )}
    </ListSpace>
  );
});

const PageRow = observer(function PageRow(props: {
  studioCtx: StudioCtx;
  page: PageComponent;
  matcher: Matcher;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) {
  const { studioCtx, page, matcher, isDragging, dragHandleProps } = props;
  const overlay = () => {
    const arena = studioCtx.currentArena;
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      if (!isCodeComponent(page) && isMixedArena(arena)) {
        push(
          <Menu.Item
            key="open"
            onClick={() =>
              studioCtx.changeUnsafe(() =>
                studioCtx.siteOps().createNewFrameForMixedArena(page)
              )
            }
          >
            <strong>Edit</strong> in new {FRAME_CAP}
          </Menu.Item>
        );
      }
    });

    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          key="rename"
          onClick={async () => {
            const name = await reactPrompt({
              message: "What's the new name for this page?",
              defaultValue: page.name,
              placeholder: "New page name",
              actionText: "Rename",
            });

            if (name) {
              await studioCtx.changeUnsafe(() =>
                studioCtx.siteOps().tryRenameComponent(page, name)
              );
            }
          }}
        >
          <strong>Rename</strong> page
        </Menu.Item>
      );

      push(
        <Menu.Item
          key="changePath"
          onClick={async () => {
            const path = await reactPrompt({
              message: "Enter a new path for this page:",
              placeholder: "New page path",
              actionText: "Change",
            });
            if (path) {
              await studioCtx.tryChangePath(page, path);
            }
          }}
        >
          <strong>Change</strong> path
        </Menu.Item>
      );

      if (!isCodeComponent(page)) {
        push(
          <Menu.Item
            key="duplicate"
            onClick={() => studioCtx.siteOps().tryDuplicatingComponent(page)}
          >
            <strong>Duplicate</strong> page
          </Menu.Item>
        );
      }

      push(
        <Menu.Item
          key="convert_to_component"
          onClick={() =>
            studioCtx.changeUnsafe(() =>
              studioCtx.siteOps().convertPageToComponent(page)
            )
          }
        >
          <strong>Convert</strong> to reusable component
        </Menu.Item>
      );
    });

    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          key="delete"
          onClick={async () => {
            const confirmation = await promptDeleteComponent("page", page.name);
            if (!confirmation) return;
            await studioCtx.changeUnsafe(() =>
              studioCtx.siteOps().tryRemoveComponent(page)
            );
          }}
        >
          <strong>Delete</strong> page
        </Menu.Item>
      );
    });

    return builder.build({ menuName: "page-item-menu" });
  };

  return (
    <ListItem
      isDragging={isDragging}
      isDraggable={true}
      icon={<Icon icon={PageIcon} />}
      menu={overlay}
      dragHandleProps={dragHandleProps}
    >
      {matcher.boldSnippets(`${page.name} - ${page.pageMeta?.path || ""}`)}
    </ListItem>
  );
});

export default LeftPagesPanel;
