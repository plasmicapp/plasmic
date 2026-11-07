import { EditorSession } from "@/wab/client/components/editor-sessions/editor-session";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { err } from "neverthrow";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function draft(prepare = vi.fn(async (_value: string) => {})) {
  const write = vi.fn((_value: string) => {});
  const session = new EditorSession({
    initial: "old",
    prepare: async (value) => {
      if (value === "invalid") {
        return { kind: "blocked", message: "Invalid expression" };
      }
      await prepare(value);
      return {
        apply: () => {
          write(value);
        },
      };
    },
  });
  return { session, write, prepare };
}

it("does not write clean drafts and establishes a new baseline after saving", async () => {
  const { session, write } = draft();
  expect(await session.commit()).toEqual({ kind: "unchanged" });
  session.setDraft("new");
  expect(await session.commit()).toEqual({ kind: "saved" });
  expect(session.dirty).toBe(false);
  await session.commit();
  expect(write).toHaveBeenCalledExactlyOnceWith("new");
});

it("deduplicates commits and locks the draft while writing", async () => {
  const gate = deferred();
  const { session, write } = draft(vi.fn(() => gate.promise));
  session.setDraft("new");
  const a = session.commit();
  const b = session.commit(true);
  expect(a).toBe(b);
  expect(session.pending).toBe(true);
  session.setDraft("too late");
  gate.resolve();
  await a;
  expect(write).toHaveBeenCalledExactlyOnceWith("new");
});

it.each(["invalid", "rejected"])(
  "retains and retries a %s draft",
  async (failure) => {
    const { session, prepare } = draft();
    if (failure === "rejected") {
      prepare.mockRejectedValueOnce(new Error("Offline"));
    }
    session.setDraft(failure);
    expect((await session.commit()).kind).toBe("blocked");
    expect(session.draft).toBe(failure);
    expect(session.error).toBeTruthy();
    session.setDraft("fixed");
    expect((await session.commit()).kind).toBe("saved");
    expect(session.error).toBeUndefined();
  },
);

it.each(["deleted", "changed"])(
  "retains a draft whose target was %s",
  async (problem) => {
    const model = { exists: true, value: "old" };
    const write = vi.fn();
    const session = new EditorSession({
      initial: "old",
      prepare: () => ({ apply: write }),
      target: { exists: () => model.exists, read: () => model.value },
    });
    if (problem === "deleted") {
      model.exists = false;
    } else {
      model.value = "external";
    }
    session.setDraft("new");
    expect(await session.commit()).toMatchObject({
      kind: "blocked",
      message: expect.stringContaining(problem),
    });
    expect(write).not.toHaveBeenCalled();
    expect(session.draft).toBe("new");
  },
);

it("only blocks on deletion when the target has no read", async () => {
  const model = { exists: true };
  const write = vi.fn(() => undefined);
  const session = new EditorSession({
    initial: "old",
    prepare: () => ({ apply: write }),
    target: { exists: () => model.exists },
  });
  session.setDraft("new");
  expect((await session.commit()).kind).toBe("saved");
  model.exists = false;
  session.setDraft("newer");
  expect((await session.commit()).kind).toBe("blocked");
});

it("re-baselines the target after its own write", async () => {
  const model = { value: "old" };
  const session = new EditorSession({
    initial: "old",
    target: { exists: () => true, read: () => model.value },
    prepare: async (value) => {
      return {
        apply: () => {
          model.value = value;
        },
      };
    },
  });
  session.setDraft("new");
  expect((await session.commit()).kind).toBe("saved");
  session.setDraft("newer");
  expect((await session.commit()).kind).toBe("saved");
});

it.each(["preparing", "queued"])(
  "checks the destination inside the change after %s",
  async (stage) => {
    const model = { value: "old" };
    const gate = deferred();
    const apply = vi.fn((): undefined => {
      model.value = "new";
    });
    const change = vi.fn(async (fn: () => unknown) => {
      if (stage === "queued") {
        await gate.promise;
      }
      return fn();
    });
    const session = new EditorSession({
      initial: "old",
      studioCtx: { change } as Pick<StudioCtx, "change">,
      target: { exists: () => true, read: () => model.value },
      prepare: async () => {
        if (stage === "preparing") {
          await gate.promise;
        }
        return { apply };
      },
    });
    session.setDraft("new");
    const save = session.commit();
    await vi.waitFor(() => {
      if (stage === "queued") {
        expect(change).toHaveBeenCalledOnce();
      } else {
        expect(session.pending).toBe(true);
      }
    });
    model.value = "external";
    gate.resolve();
    expect(await save).toMatchObject({
      kind: "blocked",
      message: expect.stringContaining("changed outside"),
    });
    expect(apply).not.toHaveBeenCalled();
    expect(session.dirty).toBe(true);
  },
);

it.each(["reject", "result"])(
  "waits for the change and retains the draft on a %s error",
  async (failure) => {
    const gate = deferred();
    const apply = vi.fn();
    const change = vi.fn(async (fn: () => unknown) => {
      fn();
      await gate.promise;
      if (failure === "reject") {
        throw new Error("Change failed");
      }
      return err(new Error("Change failed"));
    });
    const session = new EditorSession({
      initial: "old",
      studioCtx: { change } as Pick<StudioCtx, "change">,
      prepare: () => ({ apply }),
    });
    session.setDraft("new");
    const save = session.commit();
    await vi.waitFor(() => expect(apply).toHaveBeenCalledOnce());
    expect(session.pending).toBe(true);
    expect(session.dirty).toBe(true);
    gate.resolve();
    expect(await save).toEqual({ kind: "blocked", message: "Change failed" });
    expect(session.pending).toBe(false);
    expect(session.dirty).toBe(true);
  },
);

it("returns synchronous apply failures to the transaction and allows retry", async () => {
  const apply = vi.fn().mockImplementationOnce(() => {
    throw new Error("Cannot apply");
  });
  const results: unknown[] = [];
  const change = vi.fn(async (fn: () => unknown) => {
    const result = fn();
    results.push(result);
    return result;
  });
  const session = new EditorSession({
    initial: "old",
    studioCtx: { change } as Pick<StudioCtx, "change">,
    prepare: () => ({ apply }),
  });
  session.setDraft("new");
  expect(await session.commit()).toEqual({
    kind: "blocked",
    message: "Cannot apply",
  });
  expect(results[0]).toEqual(err(new Error("Cannot apply")));
  expect(session.dirty).toBe(true);
  expect(await session.commit()).toEqual({ kind: "saved" });
});

it("does not accept external writes that run after apply while the queue drains", async () => {
  const model = { value: "old" };
  const change = vi.fn(async (fn: () => unknown) => {
    const result = fn();
    model.value = "external";
    return result;
  });
  const session = new EditorSession({
    initial: "old",
    studioCtx: { change } as Pick<StudioCtx, "change">,
    target: { exists: () => true, read: () => model.value },
    prepare: (value) => ({
      apply: () => {
        model.value = value;
      },
    }),
  });
  session.setDraft("new");
  expect(await session.commit()).toEqual({ kind: "saved" });
  session.setDraft("newer");
  expect(await session.commit()).toMatchObject({ kind: "blocked" });
  expect(model.value).toBe("external");
});
