import { BinaryLike, createHash } from "crypto";

export function md5(input: BinaryLike) {
  return createHash("md5").update(input).digest("hex");
}

export const sha256 = (x: string) =>
  createHash("sha256").update(x).digest("hex");

/**
 * @param str string to be hashed
 * @returns Hashes `str` into a pair of 32 bit integers
 */
export function stringToPair(str: string): number[] {
  const buf = createHash("sha256").update(str).digest();
  return [buf.readInt32LE(0), buf.readInt32LE(4)];
}
