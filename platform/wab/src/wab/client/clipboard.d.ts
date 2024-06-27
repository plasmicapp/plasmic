/**
 * As of 2020-12-03, TypeScript stdlib does not support experimental
 * Clipboard API. The definitions in this file extend Permissions and
 * Clipboard in order to support it.
 *
 * https://wiki.developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
 */

interface Permissions {
  query(clipboardRead: { name: "clipboard-read" }): Promise<PermissionStatus>;
}

interface ClipboardItem {
  types: Array<string>;
  getType(format: string): Promise<Blob | null>;
}

// eslint-disable-next-line no-var
declare var ClipboardItem: {
  prototype: ClipboardItem;
  new (objects: Record<string, Blob>): ClipboardItem;
};

interface Clipboard {
  read?(): Promise<Array<ClipboardItem>>;
  write?(items: Array<ClipboardItem>): Promise<void>;
}
