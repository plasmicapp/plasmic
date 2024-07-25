import { isTruthy } from "@/wab/shared/common";

export function naturalSort<T>(items: T[], sortBy: (item: T) => string): T[] {
  return items
    .map((item) => ({
      item,
      parts: sortBy(item)
        .split(/(\d+(?:\.\d+)?)/)
        .filter<string>(isTruthy)
        .map((stringPart) => {
          const numberPart = parseFloat(stringPart);
          return isNaN(numberPart) ? stringPart : numberPart;
        }),
    }))
    .sort((a, b) => {
      const minLength = Math.min(a.parts.length, b.parts.length);

      for (let i = 0; i < minLength; i++) {
        const aPart = a.parts[i];
        const bPart = b.parts[i];

        if (typeof aPart === "number" && typeof bPart === "number") {
          if (aPart !== bPart) {
            return aPart - bPart;
          }
        } else if (aPart !== bPart) {
          return String(aPart).localeCompare(String(bPart));
        }
      }

      return a.parts.length - b.parts.length;
    })
    .map((item) => item.item);
}
