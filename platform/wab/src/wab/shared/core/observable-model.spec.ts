import { removeFromArray } from "@/wab/commons/collections";
import { ensure, hackyCast } from "@/wab/shared/common";
import {
  ChangeRecorder,
  ModelChange,
  observeModel,
} from "@/wab/shared/core/observable-model";
import { InstUtil } from "@/wab/shared/model/InstUtil";
import { parse, transform } from "@/wab/shared/model/model-generator";
import { MetaRuntime, ObjInstBase } from "@/wab/shared/model/model-meta";
import L from "lodash";
import { Lambda } from "mobx";

class Sentinel {
  tag = "SENTINEL" as const;
}
const sentinel = new Sentinel();

const schema = `
Node
  @WeakRef parent: Node?
  Attribute
    key: String
    value: String
  TextNode
    text: String
    attrs: [Attribute]
  TagNode
    name: String
    tag: String
    children: [Node]
    @WeakRef children2: [Node]
    attrs: Map[String, Expr]
    nicknames: [String]
    rootExpr: Expr?
    @WeakRef attrs2: Map[String, List[Expr]]
    attrs3: Map[String, List[Expr]]
Expr
  value: String | Node
  `;
const meta = new MetaRuntime(transform(parse(schema)), 300000);
abstract class Node {
  constructor(args) {
    if (args !== sentinel) {
      meta.initializers.Node(this, args);
    }
  }
  uid: number;
  parent: Node | undefined | null;
}

class Attribute extends Node {
  constructor(args) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Attribute(this, args);
    }
  }
  uid: number;
  parent: Node | undefined | null;
  key: string;
  value: string;
}

class TextNode extends Node {
  constructor(args) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.TextNode(this, args);
    }
  }
  uid: number;
  parent: Node | undefined | null;
  attrs: Array<Attribute>;
  text: string;
}

function mkText(opts: {
  text: string;
  parent?: Node;
  attrs?: Array<Attribute>;
}) {
  return new TextNode(L.defaults(opts, { parent: null, attrs: [] }));
}

class TagNode extends Node {
  constructor(args) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.TagNode(this, args);
    }
  }
  uid: number;
  parent: Node | undefined | null;
  name: string;
  tag: string;
  children: Array<Node>;
  children2: Array<Node>;
  nicknames: Array<string>;
  attrs: { [key: string]: Expr };
  attrs2: { [key: string]: Array<Expr> };
  attrs3: { [key: string]: Array<Expr> };
  rootExpr: Expr | undefined | null;
}

function mkTag(opts: {
  name: string;
  tag: string;
  parent?: Node;
  children?: Node[];
  nicknames?: string[];
  attrs?: Record<string, Expr>;
  rootExpr?: Expr;
}) {
  return new TagNode(
    L.defaults(opts, {
      parent: null,
      children: [],
      children2: [],
      nicknames: [],
      attrs: {},
      rootExpr: null,
      attrs2: {},
      attrs3: {},
    })
  );
}

class Expr {
  constructor(args) {
    if (args !== sentinel) {
      meta.initializers.Expr(this, args);
    }
  }
  uid: number;
  value: string | Node;
}

const instUtil = new InstUtil(meta, {
  Node,
  TextNode,
  Attribute,
  TagNode,
  Expr,
});

function mkExpr(opts: { value?: string | Node }) {
  return new Expr(L.defaults(opts, {}));
}

