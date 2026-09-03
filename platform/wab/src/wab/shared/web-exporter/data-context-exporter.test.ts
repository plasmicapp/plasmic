import { StatefulQueryResult } from "@/wab/shared/core/custom-functions";
import { buildDataContextResourceResult } from "@/wab/shared/web-exporter/data-context-exporter";
import { jsonToXml } from "@/wab/shared/web-exporter/json-to-xml";
import { DataPathJson } from "@/wab/shared/web-exporter/schema";
import { mkMetaName } from "@plasmicapp/host";

function countRealPaths(nodes: DataPathJson[]): number {
  return nodes.reduce(
    (count, node) =>
      count + (node.name === "…" ? 0 : 1) + countRealPaths(node.children ?? []),
    0
  );
}

describe("buildDataContextResourceResult", () => {
  it("unwraps $q StatefulQueryResult instances to data/isLoading/error", () => {
    const resolved = new StatefulQueryResult<{ id: number; name: string }[]>();
    resolved.resolvePromise("orders", [{ id: 1, name: "Ada" }]);
    const loading = new StatefulQueryResult();

    const { resource } = buildDataContextResourceResult(
      { $q: { orders: resolved, pending: loading } },
      {
        componentUuid: "C1",
        scope: "root",
        componentServerQueryNames: ["orders", "pending"],
      }
    );
    expect(resource).toMatchSnapshot();
  });

  it("element scope: unwraps $q StatefulQueryResult instances", () => {
    const resolved = new StatefulQueryResult<{ ok: boolean }>();
    resolved.resolvePromise("status", { ok: true });

    const { resource } = buildDataContextResourceResult(
      { $q: { status: resolved } },
      { componentUuid: "C1", elementUuid: "T1", scope: "element" }
    );
    expect(resource).toMatchSnapshot();
  });

  it("leaves already-unwrapped $q snapshots untouched (preserves error)", () => {
    // An env pre-shaped by prepareEnvForDataPicker holds plain snapshots, not
    // StatefulQueryResult instances. Re-unwrapping would drop the error.
    const { resource } = buildDataContextResourceResult(
      { $q: { failed: { data: undefined, isLoading: false, error: "boom" } } },
      {
        componentUuid: "C1",
        scope: "root",
        componentServerQueryNames: ["failed"],
      }
    );
    expect(jsonToXml(resource)).toContain(
      'name="error" type="string" value=\'"boom"\''
    );
  });

  it("element scope: primitives, nested objects, $$ stripping, depth truncation", () => {
    const { resource } = buildDataContextResourceResult(
      {
        $$: { internal: true },
        $props: { title: "Hello", count: 3 },
        $state: { isOpen: false },
        $queries: {
          users: {
            data: [{ id: 1, name: "Ada" }],
            isLoading: false,
            error: null,
          },
        },
        $ctx: { params: { slug: "my-page" } },
        currentItem: { id: 1, name: "Ada" },
        currentIndex: 0,
      },
      { componentUuid: "C1", elementUuid: "T1", scope: "element" }
    );
    expect(resource).toMatchSnapshot();
  });

  it("root scope: keeps $state and filters $queries/$q to component-owned names", () => {
    const { resource } = buildDataContextResourceResult(
      {
        $props: { title: "Hello" },
        $state: { isOpen: false },
        $queries: { mine: { data: [1, 2, 3] }, foreign: { data: 9 } },
        $q: {
          serverMine: { data: { ok: true } },
          serverForeign: { data: { ok: false } },
        },
        $ctx: { params: { slug: "x" } },
      },
      {
        componentUuid: "C1",
        scope: "root",
        componentDataQueryNames: ["mine"],
        componentServerQueryNames: ["serverMine"],
      }
    );
    expect(resource).toMatchSnapshot();
  });

  it("depth=5 reaches query row fields ($q.name.data[0].field)", () => {
    const { resource } = buildDataContextResourceResult(
      {
        $q: {
          orders: {
            data: [{ id: 1, customer: "Ada" }],
            isLoading: false,
          },
        },
      },
      {
        componentUuid: "C1",
        scope: "root",
        componentServerQueryNames: ["orders"],
      }
    );
    // $q (1) -> orders (2) -> data (3) -> [0] (4) -> customer (5)
    expect(resource).toMatchSnapshot();
  });

  it("promotes __plasmic_meta_<key>.label and drops hidden/advanced fields", () => {
    const { resource } = buildDataContextResourceResult(
      {
        $queries: {
          users: { data: [{ id: 1 }], isLoading: false },
          [mkMetaName("users")]: { label: "Users" },
        },
        $state: {
          visibleField: 1,
          hiddenField: 2,
          advancedField: 3,
          [mkMetaName("hiddenField")]: { hidden: true },
          [mkMetaName("advancedField")]: { advanced: true },
        },
      },
      { componentUuid: "C1", elementUuid: "T1", scope: "element" }
    );
    expect(resource).toMatchSnapshot();
  });

  it("truncates arrays past maxArrayItems and objects past maxKeysPerObject", () => {
    const wideObj: Record<string, number> = {};
    for (let i = 0; i < 5; i++) {
      wideObj[`key${i}`] = i;
    }
    const { resource } = buildDataContextResourceResult(
      { items: [1, 2, 3, 4, 5, 6, 7], wide: wideObj },
      {
        componentUuid: "C1",
        scope: "element",
        maxArrayItems: 3,
        maxKeysPerObject: 3,
      }
    );
    expect(resource).toMatchSnapshot();
  });

  it("hides react-element values (slot content shown in tpl tree, not bindable data)", () => {
    const reactElt = { $$typeof: Symbol.for("react.element"), type: "div" };
    const { resource } = buildDataContextResourceResult(
      { $props: { children: reactElt } },
      { componentUuid: "C1", elementUuid: "T1", scope: "element" }
    );
    const props = resource.paths.find((p) => p.name === "$props");
    expect(props?.children ?? []).toEqual([]);
    expect(resource).toMatchSnapshot();
  });

  it("caps the total number of emitted paths via maxTotalPaths", () => {
    // A payload that, emits more nodes than the cap: 20 objects of 3 keys
    // each = 80 nodes, none of which exceeds maxKeysPerObject alone.
    const big: Record<string, unknown> = {};
    for (let i = 0; i < 20; i++) {
      big[`obj${i}`] = { a: 1, b: 2, c: 3 };
    }
    const { resource } = buildDataContextResourceResult(big, {
      componentUuid: "C1",
      scope: "element",
      maxTotalPaths: 10,
    });
    const hasMarker = (nodes: typeof resource.paths): boolean =>
      nodes.some((n) => n.name === "…" || hasMarker(n.children ?? []));
    expect(countRealPaths(resource.paths)).toBeLessThanOrEqual(10);
    expect(hasMarker(resource.paths)).toBe(true);
  });

  describe("paths", () => {
    it("resolves a nested object path", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        { $state: { user: { name: "Ada", age: 30 } } },
        { componentUuid: "C1", scope: "element", paths: ["$state.user"] }
      );
      expect(invalidPaths).toEqual([]);
      expect(resource.paths).toHaveLength(1);
      const node = resource.paths[0];
      expect(node.name).toBe("$state.user");
      expect(node.type).toBe("object");
      expect(node.children?.map((c) => c.name)).toEqual(["name", "age"]);
    });

    it("resolves an in-range array index", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        { $q: { orders: { data: [{ id: 1 }, { id: 2 }], isLoading: false } } },
        { componentUuid: "C1", scope: "element", paths: ["$q.orders.data[1]"] }
      );
      expect(invalidPaths).toEqual([]);
      const node = resource.paths[0];
      expect(node.name).toBe("$q.orders.data[1]");
      expect(node.children?.find((c) => c.name === "id")?.value).toBe("2");
    });

    it("resolves bracket notation and a key containing a dot", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        { $q: { result: { "key.with.dot": 42 } } },
        {
          componentUuid: "C1",
          scope: "element",
          paths: ['$q.result["key.with.dot"]'],
        }
      );
      expect(invalidPaths).toEqual([]);
      const node = resource.paths[0];
      expect(node.name).toBe('$q.result["key.with.dot"]');
      expect(node.type).toBe("number");
      expect(node.value).toBe("42");
    });

    it("rejects malformed path syntax", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        { $q: { orders: { data: [] } } },
        { componentUuid: "C1", scope: "element", paths: ["$q.orders["] }
      );
      expect(resource.paths).toEqual([]);
      expect(invalidPaths).toEqual([
        {
          path: "$q.orders[",
          message:
            'Invalid data-context path "$q.orders[": invalid path syntax.',
        },
      ]);
    });

    it("rejects a missing object key", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        { $state: { a: 1 } },
        { componentUuid: "C1", scope: "element", paths: ["$state.b"] }
      );
      expect(resource.paths).toEqual([]);
      expect(invalidPaths).toEqual([
        {
          path: "$state.b",
          message: 'Invalid data-context path "$state.b": path not found.',
        },
      ]);
    });

    it("rejects an out-of-range array index", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        { $q: { orders: { data: [{ id: 1 }] } } },
        {
          componentUuid: "C1",
          scope: "element",
          paths: ["$q.orders.data[99]"],
        }
      );
      expect(resource.paths).toEqual([]);
      expect(invalidPaths).toEqual([
        {
          path: "$q.orders.data[99]",
          message:
            'Invalid data-context path "$q.orders.data[99]": path not found.',
        },
      ]);
    });

    it("does not traverse through a primitive", () => {
      const { invalidPaths } = buildDataContextResourceResult(
        { $state: { count: 3 } },
        { componentUuid: "C1", scope: "element", paths: ["$state.count.x"] }
      );
      expect(invalidPaths).toEqual([
        {
          path: "$state.count.x",
          message:
            'Invalid data-context path "$state.count.x": path not found.',
        },
      ]);
    });

    it("rejects paths hidden by the data picker", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        {
          $$: { internal: true },
          $state: {
            visible: 1,
            hidden: 2,
            registerInitFunc: "internal",
            [mkMetaName("hidden")]: { hidden: true },
          },
        },
        {
          componentUuid: "C1",
          scope: "element",
          paths: [
            "$$",
            "$state.hidden",
            "$state.registerInitFunc",
            "$state.visible",
          ],
        }
      );

      expect(resource.paths.map((path) => path.name)).toEqual([
        "$state.visible",
      ]);
      expect(invalidPaths.map((error) => error.path)).toEqual([
        "$$",
        "$state.hidden",
        "$state.registerInitFunc",
      ]);
    });

    it("resets depth at the selected subtree", () => {
      const env = { $state: { l1: { l2: { l3: { l4: "x" } } } } };
      // Whole-context walk (maxDepth 2) truncates at $state.l1.l2.
      const { resource: whole } = buildDataContextResourceResult(env, {
        componentUuid: "C1",
        scope: "element",
        maxDepth: 2,
      });
      const wl2 = whole.paths
        .find((p) => p.name === "$state")
        ?.children?.find((c) => c.name === "l1")
        ?.children?.find((c) => c.name === "l2");
      expect(wl2?.truncated).toBe(true);
      expect(wl2?.children).toBeUndefined();

      // Selecting $state.l1 resets depth there, so l2 gets its own allowance
      // and we reach one level deeper (l3, truncated).
      const { resource } = buildDataContextResourceResult(env, {
        componentUuid: "C1",
        scope: "element",
        maxDepth: 2,
        paths: ["$state.l1"],
      });
      const l3 = resource.paths[0].children
        ?.find((c) => c.name === "l2")
        ?.children?.find((c) => c.name === "l3");
      expect(l3?.truncated).toBe(true);
    });

    it("shares the total-node budget across multiple selected paths", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        { a: { x: 1, y: 2, z: 3 }, b: { p: 1, q: 2, r: 3 } },
        {
          componentUuid: "C1",
          scope: "element",
          maxTotalPaths: 4,
          paths: ["a", "b", "missing", "bad["],
        }
      );
      // A per-path budget would emit both subtrees (8 nodes); a shared budget
      // of 4 is exhausted by "a" alone, so "b" is represented by a marker.
      // Later invalid paths must still be reported after budget exhaustion.
      expect(countRealPaths(resource.paths)).toBeLessThanOrEqual(4);
      expect(resource.paths.map((p) => p.name)).toEqual(["a", "…"]);
      expect(resource.paths[1]).toMatchObject({
        truncated: true,
        omittedCount: 1,
      });
      expect(invalidPaths.map((error) => error.path)).toEqual([
        "missing",
        "bad[",
      ]);
    });

    it("preserves request order and dedupes duplicate paths", () => {
      const { resource } = buildDataContextResourceResult(
        { a: 1, b: 2 },
        {
          componentUuid: "C1",
          scope: "element",
          paths: ["b", "a", "b"],
        }
      );
      expect(resource.paths.map((p) => p.name)).toEqual(["b", "a"]);
    });

    it("honors maxArrayItems while retaining array length and omitted count", () => {
      const { resource } = buildDataContextResourceResult(
        { items: [1, 2, 3, 4, 5] },
        {
          componentUuid: "C1",
          scope: "element",
          maxArrayItems: 2,
          paths: ["items"],
        }
      );
      const node = resource.paths[0];
      expect(node.type).toBe("array");
      expect(node.length).toBe(5);
      const real = node.children?.filter((c) => c.name !== "…") ?? [];
      expect(real).toHaveLength(2);
      const marker = node.children?.find((c) => c.name === "…");
      expect(marker?.omittedCount).toBe(3);
    });

    it("preserves root-scope filtering for non-owned $q/$queries paths", () => {
      const { resource, invalidPaths } = buildDataContextResourceResult(
        {
          $q: {
            mine: { data: { ok: true } },
            foreign: { data: { ok: false } },
          },
          $queries: { legacyMine: { data: [1] }, legacyForeign: { data: [2] } },
        },
        {
          componentUuid: "C1",
          scope: "root",
          componentServerQueryNames: ["mine"],
          componentDataQueryNames: ["legacyMine"],
          paths: ["$q.mine", "$q.foreign", "$queries.legacyForeign"],
        }
      );
      expect(resource.paths.map((p) => p.name)).toEqual(["$q.mine"]);
      expect(invalidPaths.map((e) => e.path)).toEqual([
        "$q.foreign",
        "$queries.legacyForeign",
      ]);
    });
  });
});
