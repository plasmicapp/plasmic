import React from "react";
import { flattenChildren } from "./utils";

function getKeys(nodes: React.ReactNode[]): (string | null)[] {
  return nodes.map((node) =>
    React.isValidElement(node) ? (node.key as string | null) : null
  );
}

describe("flattenChildren", () => {
  it("returns an empty array for null/undefined", () => {
    expect(flattenChildren(null)).toEqual([]);
    expect(flattenChildren(undefined)).toEqual([]);
  });

  it("returns a list of elements when there are no fragments", () => {
    const children = [
      <div key="a">a</div>,
      <div key="b">b</div>,
      <div key="c">c</div>,
    ];
    const result = flattenChildren(children);
    expect(result).toHaveLength(3);
    const keys = getKeys(result);
    expect(new Set(keys).size).toBe(3);
    keys.forEach((k) => expect(typeof k).toBe("string"));
  });

  it("preserves strings and numbers", () => {
    const result = flattenChildren(["hello", 42, <div key="x">x</div>]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("hello");
    expect(result[1]).toBe(42);
    expect(React.isValidElement(result[2])).toBe(true);
  });

  it("skips null, undefined and boolean children", () => {
    const result = flattenChildren([
      null,
      undefined,
      true,
      false,
      <div key="x">x</div>,
    ]);
    expect(result).toHaveLength(1);
    expect(React.isValidElement(result[0])).toBe(true);
  });

  it("flattens a fragment, unwrapping its children", () => {
    const result = flattenChildren(
      <>
        <div key="a">a</div>
        <div key="b">b</div>
      </>
    );
    expect(result).toHaveLength(2);
    const keys = getKeys(result);
    expect(new Set(keys).size).toBe(2);
  });

  it("flattens nested fragments", () => {
    const result = flattenChildren(
      <>
        <div key="a">a</div>
        <>
          <div key="b">b</div>
          <>
            <div key="c">c</div>
          </>
        </>
        <div key="d">d</div>
      </>
    );
    expect(result).toHaveLength(4);
    const keys = getKeys(result);
    expect(new Set(keys).size).toBe(4);
  });

  it("produces unique keys for duplicate keys in different fragments", () => {
    const result = flattenChildren(
      <>
        <>
          <div key="dup">a</div>
        </>
        <>
          <div key="dup">b</div>
        </>
      </>
    );
    expect(result).toHaveLength(2);
    const keys = getKeys(result);
    expect(keys[0]).not.toEqual(keys[1]);
  });

  it("preserves explicit keys on elements", () => {
    const result = flattenChildren([
      <div key="foo">foo</div>,
      <div key="bar">bar</div>,
    ]);
    expect(result).toHaveLength(2);
    const keys = getKeys(result);
    expect(keys[0]).toContain("foo");
    expect(keys[1]).toContain("bar");
  });

  it("includes parent fragment key in flattened child keys", () => {
    const result = flattenChildren(
      <React.Fragment key="outer">
        <div key="inner">x</div>
      </React.Fragment>
    );
    expect(result).toHaveLength(1);
    const key = getKeys(result)[0];
    expect(key).toContain("outer");
    expect(key).toContain("inner");
  });

  it("flattens JSX array expressions inside a fragment", () => {
    const result = flattenChildren(
      <>
        {[<div key="a">a</div>, <div key="b">b</div>]}
        <div key="c">c</div>
      </>
    );
    expect(result).toHaveLength(3);
    const keys = getKeys(result);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).toContain("a");
    expect(keys[1]).toContain("b");
    expect(keys[2]).toContain("c");
  });
});
