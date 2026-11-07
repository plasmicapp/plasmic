import {
  ModelTarget,
  captureModelTarget,
  modelSnapshot,
} from "@/wab/client/components/editor-sessions/model-target";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isEqual } from "lodash";
import { observable, runInAction } from "mobx";
import { err, ok } from "neverthrow";

export type CommitResult =
  { kind: "saved" | "unchanged" } | { kind: "blocked"; message: string };

export interface EditableSession {
  readonly dirty: boolean;
  readonly pending: boolean;
  readonly error: string | undefined;
  commit(force?: boolean): Promise<CommitResult>;
  perform(action: () => void): Promise<CommitResult>;
}

/** Preparation may await I/O; applying must mutate synchronously without queuing changes. */
export type PreparedEdit =
  { apply: () => undefined } | { kind: "blocked"; message: string };

export interface SessionAdapter<Draft> {
  initial: Draft;
  /** Omit only for editors that update a local draft, not the Studio model. */
  studioCtx?: Pick<StudioCtx, "change">;
  target?: ModelTarget;
  prepare: (draft: Draft) => PreparedEdit | Promise<PreparedEdit>;
  snapshot?: (draft: Draft) => unknown;
}

export class EditorSession<Draft> implements EditableSession {
  private readonly value;
  private readonly baseline;
  private readonly saving = observable.box(false);
  private readonly failure = observable.box<string | undefined>();
  private target;
  private inFlight?: Promise<CommitResult>;

  constructor(private readonly adapter: SessionAdapter<Draft>) {
    this.target = adapter.target && captureModelTarget(adapter.target);
    this.value = observable.box(adapter.initial, { deep: false });
    this.baseline = observable.box(this.snapshot(adapter.initial), {
      deep: false,
    });
  }

  private snapshot(draft: Draft) {
    return (this.adapter.snapshot ?? modelSnapshot)(draft);
  }

  get draft() {
    return this.value.get();
  }
  get dirty() {
    return !isEqual(this.snapshot(this.draft), this.baseline.get());
  }
  get pending() {
    return this.saving.get();
  }
  get error() {
    return this.failure.get();
  }

  setDraft = (next: Draft | ((previous: Draft) => Draft)) => {
    if (this.pending) {
      return;
    }
    runInAction(() => {
      this.value.set(
        typeof next === "function"
          ? (next as (previous: Draft) => Draft)(this.draft)
          : next,
      );
      this.failure.set(undefined);
    });
  };

  commit(force = false): Promise<CommitResult> {
    if (this.inFlight) {
      return this.inFlight;
    }
    if (!force && !this.dirty) {
      return Promise.resolve({ kind: "unchanged" });
    }
    return this.run(() => this.adapter.prepare(this.draft));
  }

  perform(action: () => void) {
    return this.run(() => ({
      apply: () => {
        action();
      },
    }));
  }

  private run(
    prepare: () => PreparedEdit | Promise<PreparedEdit>,
  ): Promise<CommitResult> {
    if (this.inFlight) {
      return this.inFlight;
    }
    runInAction(() => {
      this.saving.set(true);
      this.failure.set(undefined);
    });
    this.inFlight = Promise.resolve()
      .then(async (): Promise<CommitResult> => {
        try {
          const prepared = await prepare();
          let nextTarget = this.target;
          const apply = (): CommitResult => {
            const problem = this.target?.check();
            if (problem) {
              return { kind: "blocked", message: problem };
            }
            if ("kind" in prepared) {
              return prepared;
            }
            prepared.apply();
            // Capture before another queued change can run, but accept only on success.
            nextTarget =
              this.adapter.target && captureModelTarget(this.adapter.target);
            return { kind: "saved" };
          };
          const result =
            "kind" in prepared
              ? prepared
              : this.adapter.studioCtx
                ? (
                    await this.adapter.studioCtx.change(() => {
                      try {
                        return ok(apply());
                      } catch (error) {
                        return err(error);
                      }
                    })
                  ).match(
                    (value) => value,
                    (error) => {
                      throw error;
                    },
                  )
                : apply();
          runInAction(() => {
            if (result.kind === "blocked") {
              this.failure.set(result.message);
            } else {
              this.baseline.set(this.snapshot(this.draft));
              this.target = nextTarget;
            }
          });
          return result;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not save this draft. Please retry.";
          runInAction(() => this.failure.set(message));
          return { kind: "blocked", message };
        }
      })
      .finally(() => {
        this.inFlight = undefined;
        runInAction(() => this.saving.set(false));
      });
    return this.inFlight;
  }
}
