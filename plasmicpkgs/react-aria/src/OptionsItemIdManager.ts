import { useEffect, useMemo, useState } from "react";
import { useIsomorphicLayoutEffect } from "./utils";

type Observer = (ids: string[]) => void;

/** Ensures option item IDs are unique. */
export class OptionsItemIdManager {
  private readonly _ids: Set<string> = new Set();
  private readonly _observers: Set<Observer> = new Set();

  private generateDuplicateId(id: string, count = 1): string {
    const dupId = `${id} duplicate(${count})`;
    if (this._ids.has(dupId)) {
      return this.generateDuplicateId(id, count + 1);
    } else {
      return dupId;
    }
  }

  private generateMissingId(count = 1): string {
    const missingId = `missing(${count})`;
    if (this._ids.has(missingId)) {
      return this.generateMissingId(count + 1);
    } else {
      return missingId;
    }
  }

  register(id?: unknown): string {
    const idStr = id === undefined ? undefined : String(id).trim();
    let newId: string;

    if (!idStr) {
      // No id is provided, so generate one
      newId = this.generateMissingId();
    } else if (this._ids.has(idStr)) {
      // The provided id is already registered with another uuid (i.e. it's not unique), so just generate a new one
      newId = this.generateDuplicateId(idStr);
    } else {
      // The provided id is not already registered, so use it
      newId = idStr;
    }

    this._ids.add(newId);
    this.notify();
    return newId;
  }

  unregister(id: string) {
    this._ids.delete(id);
    this.notify();
  }

  subscribe(observer: Observer) {
    this._observers.add(observer);
    observer(this.ids);
  }

  unsubscribe(observer: Observer) {
    this._observers.delete(observer);
  }

  // Notify all observers about an event.
  notify() {
    this._observers.forEach((observer) => observer(this.ids));
  }

  get ids(): string[] {
    return Array.from(this._ids);
  }
}

/** Gets a unique option item ID. If the requested ID is already taken, returns a unique ID based on the requested ID. */
export const useOptionsItemId = (
  requestedId?: string,
  idManager?: OptionsItemIdManager
) => {
  const [registeredId, setRegisteredId] = useState<string | undefined>();

  useIsomorphicLayoutEffect(() => {
    if (!idManager) {
      return;
    }

    const localId = idManager.register(requestedId);
    setRegisteredId(localId);
    return () => {
      if (localId) {
        idManager.unregister(localId);
      }
    };
  }, [requestedId, idManager]);

  return {
    registeredId,
    idError: (() => {
      if (requestedId === undefined) {
        return "Value must be defined";
      }
      if (typeof requestedId !== "string") {
        return "Value must be a string";
      }
      if (!requestedId.trim()) {
        return "Value must be defined";
      }
      if (idManager && requestedId != registeredId) {
        return "Value must be unique";
      }
      return undefined;
    })(),
  };
};

/**
 * Hook that creates and returns an OptionsItemIdManager instance to manage unique IDs.
 *
 * This hook is useful for components that need to track and manage a collection of unique IDs,
 * such as select options, radio groups, checkbox groups, etc. It handles the registration and
 * unregistration of IDs, ensuring uniqueness and providing notifications when the collection changes.
 *
 * @param callback - A function that will be called with the current IDs when they change.
 * @param existing - An existing OptionsItemIdManager instance to use. If not provided, a new instance will be created.
 */
export function useIdManager(
  callback: (ids: string[]) => void,
  existing?: OptionsItemIdManager
) {
  const idManager = useMemo(
    () => existing ?? new OptionsItemIdManager(),
    [existing]
  );

  useEffect(() => {
    idManager.subscribe(callback);

    return () => {
      idManager.unsubscribe(callback);
    };
  }, [idManager, callback]);

  return idManager;
}
