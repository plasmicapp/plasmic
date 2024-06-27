// From https://stackoverflow.com/a/57391629/43118

import { ensure } from "@/wab/shared/common";

export function stringToUTF8Bytes(string: string) {
  return new TextEncoder().encode(string);
}

export function stringToUTF16Bytes(string: string, littleEndian = false) {
  const bytes = new Uint8Array(string.length * 2);
  // Using DataView is the only way to get a specific
  // endianness.
  const view = new DataView(bytes.buffer);
  for (let i = 0; i != string.length; i++) {
    view.setUint16(i, string.charCodeAt(i), littleEndian);
  }
  return bytes;
}

export function stringToUTF32Bytes(string: string, littleEndian = false) {
  const codepoints = Array.from(string, (c) => ensure(c.codePointAt(0)));
  const bytes = new Uint8Array(codepoints.length * 4);
  // Using DataView is the only way to get a specific
  // endianness.
  const view = new DataView(bytes.buffer);
  for (let i = 0; i != codepoints.length; i++) {
    view.setUint32(i, codepoints[i], littleEndian);
  }
  return bytes;
}

export function bytesToStringUTF8(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

export function bytesToStringUTF16(bytes: Uint8Array, littleEndian = false) {
  return new TextDecoder(littleEndian ? "UTF-16LE" : "UTF-16BE").decode(bytes);
}

export function bytesToStringUTF32(bytes: Uint8Array, littleEndian = false) {
  const view = new DataView(bytes.buffer);
  const codepoints = new Uint32Array(view.byteLength / 4);
  for (let i = 0; i !== codepoints.length; i++) {
    codepoints[i] = view.getUint32(i * 4, littleEndian);
  }
  return String.fromCodePoint(...codepoints);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i !== bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
