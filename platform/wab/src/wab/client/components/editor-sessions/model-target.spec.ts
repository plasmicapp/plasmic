import { EditorSession } from "@/wab/client/components/editor-sessions/editor-session";
import {
  captureModelTarget,
  modelSnapshot,
} from "@/wab/client/components/editor-sessions/model-target";
import { mkVariantSetting } from "@/wab/shared/Variants";
import { code } from "@/wab/shared/core/exprs";
import { mkTplTagX } from "@/wab/shared/core/tpls";

it("compares model fields without copying observable administration", () => {
  const tpl = mkTplTagX("div");
  const vs = mkVariantSetting({ variants: [] });
  tpl.vsettings = [...tpl.vsettings, vs];
  vs.attrs = { ...vs.attrs, title: code('"old"') };
  const metadata = Symbol("observer metadata");
  Object.assign(vs, { [metadata]: { selectedClone: 0 } });
  const target = captureModelTarget({
    exists: () => true,
    read: () => tpl.vsettings,
  });
  Object.assign(vs, { [metadata]: { selectedClone: 1 } });
  expect(target.check()).toBeUndefined();
  vs.attrs = { ...vs.attrs, title: code('"external edit"') };
  expect(target.check()).toContain("changed outside");
  target.accept();
  expect(target.check()).toBeUndefined();
});

it("does not traverse referenced template owners", () => {
  const tpl = mkTplTagX("div");
  const vs = mkVariantSetting({ variants: [] });
  tpl.vsettings = [...tpl.vsettings, vs];
  const before = modelSnapshot(vs);
  tpl.name = "renamed";
  expect(modelSnapshot(vs)).toEqual(before);
});

it("detects in-place expression edits while retaining model references", async () => {
  const expr = code('"old"');
  const write = vi.fn((_draft: { expr: typeof expr }) => {});
  const session = new EditorSession({
    initial: { expr },
    prepare: (draft) => ({
      apply: () => {
        write(draft);
      },
    }),
  });
  expect(session.dirty).toBe(false);
  expr.code = '"new"';
  expect(session.dirty).toBe(true);
  await session.commit();
  expect(write.mock.calls[0][0].expr).toBe(expr);
  expect(session.dirty).toBe(false);
});