describe("observeModel", () => {
  const testInst = (
    inst: ObjInstBase,
    doWork: (prune: Lambda) => void,
    checkEvents: (events: ModelChange[], dispose: Lambda, prune: Lambda) => void
  ) => {
    const events: ModelChange[] = [];
    const { dispose, prune } = observeModel(hackyCast(inst), {
      instUtil,
      listener: (event) => events.push(event),
    });
    doWork(prune);
    prune();
    checkEvents(events, dispose, prune);
    dispose();
  };

  it("should work with primitive fields", () => {
    const node = mkTag({ name: "hi", tag: "div" });

    testInst(
      node,
      () => {
        node.name = "ohhai";
        node.tag = "img";
      },
      (events, dispose) => {
        expect(events.length).toEqual(2);
        expect(events[0]).toMatchObject({
          path: [{ inst: node, field: "name" }],
          changeNode: { inst: node, field: "name" },
          type: "update",
          oldValue: "hi",
          newValue: "ohhai",
        });
        expect(events[1]).toMatchObject({
          path: [{ inst: node, field: "tag" }],
          changeNode: { inst: node, field: "tag" },
          type: "update",
          oldValue: "div",
          newValue: "img",
        });

        // disposal also works
        events.length = 0;
        dispose();

        node.name = "what";
        node.tag = "okay";
        expect(events.length).toEqual(0);
      }
    );
  });

  it("should work with instance fields", () => {
    const node = mkTag({ name: "hi", tag: "div" });
    const firstExpr = mkExpr({ value: "hello" });

    testInst(
      node,
      (prune) => {
        // Setting a rich field
        node.rootExpr = firstExpr;

        // Setting a field of rich field object
        node.rootExpr.value = "goodbye";

        // Setting a rich field to another object
        node.rootExpr = mkExpr({ value: "another one" });

        // New object's updates are automatically tracked as well
        node.rootExpr.value = "another one 2";

        // But the removed object is no longer tracked
        prune();
        firstExpr.value = "invisible";
      },
      (events, dispose) => {
        expect(events.length).toBe(4);

        expect(events[0]).toMatchObject({
          type: "update",
          path: [{ inst: node, field: "rootExpr" }],
          changeNode: { inst: node, field: "rootExpr" },
          newValue: firstExpr,
        });

        expect(events[1]).toMatchObject({
          type: "update",
          path: [
            { inst: node, field: "rootExpr" },
            { inst: firstExpr, field: "value" },
          ],
          changeNode: { inst: firstExpr, field: "value" },
          oldValue: "hello",
          newValue: "goodbye",
        });

        expect(events[2]).toMatchObject({
          type: "update",
          path: [{ inst: node, field: "rootExpr" }],
          changeNode: { inst: node, field: "rootExpr" },
          oldValue: firstExpr,
          newValue: node.rootExpr,
        });

        expect(events[3]).toMatchObject({
          type: "update",
          path: [
            { inst: node, field: "rootExpr" },
            { inst: node.rootExpr, field: "value" },
          ],
          changeNode: { inst: node.rootExpr, field: "value" },
          oldValue: "another one",
          newValue: "another one 2",
        });

        events.length = 0;
        dispose();
        ensure(node.rootExpr, "").value = "no one cares";
        node.rootExpr = mkExpr({ value: "no one cares here either" });
        firstExpr.value = "definitely no one cares";
        expect(events.length).toBe(0);
      }
    );
  });

  it("should work with array fields", () => {
    const node = mkTag({ name: "hi", tag: "div" });
    let ohhaiChild, whyNotChild, yesNotChild, replaceChild;

    testInst(
      node,
      (prune) => {
        // primitive array
        node.nicknames.push("my-node");
        node.nicknames.push("favorite", "favorites2");
        removeFromArray(node.nicknames, "my-node");
        node.nicknames[1] = "whatevs";

        // rich array
        // add single
        node.children.push(
          (ohhaiChild = mkText({ text: "OHHAI", parent: node }))
        );
        // add multiple
        node.children.splice(
          0,
          0,
          (whyNotChild = mkText({ text: "Why not", parent: node })),
          (yesNotChild = mkText({ text: "Yes not", parent: node }))
        );
        // setting array element
        node.children[1] = replaceChild = mkText({
          text: "replaced!",
          parent: node,
        });
        // setting array element prop
        (node.children[2] as TextNode).text = "ohhai 2";
        // setting array element prop of new element
        (node.children[1] as TextNode).text = "replaced! 2";
        // remove item
        removeFromArray(node.children, ohhaiChild);
        prune();
        (ohhaiChild as TextNode).text = "OHHAI 2";
      },
      (events, dispose) => {
        expect(events.length).toBe(10);

        expect(events[0]).toMatchObject({
          path: [{ inst: node, field: "nicknames" }],
          changeNode: { inst: node, field: "nicknames" },
          type: "array-splice",
          index: 0,
          object: node.nicknames,
          added: ["my-node"],
          removed: [],
        });

        expect(events[1]).toMatchObject({
          path: [{ inst: node, field: "nicknames" }],
          changeNode: { inst: node, field: "nicknames" },
          type: "array-splice",
          index: 1,
          object: node.nicknames,
          added: ["favorite", "favorites2"],
          removed: [],
        });

        expect(events[2]).toMatchObject({
          path: [{ inst: node, field: "nicknames" }],
          changeNode: { inst: node, field: "nicknames" },
          type: "array-splice",
          index: 0,
          object: node.nicknames,
          added: [],
          removed: ["my-node"],
        });

        expect(events[3]).toMatchObject({
          path: [{ inst: node, field: "nicknames" }],
          changeNode: { inst: node, field: "nicknames" },
          type: "array-update",
          index: 1,
          object: node.nicknames,
          oldValue: "favorites2",
          newValue: "whatevs",
        });

        expect(events[4]).toMatchObject({
          path: [{ inst: node, field: "children" }],
          changeNode: { inst: node, field: "children" },
          type: "array-splice",
          index: 0,
          object: node.children,
          added: [ohhaiChild],
        });

        expect(events[5]).toMatchObject({
          path: [{ inst: node, field: "children" }],
          changeNode: { inst: node, field: "children" },
          type: "array-splice",
          index: 0,
          object: node.children,
          added: [whyNotChild, yesNotChild],
        });

        expect(events[6]).toMatchObject({
          path: [{ inst: node, field: "children" }],
          changeNode: { inst: node, field: "children" },
          type: "array-update",
          index: 1,
          object: node.children,
          oldValue: yesNotChild,
          newValue: replaceChild,
        });

        expect(events[7]).toMatchObject({
          path: [
            { inst: node, field: "children" },
            { inst: ohhaiChild, field: "text" },
          ],
          changeNode: { inst: ohhaiChild, field: "text" },
          type: "update",
          oldValue: "OHHAI",
          newValue: "ohhai 2",
        });

        expect(events[8]).toMatchObject({
          path: [
            { inst: node, field: "children" },
            { inst: replaceChild, field: "text" },
          ],
          changeNode: { inst: replaceChild, field: "text" },
          type: "update",
          oldValue: "replaced!",
          newValue: "replaced! 2",
        });

        expect(events[9]).toMatchObject({
          path: [{ inst: node, field: "children" }],
          changeNode: { inst: node, field: "children" },
          type: "array-splice",
          index: 2,
          added: [],
          removed: [ohhaiChild],
        });

        dispose();
        events.length = 0;
        (node.children[1] as TextNode).text = "blahblah";
        node.children.push(mkText({ text: "blah2" }));
        expect(events.length).toBe(0);
      }
    );
  });

  it("should work with two arrays referencing same elements", () => {
    const node = mkTag({ name: "hi", tag: "div" });
    let child;

    testInst(
      node,
      () => {
        node.children.push(
          (child = mkText({
            text: "foo",
            parent: node,
            attrs: [new Attribute({ key: "foo", value: "foo", parent: null })],
          }))
        );
        node.children2.push(child);
        const removed = node.children2.splice(0, 1);
        node.children2.splice(0, 0, ...removed);

        (node.children[0] as TextNode).attrs[0].value = "foofoofoo";
      },
      (events, dispose) => {
        expect(events.length).toBe(5);
        dispose();
      }
    );
  });

  it("should work with map fields", () => {
    const node = mkTag({ name: "hi", tag: "div" });
    let myClass, yup, yupText, nope, cs, c1, c2, c3;
    testInst(
      node,
      () => {
        node.attrs["className"] = myClass = mkExpr({ value: "my-class" });
        node.attrs["stuff"] = yup = mkExpr({
          value: (yupText = mkText({ text: "Yup", parent: node })),
        });
        (node.attrs["stuff"].value as TextNode).text = "Yup 2";
        node.attrs["stuff"] = nope = mkExpr({
          value: mkText({ text: "Nope" }),
        });
        delete node.attrs["className"];

        node.attrs3["className"] = cs = [
          (c1 = mkExpr({ value: "c1" })),
          (c2 = mkExpr({ value: "c2" })),
        ];
        node.attrs3["className"][1] = c3 = mkExpr({
          value: mkText({ text: "c3" }),
        });
        (node.attrs3["className"][1].value as TextNode).text = "c3 2";
      },
      (events, dispose) => {
        expect(events.length).toBe(8);

        expect(events[0]).toMatchObject({
          type: "obj-add",
          path: [{ inst: node, field: "attrs" }],
          changeNode: { inst: node, field: "attrs" },
          object: node.attrs,
          key: "className",
          newValue: myClass,
        });

        expect(events[1]).toMatchObject({
          type: "obj-add",
          path: [{ inst: node, field: "attrs" }],
          changeNode: { inst: node, field: "attrs" },
          object: node.attrs,
          key: "stuff",
          newValue: yup,
        });

        expect(events[2]).toMatchObject({
          type: "update",
          path: [
            { inst: node, field: "attrs" },
            { inst: yup, field: "value" },
            { inst: yupText, field: "text" },
          ],
          changeNode: { inst: yupText, field: "text" },
          oldValue: "Yup",
          newValue: "Yup 2",
        });

        expect(events[3]).toMatchObject({
          type: "obj-update",
          path: [{ inst: node, field: "attrs" }],
          changeNode: { inst: node, field: "attrs" },
          object: node.attrs,
          key: "stuff",
          newValue: nope,
          oldValue: yup,
        });

        expect(events[4]).toMatchObject({
          type: "obj-delete",
          path: [{ inst: node, field: "attrs" }],
          changeNode: { inst: node, field: "attrs" },
          object: node.attrs,
          key: "className",
          oldValue: myClass,
        });

        expect(events[5]).toMatchObject({
          type: "obj-add",
          path: [{ inst: node, field: "attrs3" }],
          changeNode: { inst: node, field: "attrs3" },
          object: node.attrs3,
          key: "className",
          newValue: node.attrs3["className"],
        });

        expect(events[6]).toMatchObject({
          type: "array-update",
          path: [{ inst: node, field: "attrs3" }],
          changeNode: { inst: node, field: "attrs3" },
          object: node.attrs3["className"],
          index: 1,
          newValue: c3,
        });

        expect(events[7]).toMatchObject({
          type: "update",
          path: [
            { inst: node, field: "attrs3" },
            { inst: c3, field: "value" },
            { inst: c3.value, field: "text" },
          ],
          changeNode: { inst: c3.value, field: "text" },
          oldValue: "c3",
          newValue: "c3 2",
        });

        dispose();
        events.length = 0;
        node.attrs["stuff"] = mkExpr({ value: mkText({ text: "Nope 2" }) });
        (node.attrs3["className"][1].value as TextNode).text = "c3 3";
        delete node.attrs["stuff"];
        expect(events.length).toBe(0);
      }
    );
  });

  it("should work with multiple references to same inst", () => {
    const node = mkTag({ name: "hi", tag: "div" });
    const child1 = mkTag({ name: "child1", tag: "div", parent: node });
    const child2 = mkTag({ name: "child2", tag: "div", parent: node });
    node.children.push(child1, child2);
    const expr = mkExpr({ value: "happy" });
    child1.attrs["blah"] = expr;
    child2.attrs2["blah2"] = [expr];

    // Note that there are two paths to `expr` -- through child1 or child2.

    testInst(
      node,
      () => {},
      (events, dispose, prune) => {
        expect(events.length).toBe(0);

        expr.value = "happy2";

        // Only the first child strongly references `expr`
        expect(events.length).toBe(1);
        expect(events[0]).toMatchObject({
          type: "update",
          path: [
            { inst: node, field: "children" },
            { inst: child1, field: "attrs" },
            { inst: expr, field: "value" },
          ],
          changeNode: { inst: expr, field: "value" },
          oldValue: "happy",
          newValue: "happy2",
        });

        // If child1 no longer points to `expr`, then child2 will need to add
        // a strong reference to it.
        child1.attrs["blah"] = mkExpr({ value: "unrelated" });
        child2.attrs["blah3"] = expr;
        events.length = 0;
        prune();
        expr.value = "happy3";
        expect(events.length).toBe(1);
        expect(events[0]).toMatchObject({
          type: "update",
          path: [
            { inst: node, field: "children" },
            { inst: child2, field: "attrs" },
            { inst: expr, field: "value" },
          ],
          changeNode: { inst: expr, field: "value" },
          oldValue: "happy2",
          newValue: "happy3",
        });

        delete child2.attrs2["blah2"];
        child2.attrs2["another"] = [expr];
        events.length = 0;
        prune();
        expr.value = "happy4";
        expect(events.length).toBe(1);
        expect(events[0]).toMatchObject({
          type: "update",
          path: [
            { inst: node, field: "children" },
            { inst: child2, field: "attrs" },
            { inst: expr, field: "value" },
          ],
          changeNode: { inst: expr, field: "value" },
          oldValue: "happy3",
          newValue: "happy4",
        });

        // Removing weakRef shouldn't affect the path
        child2.attrs2["another"] = [];
        events.length = 0;
        prune();
        expr.value = "happy5";
        expect(events.length).toBe(1);
        expect(events[0]).toMatchObject({
          type: "update",
          path: [
            { inst: node, field: "children" },
            { inst: child2, field: "attrs" },
            { inst: expr, field: "value" },
          ],
          changeNode: { inst: expr, field: "value" },
          oldValue: "happy4",
          newValue: "happy5",
        });

        // Finally if we point attrs's pointer away, then we should see no change,
        // as we've now completely unsubscribed from `expr`
        child2.attrs["blah3"] = mkExpr({ value: "yet another" });
        events.length = 0;
        prune();
        expr.value = "happy6";
        expect(events.length).toBe(0);
      }
    );
  });

  it("disposes indirect references", () => {
    const node = mkTag({ name: "hi", tag: "div" });
    const child = mkTag({ name: "child", tag: "div", parent: node });
    node.children.push(child);
    const expr = (child.rootExpr = mkExpr({ value: "expr" }));
    const attrExpr = mkExpr({ value: "attr" });
    child.attrs["attr"] = attrExpr;

    testInst(
      node,
      () => {},
      (events, dispose, prune) => {
        events.length = 0;
        prune();
        expr.value = "expr 2";
        attrExpr.value = "attr 2";
        expect(events.length).toBe(2);

        // Detach the child from the tree
        removeFromArray(node.children, child);
        events.length = 0;
        prune();

        expr.value = "expr 3";
        attrExpr.value = "attr 3";
        expect(events.length).toBe(0);
      }
    );
  });

  it("disposes multiple paths with common ancestors to the same node", () => {
    const node = mkTag({ name: "hi", tag: "div" });
    const child = mkTag({ name: "child", tag: "div" });
    node.children.push(child);
    const value = mkTag({ name: "value", tag: "div", parent: node });
    const expr = mkExpr({ value: value });
    child.attrs["attr"] = expr;
    child.attrs2["attr2"] = [expr];

    // There are two paths to value:
    // node.children>child.attrs>expr.value
    // node.children>child.attrs2>expr.value
    // The two paths share a common ancestor -- expr

    testInst(
      node,
      () => {},
      (events, dispose, prune) => {
        events.length = 0;
        prune();
        value.name = "value 2";
        expect(events.length).toBe(1);
        expect(events[0].path !== undefined).toBe(true);

        // detach child
        removeFromArray(node.children, child);
        events.length = 0;
        prune();
        value.name = "value 3";
        expect(events.length).toBe(0);

        // add it again
        node.children.push(child);
        events.length = 0;
        prune();
        value.name = "value 4";
        expect(events.length).toBe(1);
        expect(events[0].path !== undefined).toBe(true);

        // detach again
        removeFromArray(node.children, child);
        events.length = 0;
        prune();
        value.name = "value 5";
        expect(events.length).toBe(0);
      }
    );
  });

  it("The change recorder should be transactional", () => {
    const node = mkTag({ name: "node", tag: "div" });
    const child1 = mkTag({ name: "child1", tag: "div" });
    const child2 = mkTag({ name: "child2", tag: "div" });
    node.children.push(child1);
    const value = mkTag({ name: "value", tag: "div", parent: node });
    const expr = mkExpr({ value: value });
    child1.attrs["key"] = expr;

    const recorder = new ChangeRecorder({
      inst: hackyCast(node),
      _instUtil: instUtil,
    });

    const doWork = (fail: boolean) => {
      node.children.push(child2);
      delete child1.attrs["key"];
      child2.attrs2["key2"] = [expr];
      if (fail) {
        throw new Error();
      }
      child2.attrs["key4"] = expr;
    };

    expect(() => recorder.withRecording(() => doWork(true))).toThrow();

    // Check that all changes have been undone
    expect(node.children.length).toBe(1);
    expect(child1.attrs["key"]).toBe(expr);
    expect(child2.attrs2["key2"]).toBe(undefined);
    expect(child2.attrs2["key3"]).toBe(undefined);
    expect(child2.attrs["key4"]).toBe(undefined);

    // Now do the changes without throwing
    expect(recorder.withRecording(() => doWork(false)).changes.length).toBe(4);

    expect(node.children.length).toBe(2);
    expect(child1.attrs["key"]).toBe(undefined);
    expect(child2.attrs2["key2"].length).toBe(1);
    expect(child2.attrs2["key3"]).toBe(undefined);
    expect(child2.attrs["key4"]).toBe(expr);
  });
});
