import { StatefulQueryResult } from "@/wab/shared/core/custom-functions";
import { buildDataContextResource } from "@/wab/shared/web-exporter/data-context-exporter";
import { jsonToXml } from "@/wab/shared/web-exporter/json-to-xml";
import { mkMetaName } from "@plasmicapp/host";

describe("buildDataContextResource", () => {
  it("unwraps $q StatefulQueryResult instances to data/isLoading/error", () => {
    const resolved = new StatefulQueryResult<{ id: number; name: string }[]>();
    resolved.resolvePromise("orders", [{ id: 1, name: "Ada" }]);
    const loading = new StatefulQueryResult();

    const resource = buildDataContextResource(
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

    const resource = buildDataContextResource(
      { $q: { status: resolved } },
      { componentUuid: "C1", elementUuid: "T1", scope: "element" }
    );
    expect(resource).toMatchSnapshot();
  });

  it("leaves already-unwrapped $q snapshots untouched (preserves error)", () => {
    // An env pre-shaped by prepareEnvForDataPicker holds plain snapshots, not
    // StatefulQueryResult instances. Re-unwrapping would drop the error.
    const resource = buildDataContextResource(
      { $q: { failed: { data: undefined, isLoading: false, error: "boom" } } },
      {
        componentUuid: "C1",
        scope: "root",
        componentServerQueryNames: ["failed"],
      }
    );
    expect(jsonToXml(resource)).toContain(
      'name="error" type="string" value="&quot;boom&quot;"'
    );
  });

  it("element scope: primitives, nested objects, $$ stripping, depth truncation", () => {
    const resource = buildDataContextResource(
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
    const resource = buildDataContextResource(
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
    const resource = buildDataContextResource(
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
    const resource = buildDataContextResource(
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
    const resource = buildDataContextResource(
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
    const resource = buildDataContextResource(
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
    const resource = buildDataContextResource(big, {
      componentUuid: "C1",
      scope: "element",
      maxTotalPaths: 10,
    });
    const countReal = (nodes: typeof resource.paths): number =>
      nodes.reduce(
        (n, node) =>
          n + (node.name === "…" ? 0 : 1) + countReal(node.children ?? []),
        0
      );
    const hasMarker = (nodes: typeof resource.paths): boolean =>
      nodes.some((n) => n.name === "…" || hasMarker(n.children ?? []));
    expect(countReal(resource.paths)).toBeLessThanOrEqual(10);
    expect(hasMarker(resource.paths)).toBe(true);
  });
});
