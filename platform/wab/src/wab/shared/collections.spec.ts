import {
  arrayEqual,
  arrayInsert,
  arrayInsertAt,
  arrayMoveIndex,
  arrayRemove,
  arrayRemoveAll,
  arrayRemoveAt,
  arrayReplaceAt,
  arrayReversed,
  matchOrder,
} from "@/wab/shared/collections";

describe("matchOrder", () => {
  it("should work", () => {
    const xs = ["4", "3", "1", "."].map((k) => ({ k, g: 0 }));
    const ys = ["3", ".", "1", "4"].map((k) => ({ k, g: 1 }));
    const expected = ["3", ".", "1", "4"].map((k) => ({ k, g: 0 }));
    expect(matchOrder(xs, ys, (x) => x.k)).toEqual(expected);
  });
});

describe("Array manipulation functions", () => {
  describe("arrayInsertAt", () => {
    it("should insert at the end when index is undefined", () => {
      const arr = [1, 2, 3];
      expect(arrayInsertAt(arr, 4)).toEqual([1, 2, 3, 4]);
      expect(arr).toEqual([1, 2, 3]); // Original unchanged
    });

    it("should insert at the beginning", () => {
      const arr = [2, 3, 4];
      expect(arrayInsertAt(arr, 1, 0)).toEqual([1, 2, 3, 4]);
    });

    it("should insert in the middle", () => {
      const arr = [1, 3, 4];
      expect(arrayInsertAt(arr, 2, 1)).toEqual([1, 2, 3, 4]);
    });

    it("should insert at the end with explicit index", () => {
      const arr = [1, 2, 3];
      expect(arrayInsertAt(arr, 4, 3)).toEqual([1, 2, 3, 4]);
    });
  });

  describe("arrayRemoveAt", () => {
    it("should remove element at index", () => {
      const arr = [1, 2, 3, 4];
      expect(arrayRemoveAt(arr, 0)).toEqual([2, 3, 4]);
      expect(arrayRemoveAt(arr, 1)).toEqual([1, 3, 4]);
      expect(arrayRemoveAt(arr, 3)).toEqual([1, 2, 3]);
      expect(arr).toEqual([1, 2, 3, 4]); // Original unchanged
    });

    it("should handle single element array", () => {
      expect(arrayRemoveAt([1], 0)).toEqual([]);
    });
  });

  describe("arrayMoveIndex", () => {
    it("should move element forward", () => {
      const arr = [1, 2, 3, 4];
      expect(arrayMoveIndex(arr, 0, 2)).toEqual([2, 3, 1, 4]);
    });

    it("should move element backward", () => {
      const arr = [1, 2, 3, 4];
      expect(arrayMoveIndex(arr, 3, 1)).toEqual([1, 4, 2, 3]);
    });

    it("should handle same position", () => {
      const arr = [1, 2, 3];
      expect(arrayMoveIndex(arr, 1, 1)).toEqual([1, 2, 3]);
    });
  });

  describe("arrayEqual", () => {
    it("should return true for identical arrays", () => {
      const arr = [1, 2, 3];
      expect(arrayEqual(arr, arr)).toBe(true);
    });

    it("should return true for equal arrays", () => {
      expect(arrayEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(arrayEqual([], [])).toBe(true);
    });

    it("should return false for different lengths", () => {
      expect(arrayEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("should return false for different values", () => {
      expect(arrayEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("should use shallow comparison", () => {
      const obj = { a: 1 };
      expect(arrayEqual([obj], [obj])).toBe(true);
      expect(arrayEqual([{ a: 1 }], [{ a: 1 }])).toBe(false);
    });
  });

  describe("arrayInsert", () => {
    it("should insert at the end when index is undefined", () => {
      const arr = [1, 2, 3];
      arrayInsert(arr, 4);
      expect(arr).toEqual([1, 2, 3, 4]);
    });

    it("should insert at specific index", () => {
      const arr = [1, 3, 4];
      arrayInsert(arr, 2, 1);
      expect(arr).toEqual([1, 2, 3, 4]);
    });

    it("should insert at the beginning", () => {
      const arr = [2, 3];
      arrayInsert(arr, 1, 0);
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe("arrayRemoveAll", () => {
    it("should remove all occurrences", () => {
      const arr = [1, 2, 3, 2, 4, 2];
      arrayRemoveAll(arr, 2);
      expect(arr).toEqual([1, 3, 4]);
    });

    it("should handle no occurrences", () => {
      const arr = [1, 2, 3];
      arrayRemoveAll(arr, 4);
      expect(arr).toEqual([1, 2, 3]);
    });

    it("should handle empty array", () => {
      const arr: number[] = [];
      arrayRemoveAll(arr, 1);
      expect(arr).toEqual([]);
    });
  });

  describe("arrayRemove", () => {
    it("should remove first occurrence", () => {
      const arr = [1, 2, 3, 2];
      arrayRemove(arr, 2);
      expect(arr).toEqual([1, 3, 2]);
    });

    it("should throw if element not found", () => {
      const arr = [1, 2, 3];
      expect(() => arrayRemove(arr, 4)).toThrow();
    });
  });

  describe("arrayReversed", () => {
    it("should return reversed copy", () => {
      const arr = [1, 2, 3, 4];
      const reversed = arrayReversed(arr);
      expect(reversed).toEqual([4, 3, 2, 1]);
      expect(arr).toEqual([1, 2, 3, 4]); // Original unchanged
    });

    it("should handle empty array", () => {
      expect(arrayReversed([])).toEqual([]);
    });

    it("should handle single element", () => {
      expect(arrayReversed([1])).toEqual([1]);
    });
  });

  describe("arrayReplaceAt", () => {
    it("should replace element at index", () => {
      const arr = [1, 2, 3, 4];
      expect(arrayReplaceAt(arr, 0, 10)).toEqual([10, 2, 3, 4]);
      expect(arrayReplaceAt(arr, 2, 30)).toEqual([1, 2, 30, 4]);
      expect(arr).toEqual([1, 2, 3, 4]); // Original unchanged
    });

    it("should handle out of bounds index", () => {
      const arr = [1, 2, 3];
      expect(arrayReplaceAt(arr, 5, 10)).toEqual([1, 2, 3]);
    });
  });
});
