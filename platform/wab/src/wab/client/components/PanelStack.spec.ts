import { PanelStack, SessionEntry } from "@/wab/client/components/PanelStack";
import { EditorSession } from "@/wab/client/components/editor-sessions/editor-session";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function draft(write = vi.fn(async (_value: string) => {})) {
  const session = new EditorSession({
    initial: "old",
    prepare: async (value) => {
      if (value === "invalid") {
        return { kind: "blocked", message: "Invalid expression" };
      }
      await write(value);
      return { apply: () => {} };
    },
  });
  return { session, write };
}

it("retains edits made to a child while its parent saves and saves them on retry", async () => {
  const controller = new PanelStack<SessionEntry>();
  const started = deferred();
  const gate = deferred();
  const parent = draft(
    vi.fn(async () => {
      started.resolve();
      await gate.promise;
    }),
  );
  const child = draft(vi.fn(async (value) => parent.session.setDraft(value)));
  const entries = [
    { id: "parent", session: parent.session },
    { id: "child", parentId: "parent", session: child.session },
  ];
  await controller.navigate(entries);
  child.session.setDraft("first edit");
  const leaving = controller.navigate([]);
  await started.promise;
  child.session.setDraft("second edit");
  gate.resolve();
  expect(await leaving).toBe(false);
  expect(controller.stack).toEqual(entries);
  expect(child.session.dirty).toBe(true);
  expect(parent.write).toHaveBeenCalledExactlyOnceWith("first edit");
  expect(await controller.navigate([])).toBe(true);
  expect(parent.write).toHaveBeenLastCalledWith("second edit");
  expect(controller.stack).toEqual([]);
});

it("keeps the latest destination when Save and multiple departures overlap", async () => {
  const controller = new PanelStack<SessionEntry>();
  const gate = deferred();
  const { session, write } = draft(vi.fn(() => gate.promise));
  const root = { id: "data" };
  await controller.navigate([
    root,
    { id: "editor", parentId: root.id, session },
  ]);
  session.setDraft("new");
  const save = controller.leave("editor", true);
  const obsolete = controller.navigate([root, { id: "obsolete" }]);
  const latest = controller.navigate([root, { id: "latest" }]);
  expect(controller.discard("editor")).toBe(false);
  gate.resolve();
  expect(await save).toBe(false);
  expect(await obsolete).toBe(false);
  expect(await latest).toBe(true);
  expect(controller.stack.map((entry) => entry.id)).toEqual(["data", "latest"]);
  expect(write).toHaveBeenCalledOnce();
});

it("does not replay a destination after a blocked departure is corrected", async () => {
  const controller = new PanelStack<SessionEntry>();
  const { session } = draft();
  await controller.navigate([{ id: "editor", session }]);
  session.setDraft("invalid");
  expect(await controller.navigate([{ id: "other" }])).toBe(false);
  session.setDraft("fixed");
  await controller.leave("editor", true);
  expect(controller.stack).toEqual([]);
});

it("accepts a child into its parent before parent validation and preserves it on failure", async () => {
  const controller = new PanelStack<SessionEntry>();
  const parent = draft();
  const child = draft(
    vi.fn(async (value) => {
      parent.session.setDraft(value);
    }),
  );
  await controller.navigate([
    { id: "parent", session: parent.session },
    { id: "child", parentId: "parent", session: child.session },
  ]);
  // The child's accepted value is invalid only for the parent.
  child.session.setDraft("accepted");
  child.write.mockImplementation(async () => {
    parent.session.setDraft("invalid");
  });
  expect(await controller.leave("parent")).toBe(false);
  expect(parent.session.draft).toBe("invalid");
  expect(child.session.dirty).toBe(false);
  expect(parent.write).not.toHaveBeenCalled();
  expect(controller.discard("parent")).toBe(true);
  expect(controller.stack).toEqual([]);
});

it("discards child changes without writing to the parent", async () => {
  const controller = new PanelStack<SessionEntry>();
  const parent = draft();
  const child = draft(
    vi.fn(async (value) => {
      parent.session.setDraft(value);
    }),
  );
  const entry = { id: "parent", session: parent.session };
  await controller.navigate([
    entry,
    { id: "child", parentId: "parent", session: child.session },
  ]);
  child.session.setDraft("new");
  controller.discard("child");
  expect(parent.session.draft).toBe("old");
  expect(controller.stack).toEqual([entry]);
});

it("retains a failed explicit action and discards without saving after a retry", async () => {
  const controller = new PanelStack<SessionEntry>();
  const { session, write } = draft();
  await controller.navigate([{ id: "editor", session }]);
  session.setDraft("unsaved");
  const action = vi
    .fn()
    .mockImplementationOnce(() => {
      throw new Error("Cannot unlink");
    })
    .mockImplementationOnce(() => {});
  expect(await controller.performAndDiscard("editor", action)).toBe(false);
  expect(session.error).toBe("Cannot unlink");
  expect(controller.stack).toHaveLength(1);
  expect(await controller.performAndDiscard("editor", action)).toBe(true);
  expect(controller.stack).toHaveLength(0);
  expect(write).not.toHaveBeenCalled();
});
