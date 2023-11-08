import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";

export function base64StringToBuffer(bstr: string) {
  try {
    bstr = atob(bstr);
  } catch (e) {
    throw new DataSourceError("Invalid base64 for binary type");
  }
  const uint8Array = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    uint8Array[i] = bstr.charCodeAt(i);
  }
  return uint8Array.buffer;
}
