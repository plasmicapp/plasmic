import {
  PropFolderNode,
  PropTreeNode,
  buildPropTree,
  reorderLevel,
} from "@/wab/shared/folders/prop-tree";
import { Component, Param } from "@/wab/shared/model/classes";

function makeParam(uid: number, name: string): Param {
  return { uid, variable: { name } } as unknown as Param;
}

function makeComponent(params: Param[]): Component {
  return { params } as unknown as Component;
}

function leaf(param: Param): PropTreeNode {
  return { kind: "param", param };
}

function folder(
  name: string,
  children: PropTreeNode[],
  path?: string
): PropFolderNode {
  return { kind: "folder", name, path: path ?? name, children };
}

function uids(component: Component): number[] {
  return component.params.map((p) => p.uid);
}

describe("buildPropTree", () => {
  it("returns a flat list of leaves when no params have slashes", () => {
    const a = makeParam(1, "A");
    const b = makeParam(2, "B");
    const c = makeParam(3, "C");
    const tree = buildPropTree(makeComponent([a, b, c]), [a, b, c]);
    expect(tree).toEqual([
      { kind: "param", param: a },
      { kind: "param", param: b },
      { kind: "param", param: c },
    ]);
  });

  it("returns an empty array for empty params", () => {
    expect(buildPropTree(makeComponent([]), [])).toEqual([]);
  });

  it("groups slash-prefixed params under a single folder", () => {
    const a = makeParam(1, "A");
    const gx = makeParam(2, "G/x");
    const gy = makeParam(3, "G/y");
    const b = makeParam(4, "B");
    const params = [a, gx, gy, b];
    const tree = buildPropTree(makeComponent(params), params);
    expect(tree).toEqual([
      { kind: "param", param: a },
      {
        kind: "folder",
        name: "G",
        path: "G",
        children: [
          { kind: "param", param: gx },
          { kind: "param", param: gy },
        ],
      },
      { kind: "param", param: b },
    ]);
  });

  it("builds nested folders and assigns slash-joined paths", () => {
    const ghx = makeParam(1, "G/H/x");
    const ghy = makeParam(2, "G/H/y");
    const gz = makeParam(3, "G/z");
    const params = [ghx, ghy, gz];
    const tree = buildPropTree(makeComponent(params), params);
    expect(tree).toEqual([
      {
        kind: "folder",
        name: "G",
        path: "G",
        children: [
          {
            kind: "folder",
            name: "H",
            path: "G/H",
            children: [
              { kind: "param", param: ghx },
              { kind: "param", param: ghy },
            ],
          },
          { kind: "param", param: gz },
        ],
      },
    ]);
  });

  it("preserves input order — non-contiguous folder members stay in source order", () => {
    const gx = makeParam(1, "G/x");
    const a = makeParam(2, "A");
    const gy = makeParam(3, "G/y");
    const params = [gx, a, gy];
    const tree = buildPropTree(makeComponent(params), params);
    // G appears at the position of its first member; both children grouped together.
    expect(tree).toEqual([
      {
        kind: "folder",
        name: "G",
        path: "G",
        children: [
          { kind: "param", param: gx },
          { kind: "param", param: gy },
        ],
      },
      { kind: "param", param: a },
    ]);
  });
});

