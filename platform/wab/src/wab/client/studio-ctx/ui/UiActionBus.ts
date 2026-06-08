export type UiActionType = "blink" | "jump";
export type UiActionHandler = (type: UiActionType) => void;
export type UiActionListener<UiId> = (uiId: UiId, type: UiActionType) => void;
type Disposable = { dispose: () => void };

const PENDING_ACTION_TIMEOUT_MS = 2_000;

/** Enables disparate UI components to communicate with each other without tight coupling. */
export class UiActionBus<UiId> {
  private readonly handlers = new Map<UiId, UiActionHandler>();
  private readonly listeners = new Set<UiActionListener<UiId>>();
  private pending: {
    id: UiId;
    type: UiActionType;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null = null;

  registerHandler(id: UiId, handler: UiActionHandler): Disposable {
    if (this.handlers.has(id)) {
      console.warn(
        `Duplicate registerHandler() call for UiId "${id}"`,
        handler
      );
    }

    this.handlers.set(id, handler);

    const pending = this.pending;
    if (pending && pending.id === id) {
      clearTimeout(pending.timeoutId);
      this.pending = null;
      handler(pending.type);
    }

    return {
      dispose: () => {
        const currentHandler = this.handlers.get(id);
        if (currentHandler === handler) {
          this.handlers.delete(id);
        }
      },
    };
  }

  registerListener(listener: UiActionListener<UiId>): Disposable {
    if (this.listeners.has(listener)) {
      console.warn(`Duplicate registerListener() call for listener`, listener);
    } else {
      this.listeners.add(listener);

      if (this.pending) {
        listener(this.pending.id, this.pending.type);
      }
    }

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  dispatch(id: UiId, type: UiActionType) {
    if (this.pending) {
      console.warn(
        `Dispatch of "${this.pending.type}" to UiId "${this.pending.id}" canceled due to new dispatch`
      );
      clearTimeout(this.pending.timeoutId);
      this.pending = null;
    }

    const handler = this.handlers.get(id);
    if (handler) {
      // Handler exists, notify listeners and call the handler.
      // Listeners still need to be notified in case the handler is mounted
      // but not visible.
      this.listeners.forEach((parent) => parent(id, type));
      handler(type);
    } else {
      // Handler doesn't exist, hopefully a listener will render the handler.
      // Save the action as pending.
      const timeoutId = setTimeout(() => {
        if (this.pending?.timeoutId === timeoutId) {
          console.warn(
            `Dispatch of "${this.pending.type}" to UiId "${this.pending.id}" canceled due to timeout`
          );
          clearTimeout(this.pending.timeoutId);
          this.pending = null;
        }
      }, PENDING_ACTION_TIMEOUT_MS);
      this.pending = { id, type, timeoutId };
      this.listeners.forEach((parent) => parent(id, type));
    }
  }
}
