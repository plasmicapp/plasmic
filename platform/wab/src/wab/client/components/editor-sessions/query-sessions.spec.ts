import { createBindingSession } from "@/wab/client/components/editor-sessions/binding-session";
import { PanelStack, SessionEntry } from "@/wab/client/components/PanelStack";
import { createDataSourceSession } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { createServerQuerySession } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { code } from "@/wab/shared/core/exprs";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ComponentServerQuery } from "@/wab/shared/model/classes";

const changeCtx = { change: async (fn: () => unknown) => fn() } as Pick<
  StudioCtx,
  "change"
>;

it("keeps server query edits isolated until an awaited write", async () => {
  const query = new ComponentServerQuery({
    uuid: "query",
    name: "old",
    op: code('"old"'),
  });
  const write = vi.fn((op, name) => {
    query.op = op;
    query.name = name;
  });
  const session = createServerQuerySession(changeCtx, query, write);
  session.setDraft({ queryName: "new", codeExpr: code('"new"') });
  expect(query.name).toBe("old");
  expect(query.op).toMatchObject({ code: '"old"' });
  await session.commit();
  expect(query.name).toBe("new");
  expect(query.op).toMatchObject({ code: '"new"' });
  expect(session.dirty).toBe(false);
});

it("retains an invalid server query and accepts a correction", async () => {
  const write = vi.fn();
  const session = createServerQuerySession(changeCtx, undefined, write);
  session.setDraft({ codeExpr: code("(") });
  expect((await session.commit()).kind).toBe("blocked");
  expect(write).not.toHaveBeenCalled();
  session.setDraft({ codeExpr: code("({ result: 42 })") });
  expect((await session.commit()).kind).toBe("saved");
});

it("retains a data-source draft when its integration cannot be loaded", async () => {
  const getDataSourceById = vi
    .fn()
    .mockRejectedValue(new Error("Integration unavailable"));
  const studioCtx = {
    site: {
      defaultPageRoleId: undefined,
      components: [],
      projectDependencies: [],
      userManagedFonts: [],
    },
    appCtx: { api: { getDataSourceById } },
  } as unknown as StudioCtx;
  const write = vi.fn();
  const session = createDataSourceSession(studioCtx, {
    onSave: write,
    onCancel: vi.fn(),
    exprCtx: { projectFlags: DEVFLAGS, component: null, inStudio: true },
  });
  session.setDraft((previous) => ({
    ...previous,
    sourceId: "source",
    opName: "getList",
  }));
  expect((await session.commit()).kind).toBe("blocked");
  expect(session.error).toBe("Integration unavailable");
  expect(session.draft.sourceId).toBe("source");
  expect(write).not.toHaveBeenCalled();
});

it("commits a nested binding into its parent draft before persisting the query", async () => {
  const write = vi.fn();
  const parent = createServerQuerySession(changeCtx, undefined, write);
  parent.setDraft({ codeExpr: code('"before"') });
  const child = createBindingSession({
    value: '"before"',
    onChange: (value) => {
      parent.setDraft({ codeExpr: code(value as string) });
    },
    onCancel: vi.fn(),
  });
  const controller = new PanelStack<SessionEntry>();
  await controller.navigate([
    { id: "query", session: parent },
    { id: "binding", parentId: "query", session: child },
  ]);
  child.setDraft({ ...child.draft, code: '"after"' });
  await controller.leave("binding", true);
  expect(parent.draft.codeExpr).toMatchObject({ code: '"after"' });
  expect(write).not.toHaveBeenCalled();
  await controller.leave("query");
  expect(write).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ code: '"after"' }),
    undefined,
  );
});

it("does not treat a binding mode switch as an edit", () => {
  const session = createBindingSession({
    value: ["$q", "query", "data"],
    data: {},
    onChange: vi.fn(),
    onCancel: vi.fn(),
  });
  session.setDraft((previous) => ({ ...previous, codeEditing: true }));
  expect(session.dirty).toBe(false);
  session.setDraft((previous) => ({ ...previous, code: "$q.other" }));
  expect(session.dirty).toBe(true);
});

it("uses the Studio transaction for a binding without a canvas context", async () => {
  let changing = false;
  const studioCtx = {
    change: async (fn: () => unknown) => {
      changing = true;
      try {
        return fn();
      } finally {
        changing = false;
      }
    },
  } as Pick<StudioCtx, "change">;
  const onChange = vi.fn(() => {
    expect(changing).toBe(true);
  });
  const session = createBindingSession(
    { value: '"old"', onChange, onCancel: vi.fn() },
    undefined,
    { studioCtx },
  );
  session.setDraft({ ...session.draft, code: '"new"' });
  expect(await session.commit()).toEqual({ kind: "saved" });
  expect(onChange).toHaveBeenCalledExactlyOnceWith('"new"');
});

it("keeps a remote save pending, retains failures, and closes only after a successful retry", async () => {
  let finishSave: (() => void) | undefined;
  let rejectSave: ((error: Error) => void) | undefined;
  const onSaveAsync = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        finishSave = resolve;
        rejectSave = reject;
      }),
  );
  const studioCtx = {
    site: { components: [], projectDependencies: [], userManagedFonts: [] },
    siteInfo: { id: "project" },
    change: vi.fn(),
    appCtx: {
      api: {
        getDataSourceById: vi.fn().mockResolvedValue({ source: "http" }),
        getDataSourceOpId: vi.fn().mockResolvedValue({ opId: "op" }),
      },
    },
  } as unknown as StudioCtx;
  const session = createDataSourceSession(studioCtx, {
    onSaveAsync,
    onCancel: vi.fn(),
    exprCtx: { projectFlags: DEVFLAGS, component: null, inStudio: true },
  });
  session.setDraft((previous) => ({
    ...previous,
    sourceId: "source",
    opName: "get",
  }));
  const controller = new PanelStack<SessionEntry>();
  const entry = { id: "user-properties", session };
  await controller.navigate([entry]);
  const closing = controller.leave(entry.id, true);
  await vi.waitFor(() => expect(onSaveAsync).toHaveBeenCalledOnce());
  expect(session.pending).toBe(true);
  expect(controller.discard(entry.id)).toBe(false);
  expect(controller.stack).toEqual([entry]);
  rejectSave?.(new Error("Saving user properties failed"));
  expect(await closing).toBe(false);
  expect(session.error).toBe("Saving user properties failed");
  expect(session.pending).toBe(false);
  expect(session.dirty).toBe(true);
  expect(session.draft.sourceId).toBe("source");
  expect(controller.stack).toEqual([entry]);

  const retry = controller.leave(entry.id, true);
  await vi.waitFor(() => expect(onSaveAsync).toHaveBeenCalledTimes(2));
  finishSave?.();
  expect(await retry).toBe(true);
  expect(controller.stack).toEqual([]);
  expect(session.dirty).toBe(false);
  expect(session.error).toBeUndefined();
  expect(studioCtx.change).not.toHaveBeenCalled();
});
