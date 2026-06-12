import { describe, expect, it } from "vitest";

import { noopFn } from "../utils";
import { StatefulQueryResult } from "./common";
import { makeQueryCacheKey, matchesQueryCacheKey } from "./makeQueryCacheKey";

describe("makeQueryCacheKey", () => {
  it("returns id and params in JSON array", () => {
    expect(makeQueryCacheKey("foo", ["bar"])).toEqual(`$q.$.foo.$.["bar"]`);
    expect(makeQueryCacheKey("q", [])).toEqual(`$q.$.q.$.[]`);
    expect(makeQueryCacheKey("q", [null, false, 0, ""])).toEqual(
      `$q.$.q.$.[null,false,0,""]`
    );
    expect(makeQueryCacheKey("q", [1, "a", {}, []])).toEqual(
      `$q.$.q.$.[1,"a",{},[]]`
    );
    expect(makeQueryCacheKey("q", [{ a: { b: { c: [1, 2, 3] } } }])).toEqual(
      `$q.$.q.$.[{"a":{"b":{"c":[1,2,3]}}}]`
    );
  });
  it("sorts objects", () => {
    expect(
      makeQueryCacheKey("q", [
        { b: 2, a: 1, c: 3 },
        [{ deep: { c: 3, b: 2, a: 1 } }],
      ])
    ).toEqual(`$q.$.q.$.[{"a":1,"b":2,"c":3},[{"deep":{"a":1,"b":2,"c":3}}]]`);
  });
  it("converts special values that JSON.stringify normally doesn't handle", () => {
    expect(makeQueryCacheKey("q", [undefined])).toEqual(
      `$q.$.q.$.["ρ:UNDEFINED"]`
    );
    expect(makeQueryCacheKey("q", [() => {}])).toEqual(
      `$q.$.q.$.["ρ:FUNCTION:"]`
    );
    expect(makeQueryCacheKey("q", [noopFn])).toEqual(
      `$q.$.q.$.["ρ:FUNCTION:noopFn"]`
    );
    expect(makeQueryCacheKey("q", [Symbol()])).toEqual(
      `$q.$.q.$.["ρ:SYMBOL:undefined"]`
    );
    expect(makeQueryCacheKey("q", [Symbol("description")])).toEqual(
      `$q.$.q.$.["ρ:SYMBOL:description"]`
    );
    expect(makeQueryCacheKey("q", [BigInt("9007199254740992")])).toEqual(
      `$q.$.q.$.["9007199254740992"]`
    );
  });
  it("replaces circular object reference to root", () => {
    const self: any = {};
    self.self = self;
    expect(makeQueryCacheKey("q", [self])).toEqual(
      `$q.$.q.$.[{"self":"ρ:REF:$.0"}]`
    );
  });
  it("replaces circular array reference to root", () => {
    const self: any[] = [];
    self.push(self);
    expect(makeQueryCacheKey("q", [self])).toEqual(`$q.$.q.$.[["ρ:REF:$.0"]]`);
  });
  it("replaces circular reference to inner objects", () => {
    const obj: any = { items: [{ id: 1 }, { id: 2 }] };
    obj.first = obj.items[0];
    obj.last = obj.items[1];
    expect(makeQueryCacheKey("q", [obj, obj.items[1]])).toEqual(
      `$q.$.q.$.[{"first":{"id":1},"items":["ρ:REF:$.0.first",{"id":2}],"last":"ρ:REF:$.0.items.1"},"ρ:REF:$.0.items.1"]`
    );
  });
  it("serializes StatefulQueryResult is each state", () => {
    const initial = new StatefulQueryResult();

    const done = new StatefulQueryResult();
    done.resolvePromise("key1", { b: 2, a: 1, c: 3 });

    const errored = new StatefulQueryResult();
    errored.rejectPromise("key2", new Error("boom"));

    expect(makeQueryCacheKey("fn", [initial, done, errored])).toEqual(
      `$q.$.fn.$.[{"key":null,"state":"initial"},{"data":{"a":1,"b":2,"c":3},"key":"key1","state":"done"},{"error":{},"key":"key2","state":"done"}]`
    );
  });
});

describe("matchesQueryCacheKey", () => {
  it("matches server query cache keys by exact id", () => {
    const key = makeQueryCacheKey("myns.myFunc", ["bar"]);
    expect(matchesQueryCacheKey(key, "myns.myFunc")).toBe(true);
    expect(matchesQueryCacheKey(key, "myns")).toBe(false);
    expect(matchesQueryCacheKey(key, "myFunc")).toBe(false);
    expect(matchesQueryCacheKey(key, "myns.myFunc2")).toBe(false);
  });
  it("does not prefix-match unrelated keys", () => {
    expect(matchesQueryCacheKey(`user:123`, "user")).toBe(false);
  });
  it("matches data op cache keys", () => {
    const dataOpKey = `plasmic.$.myCacheKey.$.someOpId.$.{"sourceId":"s"}`;
    expect(matchesQueryCacheKey(dataOpKey, "myCacheKey")).toBe(true);
    expect(matchesQueryCacheKey(dataOpKey, "someOpId")).toBe(true);
    expect(matchesQueryCacheKey(dataOpKey, "otherOpId")).toBe(false);
  });
});
