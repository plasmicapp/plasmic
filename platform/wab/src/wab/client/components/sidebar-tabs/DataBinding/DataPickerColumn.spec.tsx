import DataPickerColumn from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumn";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { render } from "@testing-library/react";
import React from "react";

const mocks = vi.hoisted(() => ({
  onDragEnd: undefined as
    ((spec: unknown, result: unknown) => void) | undefined,
  payload: undefined as any,
  getSourceQuery: vi.fn(),
  getSourceUiId: vi.fn(),
  viewCtx: {
    site: {},
    siteInfo: { id: "test" },
    currentComponent: () => undefined,
  },
}));
vi.mock(
  "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getSourceQuery: mocks.getSourceQuery,
    getSourceUiId: mocks.getSourceUiId,
  }),
);
vi.mock("@/wab/client/studio-ctx/StudioCtx", () => ({
  useStudioCtx: () => ({}),
}));
vi.mock("@/wab/client/contexts/StudioContexts", () => ({
  useViewCtxMaybe: () => mocks.viewCtx,
}));
vi.mock("@/wab/client/hooks/useOpenQueryPanel", () => ({
  useOpenQueryPanel: () => vi.fn(),
}));
vi.mock("@/wab/client/components/sidebar-tabs/DataBinding/data-drag", () => ({
  isDraggableDataItem: () => true,
  mkDataDragSpec: () => ({}),
  mkDataDragTargeting: () => ({}),
}));
vi.mock(
  "@/wab/client/components/studio/add-drawer/DraggableInsertable",
  () => ({
    DraggableInsertable: (props: any) => {
      mocks.onDragEnd = props.onDragEnd;
      mocks.payload = props.dataDragPayload;
      return props.children;
    },
  }),
);
vi.mock(
  "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerColumn",
  () => ({
    PlasmicDataPickerColumn: (props: any) => <div>{props.children}</div>,
  }),
);
vi.mock(
  "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumnItem",
  () => ({ default: () => <div /> }),
);

it("delegates drop completion to the operation", () => {
  render(
    <DataPickerColumn
      viewCtx={mocks.viewCtx as unknown as ViewCtx}
      data={{ currentItem: "child" }}
      columnIndex={0}
      selectedItem={undefined}
      isActiveColumn
      columnItems={[{ name: "currentItem", value: "child", pathPrefix: [] }]}
      onItemSelected={() => {}}
      opts={{ showAdvancedFields: false }}
      allowDragging
    />,
  );
  expect(mocks.onDragEnd).toBeUndefined();
});

it("uses the pinned view for drags when another artboard has focus", () => {
  const component = { uuid: "original" };
  const pinnedView = {
    ...mocks.viewCtx,
    currentComponent: () => component,
  } as unknown as ViewCtx;
  render(
    <DataPickerColumn
      viewCtx={pinnedView}
      docked
      data={{ currentItem: "original value" }}
      columnIndex={0}
      selectedItem={undefined}
      isActiveColumn
      columnItems={[
        { name: "currentItem", value: "original value", pathPrefix: [] },
      ]}
      onItemSelected={() => {}}
      opts={{ showAdvancedFields: false }}
      allowDragging
    />,
  );
  expect(mocks.payload.sourceViewCtx).toBe(pinnedView);
  expect(mocks.payload.value).toBe("original value");
  expect(mocks.getSourceQuery).toHaveBeenLastCalledWith(
    ["currentItem"],
    component,
  );
  expect(mocks.getSourceUiId).toHaveBeenLastCalledWith(
    ["currentItem"],
    pinnedView.site,
    component,
  );
});