describe("reorderLevel", () => {
  it("reorders two leaves at top level", () => {
    const a = makeParam(1, "A");
    const b = makeParam(2, "B");
    const component = makeComponent([a, b]);
    const siblings: PropTreeNode[] = [leaf(a), leaf(b)];

    reorderLevel(component, siblings, 1, 0);

    expect(uids(component)).toEqual([2, 1]);
  });

  it("moves a leaf past a folder", () => {
    const a = makeParam(1, "A");
    const gx = makeParam(2, "G/x");
    const gy = makeParam(3, "G/y");
    const b = makeParam(4, "B");
    const component = makeComponent([a, gx, gy, b]);
    const siblings: PropTreeNode[] = [
      leaf(a),
      folder("G", [leaf(gx), leaf(gy)]),
      leaf(b),
    ];

    // Move B (index 2) before G (index 1)
    reorderLevel(component, siblings, 2, 1);

    expect(uids(component)).toEqual([1, 4, 2, 3]);
  });

  it("moves a folder — all descendants move together", () => {
    const a = makeParam(1, "A");
    const gx = makeParam(2, "G/x");
    const gy = makeParam(3, "G/y");
    const b = makeParam(4, "B");
    const component = makeComponent([a, gx, gy, b]);
    const siblings: PropTreeNode[] = [
      leaf(a),
      folder("G", [leaf(gx), leaf(gy)]),
      leaf(b),
    ];

    // Move G (index 1) to end (index 2)
    reorderLevel(component, siblings, 1, 2);

    expect(uids(component)).toEqual([1, 4, 2, 3]);
  });

  it("reorders within a nested folder — non-level params untouched", () => {
    const a = makeParam(1, "A");
    const gx = makeParam(2, "G/x");
    const gy = makeParam(3, "G/y");
    const gz = makeParam(4, "G/z");
    const b = makeParam(5, "B");
    const component = makeComponent([a, gx, gy, gz, b]);
    const folderChildren: PropTreeNode[] = [leaf(gx), leaf(gy), leaf(gz)];

    // Within G, move z (index 2) before x (index 0)
    reorderLevel(component, folderChildren, 2, 0);

    expect(uids(component)).toEqual([1, 4, 2, 3, 5]);
  });

  it("compacts non-contiguous folder params after reorder", () => {
    const gx = makeParam(1, "G/x");
    const a = makeParam(2, "A");
    const gy = makeParam(3, "G/y");
    const b = makeParam(4, "B");
    const gz = makeParam(5, "G/z");
    const c = makeParam(6, "C");

    // G's params are split: gx at 0, gy at 2 (non-contiguous)
    const component = makeComponent([gx, a, gy, b, gz, c]);
    const folderChildren: PropTreeNode[] = [leaf(gx), leaf(gy), leaf(gz)];

    // Within G, move y (index 1) before x (index 0)
    reorderLevel(component, folderChildren, 1, 0);

    // G's params are now contiguous at the position of the first one
    expect(uids(component)).toEqual([3, 1, 5, 2, 4, 6]);
  });

  it("no-op when fromIdx equals toIdx", () => {
    const a = makeParam(1, "A");
    const b = makeParam(2, "B");
    const c = makeParam(3, "C");
    const component = makeComponent([a, b, c]);
    const siblings: PropTreeNode[] = [leaf(a), leaf(b), leaf(c)];

    reorderLevel(component, siblings, 1, 1);

    expect(uids(component)).toEqual([1, 2, 3]);
  });

  it("preserves non-level params between folders", () => {
    const slot = makeParam(99, "slot");
    const a = makeParam(1, "A");
    const b = makeParam(2, "B");
    // slot is not part of this level (e.g. a slot param)
    const component = makeComponent([slot, a, b]);
    const siblings: PropTreeNode[] = [leaf(a), leaf(b)];

    reorderLevel(component, siblings, 1, 0);

    // slot stays at index 0, a and b swapped after it
    expect(uids(component)).toEqual([99, 2, 1]);
  });

  it("reorders folders with slots and states scattered throughout", () => {
    const slot = makeParam(90, "slot");
    const a = makeParam(1, "A");
    const state = makeParam(80, "state");
    const gx = makeParam(2, "G/x");
    const state2 = makeParam(70, "slot");
    const gy = makeParam(3, "G/y");
    const b = makeParam(4, "B");
    const component = makeComponent([slot, a, state, gx, state2, gy, b]);
    const siblings: PropTreeNode[] = [
      leaf(a),
      folder("G", [leaf(gx), leaf(gy)]),
      leaf(b),
    ];

    // Move B (index 2) before A (index 0)
    reorderLevel(component, siblings, 2, 0);

    // slot and state stay; level params compact at position of first (index 1)
    expect(uids(component)).toEqual([90, 4, 1, 2, 3, 80, 70]);
  });

  it("handles nested folders within a folder", () => {
    const a = makeParam(1, "A");
    const gx = makeParam(2, "G/x");
    const ghx = makeParam(3, "G/H/x");
    const b = makeParam(4, "B");
    const ghy = makeParam(5, "G/H/y");
    const c = makeParam(6, "C");
    const ghz = makeParam(7, "G/H/z");
    const d = makeParam(8, "D");

    const component = makeComponent([a, gx, ghx, b, ghy, c, ghz, d]);
    const gChildren: PropTreeNode[] = [
      leaf(gx),
      folder("H", [leaf(ghx), leaf(ghy), leaf(ghz)], "G/H"),
    ];

    // Within G, move H (index 1) before x (index 0)
    reorderLevel(component, gChildren, 1, 0);

    expect(uids(component)).toEqual([1, 3, 5, 7, 2, 4, 6, 8]);
  });
});
