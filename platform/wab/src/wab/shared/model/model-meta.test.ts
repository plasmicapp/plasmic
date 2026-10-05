import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { NullOrUndefinedValueError } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";
import { instUtil } from "@/wab/shared/model/InstUtil";
import { ObjInst } from "@/wab/shared/model/classes";
import {
  Class,
  Field,
  MetaRuntime,
  Type,
  withoutUids,
} from "@/wab/shared/model/model-meta";

const hasOwn = (obj: object, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

describe("model-meta", () => {
  it("should stamp seen references", function () {
    let x = { uid: 111 } as any;
    x.x = x;
    expect(withoutUids(x)).toEqual({ x: "[seen@0]" });
    x = { uid: 111 } as any;
    x.x = { uid: 222 } as any;
    x.y = x.x;
    return expect(withoutUids(x)).toEqual({ x: {}, y: "[seen@1]" });
  });

  const field = (name: string, annotations: Field["annotations"] = []) =>
    new Field({
      name,
      type: new Type({ type: "Any", params: [] }),
      annotations,
    });
  const baseClass = new Class({
    name: "Base",
    base: null,
    concrete: false,
    fields: [field("c")],
  });
  const fooClass = new Class({
    name: "Foo",
    base: "Base",
    concrete: true,
    fields: [field("a"), field("b"), field("t", ["Transient"])],
  });
  const mkRuntime = () => new MetaRuntime([baseClass, fooClass], 0);

  class FooInst {}

  describe("initializers", () => {
    const assignThenDelete = (args: any) => {
      const inst: any = Object.assign(new FooInst(), args);
      if ("__type" in args) {
        delete inst["__type"];
      }
      inst.uid = 1;
      return inst;
    };

    const shape = (inst: any) => ({
      keys: Reflect.ownKeys(inst),
      descriptors: Object.getOwnPropertyDescriptors(inst),
      proto: Object.getPrototypeOf(inst),
    });

    const argsByTypeKeyPosition: Record<string, any>[] = [
      { __type: "Foo", a: 1, b: 2, c: 3 },
      { a: 1, __type: "Foo", b: 2, c: 3 },
      { a: 1, b: 2, c: 3, __type: "Foo" },
      { c: { x: 1 }, b: [1], __type: "Foo", a: "s" },
    ];

    it.each(
      argsByTypeKeyPosition.map((args) => [Object.keys(args).join(","), args]),
    )(
      "gives the same instance as assign-then-delete, keys %s",
      (_keys, args) => {
        const rt = mkRuntime();
        const argsJson = JSON.stringify(args);
        // The second call runs with warm field caches.
        for (let i = 0; i < 2; i++) {
          const inst = rt.initializers.Foo(new FooInst(), args);
          const expected = assignThenDelete(args);
          expected.uid = inst.uid;
          expect(shape(inst)).toEqual(shape(expected));
          expect(hasOwn(inst, "__type")).toBe(false);
          expect("__type" in inst).toBe(false);
        }
        expect(JSON.stringify(args)).toEqual(argsJson);
        expect("__type" in args).toBe(true);
      },
    );

    it("never writes or deletes __type on the instance", () => {
      const touched: string[] = [];
      const note = (op: string, key: PropertyKey) => {
        if (key === "__type") {
          touched.push(op);
        }
      };
      const inst = new Proxy(new FooInst(), {
        set: (target, key, value, receiver) => {
          note("set", key);
          return Reflect.set(target, key, value, receiver);
        },
        defineProperty: (target, key, descriptor) => {
          note("define", key);
          return Reflect.defineProperty(target, key, descriptor);
        },
        deleteProperty: (target, key) => {
          note("delete", key);
          return Reflect.deleteProperty(target, key);
        },
      });
      mkRuntime().initializers.Foo(inst, {
        __type: "Foo",
        a: 1,
        b: 2,
        c: 3,
      });
      expect(touched).toEqual([]);
      expect(Object.keys(inst)).toEqual(["a", "b", "c", "uid"]);
    });

    it("assigns fields in args order and adds uid last when args have no __type", () => {
      const inst = mkRuntime().initializers.Foo(new FooInst(), {
        a: 1,
        b: 2,
        c: 3,
      });
      expect(Object.keys(inst)).toEqual(["a", "b", "c", "uid"]);
    });

    it("treats null args as empty and reports the missing fields", () => {
      expect(() => mkRuntime().initializers.Foo(new FooInst(), null)).toThrow(
        "Unexpected fields on [Foo]:\n- a\n  - b\n  - c",
      );
    });

    it("throws a plain Error naming the extra field", () => {
      const args = { __type: "Foo", a: 1, b: 2, c: 3, zzz: 4 };
      let err: any;
      try {
        mkRuntime().initializers.Foo(new FooInst(), args);
      } catch (e) {
        err = e;
      }
      expect(err.constructor).toBe(Error);
      expect(err.message).toEqual("Unexpected fields on [Foo]:\n+ zzz");
    });

    it("refuses to instantiate an abstract class", () => {
      expect(() => mkRuntime().initializers.Base(new FooInst(), {})).toThrow(
        "cannot instantiate abstract class",
      );
    });

    describe("non-strict mode", () => {
      let warn: ReturnType<typeof vi.spyOn>;
      beforeEach(() => {
        warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      });
      afterEach(() => warn.mockRestore());

      it("gives the same instance as assign-then-delete, including a JSON __proto__ key", () => {
        const rt = mkRuntime();
        rt.setStrict(false);
        const args = JSON.parse(
          '{"a":1,"__type":"Foo","__proto__":{"p":1},"b":2,"c":3,"zzz":4}',
        );
        const inst = rt.initializers.Foo(new FooInst(), args);
        const expected = assignThenDelete(args);
        expected.uid = inst.uid;
        expect(shape(inst)).toEqual(shape(expected));
        expect(Object.getPrototypeOf(inst)).toEqual({ p: 1 });
        expect(warn).toHaveBeenCalledTimes(1);
      });
    });

    it("leaves __type off every instance built by unbundling", async () => {
      const bundler = new Bundler();
      const bundle = bundler.bundle(
        createSite(),
        "site-uuid",
        await getLastBundleVersion(),
      );
      const bundled = Object.values(bundle.map);
      expect(bundled.length).toBeGreaterThan(1);
      expect(bundled.every((json) => hasOwn(json, "__type"))).toBe(true);

      const root = new Bundler().unbundle(
        JSON.parse(JSON.stringify(bundle)),
        "site-uuid",
      );
      const seen = new Set<ObjInst>();
      const visit = (value: unknown) => {
        if (Array.isArray(value)) {
          value.forEach(visit);
        } else if (instUtil.isObjInst(value) && !seen.has(value)) {
          seen.add(value);
          Object.values(value).forEach(visit);
        }
      };
      visit(root);
      expect(seen.size).toBeGreaterThanOrEqual(bundled.length);
      expect([...seen].filter((inst) => hasOwn(inst, "__type"))).toEqual([]);
    });
  });

  describe("field caches", () => {
    it("returns the same values on a cache miss and a cache hit", () => {
      const rt = mkRuntime();
      const missFields = rt.allFields(fooClass);
      const missKeys = rt.allFieldKeys(fooClass);
      const missTransient = rt.allTransientFieldKeys(fooClass);
      const hitFields = rt.allFields(fooClass);
      const hitKeys = rt.allFieldKeys(fooClass);
      const hitTransient = rt.allTransientFieldKeys(fooClass);
      expect(hitFields).toBe(missFields);
      expect(hitKeys).toBe(missKeys);
      expect(hitTransient).toBe(missTransient);
      expect(hitFields.map((f) => f.name)).toEqual(["a", "b", "t", "c"]);
      expect([...hitKeys]).toEqual(["a", "b", "t", "c"]);
      expect([...hitTransient]).toEqual(["t"]);
    });

    it("throws a TypeError for an undefined class", () => {
      expect(() => mkRuntime().allFields(undefined as any)).toThrow(TypeError);
    });

    it.each([
      ["allFields", "clsToFieldsCache", "clsToFieldsCache"],
      ["allFieldKeys", "clsToFieldKeysCache", "clsToFieldKeysCache"],
      [
        "allTransientFieldKeys",
        "clsToTransientFieldKeysCache",
        "clsToPersistentFieldKeysCache",
      ],
    ] as const)(
      "%s throws a NullOrUndefinedValueError naming the class when its cache entry is undefined",
      (getter, cacheName, nameInMessage) => {
        const rt = mkRuntime();
        (rt as any)[cacheName].set(fooClass, undefined);
        let err: any;
        try {
          rt[getter](fooClass);
        } catch (e) {
          err = e;
        }
        expect(err).toBeInstanceOf(NullOrUndefinedValueError);
        expect(err.message).toEqual(
          `Value must not be undefined or null- Class ${fooClass} does not exist in ${nameInMessage}`,
        );
      },
    );
  });
});
