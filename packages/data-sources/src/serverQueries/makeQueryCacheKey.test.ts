import { describe, expect, it } from "vitest";

import { noopFn } from "../utils";
import { makeQueryCacheKey } from "./makeQueryCacheKey";

describe("makeQueryCacheKey", () => {
  it("returns id and params in JSON array", () => {
    expect(makeQueryCacheKey("foo", ["bar"])).toEqual(`foo:["bar"]`);
    expect(makeQueryCacheKey("q", [])).toEqual(`q:[]`);
    expect(makeQueryCacheKey("q", [null, false, 0, ""])).toEqual(
      `q:[null,false,0,""]`
    );
    expect(makeQueryCacheKey("q", [1, "a", {}, []])).toEqual(`q:[1,"a",{},[]]`);
    expect(makeQueryCacheKey("q", [{ a: { b: { c: [1, 2, 3] } } }])).toEqual(
      `q:[{"a":{"b":{"c":[1,2,3]}}}]`
    );
  });
  it("sorts objects", () => {
    expect(
      makeQueryCacheKey("q", [
        { b: 2, a: 1, c: 3 },
        [{ deep: { c: 3, b: 2, a: 1 } }],
      ])
    ).toEqual(`q:[{"a":1,"b":2,"c":3},[{"deep":{"a":1,"b":2,"c":3}}]]`);
  });
  it("converts special values that JSON.stringify normally doesn't handle", () => {
    expect(makeQueryCacheKey("q", [undefined])).toEqual(`q:["ρ:UNDEFINED"]`);
    expect(makeQueryCacheKey("q", [() => {}])).toEqual(`q:["ρ:FUNCTION:"]`);
    expect(makeQueryCacheKey("q", [noopFn])).toEqual(`q:["ρ:FUNCTION:noopFn"]`);
    expect(makeQueryCacheKey("q", [Symbol()])).toEqual(
      `q:["ρ:SYMBOL:undefined"]`
    );
    expect(makeQueryCacheKey("q", [Symbol("description")])).toEqual(
      `q:["ρ:SYMBOL:description"]`
    );
    expect(makeQueryCacheKey("q", [BigInt("9007199254740992")])).toEqual(
      `q:["9007199254740992"]`
    );
  });
  it("replaces circular object reference to root", () => {
    const self: any = {};
    self.self = self;
    expect(makeQueryCacheKey("q", [self])).toEqual(`q:[{"self":"ρ:REF:$.0"}]`);
  });
  it("replaces circular array reference to root", () => {
    const self: any[] = [];
    self.push(self);
    expect(makeQueryCacheKey("q", [self])).toEqual(`q:[["ρ:REF:$.0"]]`);
  });
  it("replaces circular reference to inner objects", () => {
    const obj: any = { items: [{ id: 1 }, { id: 2 }] };
    obj.first = obj.items[0];
    obj.last = obj.items[1];
    expect(makeQueryCacheKey("q", [obj, obj.items[1]])).toEqual(
      `q:[{"first":{"id":1},"items":["ρ:REF:$.0.first",{"id":2}],"last":"ρ:REF:$.0.items.1"},"ρ:REF:$.0.items.1"]`
    );
  });
});
