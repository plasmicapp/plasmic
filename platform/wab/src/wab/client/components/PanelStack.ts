import { EditableSession } from "@/wab/client/components/editor-sessions/editor-session";
import { observable, runInAction } from "mobx";

export interface SessionEntry {
  id: string;
  parentId?: string;
  session?: EditableSession;
}

/** The bottom panel's breadcrumb stack; leaving an entry commits its session first. */
export class PanelStack<Entry extends SessionEntry> {
  private readonly entries = observable.box<Entry[]>([], { deep: false });
  private generation = 0;

  get stack() {
    return this.entries.get();
  }

  async navigate(next: Entry[], force?: EditableSession): Promise<boolean> {
    const request = ++this.generation;
    const leaving = this.stack
      .filter((entry) => !next.includes(entry))
      .reverse();
    for (const entry of leaving) {
      if (entry.session) {
        const result = await entry.session.commit(entry.session === force);
        if (request !== this.generation || result.kind === "blocked") {
          return false;
        }
      }
    }
    // A child can be edited again while its parent is saving. Keep those edits open.
    if (
      request !== this.generation ||
      leaving.some((entry) => entry.session?.dirty)
    ) {
      return false;
    }
    runInAction(() => this.entries.set(next));
    return true;
  }

  private subtree(id: string) {
    const ids = new Set([id]);
    return this.stack.filter((entry) => {
      if (ids.has(entry.id) || (entry.parentId && ids.has(entry.parentId))) {
        ids.add(entry.id);
        return true;
      }
      return false;
    });
  }

  leave(id: string, force = false) {
    const subtree = this.subtree(id);
    const target = this.stack.find((entry) => entry.id === id);
    return this.navigate(
      this.stack.filter((entry) => !subtree.includes(entry)),
      force ? target?.session : undefined,
    );
  }

  async performAndDiscard(id: string, action: () => void) {
    const entry = this.stack.find((item) => item.id === id);
    if (!entry?.session || entry.session.pending) {
      return false;
    }
    const result = await entry.session.perform(action);
    if (result.kind === "blocked" || !this.stack.includes(entry)) {
      return false;
    }
    return this.discard(id);
  }

  discard(id: string) {
    const subtree = this.subtree(id);
    if (subtree.some((entry) => entry.session?.pending)) {
      return false;
    }
    ++this.generation;
    runInAction(() =>
      this.entries.set(this.stack.filter((entry) => !subtree.includes(entry))),
    );
    return true;
  }
}
