import { DraggableInsertable } from "@/wab/client/components/studio/add-drawer/DraggableInsertable";
import { act, render } from "@testing-library/react";
import React from "react";

const mocks = vi.hoisted(() => ({
  props: {} as any,
  manager: { clear: vi.fn(), endDrag: vi.fn() },
  registry: { beginDrag: vi.fn(), clear: vi.fn() },
}));
vi.mock("@/wab/client/components/widgets", () => ({
  DragItem: (props: any) => {
    mocks.props = props;
    return null;
  },
}));
vi.mock("@/wab/client/Dnd", () => ({
  DragInsertManager: { build: async () => mocks.manager },
}));
vi.mock("@/wab/client/components/sidebar-tabs/DataBinding/data-drop", () => ({
  getDataDropTargetRegistry: () => mocks.registry,
}));

it("clears an aborted data drag without applying its pending canvas binding", async () => {
  const sc = {
    changeUnsafe: async (fn: () => void) => fn(),
    startUnlogged: vi.fn(),
    stopUnlogged: vi.fn(),
    setIsDraggingObject: vi.fn(),
  };
  const onDragEnd = vi.fn();
  const spec = { key: "data-drag" };
  render(
    <DraggableInsertable
      sc={sc as any}
      spec={spec as any}
      dataDragPayload={{} as any}
      onDragEnd={onDragEnd}
    >
      {null}
    </DraggableInsertable>,
  );
  await act(async () => {
    await mocks.props.onDragStart();
    await mocks.props.onDragEnd({ data: { aborted: true } });
  });
  expect(mocks.manager.clear).toHaveBeenCalledOnce();
  expect(mocks.manager.endDrag).not.toHaveBeenCalled();
  expect(mocks.registry.clear).toHaveBeenCalledOnce();
  expect(sc.stopUnlogged).toHaveBeenCalledOnce();
  expect(sc.setIsDraggingObject).toHaveBeenLastCalledWith(false);
  expect(onDragEnd).toHaveBeenCalledWith(spec, undefined);
});
