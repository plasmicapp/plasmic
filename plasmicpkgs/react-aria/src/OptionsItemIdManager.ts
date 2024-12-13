type Observer = (ids: string[]) => void;

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

  // Notify all observers about an event.
  notify() {
    this._observers.forEach((observer) => observer(this.ids));
  }

  get ids(): string[] {
    return Array.from(this._ids);
  }
}
