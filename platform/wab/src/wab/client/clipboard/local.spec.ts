import { TplTag } from "@/wab/classes";
import { LocalClipboard, TplClip } from "@/wab/client/clipboard/local";
import { ComponentType, mkComponent } from "@/wab/components";
import { withoutUids } from "@/wab/model/model-meta";
import { mkTplTestText } from "@/wab/test/tpls";
import { mkTplTagX } from "@/wab/tpls";

describe("LocalClipboard", function () {
  let src: TplTag, cb: LocalClipboard;
  const component = mkComponent({
    name: "Component",
    tplTree: mkTplTagX("div"),
    type: ComponentType.Plain,
  });
  const mutate = (x) => (x.text = "goodbye world");
  beforeEach(function () {
    cb = new LocalClipboard();
    src = mkTplTestText("hello");
    cb.copy({
      type: "tpl",
      component,
      node: src,
    });
  });
  it("should support basic state functions", function () {
    expect(cb.isSet()).toBe(true);
    expect(cb.isEmpty()).toBe(false);
    cb.clear();
    expect(cb.isSet()).toBe(false);
    expect(cb.isEmpty()).toBe(true);
    expect(() => cb.paste()).toThrow();
    cb = new LocalClipboard();
    expect(cb.isSet()).toBe(false);
    expect(cb.isEmpty()).toBe(true);
    expect(() => cb.paste()).toThrow();
  });
  it("should produce clones", function () {
    const y = cb.paste() as TplClip;
    const z = cb.paste() as TplClip;
    expect(y.type).toEqual("tpl");
    expect(z.type).toEqual("tpl");
    expect(withoutUids(src)).toEqual(withoutUids(y.node));
    expect(withoutUids(src)).toEqual(withoutUids(z.node));
  });
  it("should clone, not reference, the object it copies", function () {
    mutate(src);
    const y = cb.paste() as TplClip;
    expect(withoutUids(src)).not.toEqual(withoutUids(y.node));
  });
  return it("should clone, not reference, the clipboard contents on paste", function () {
    cb.copy({
      type: "tpl",
      component,
      node: src,
    });
    const y = cb.paste() as TplClip;
    mutate(y.node);
    const z = cb.paste() as TplClip;
    expect(withoutUids(y.node)).not.toEqual(withoutUids(z.node));
  });
});
