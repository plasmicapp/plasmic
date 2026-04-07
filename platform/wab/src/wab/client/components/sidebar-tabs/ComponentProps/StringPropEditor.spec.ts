import { _testonly } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { customCode, ExprCtx } from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import { getProjectFlags } from "@/wab/shared/devflags";
import { ObjectPath, TemplatedString } from "@/wab/shared/model/classes";

const { templatedStringsEqual, simplifyTemplatedString } = _testonly;

const exprCtx: ExprCtx = {
  component: null,
  inStudio: true,
  projectFlags: getProjectFlags(createSite()),
};

describe("templatedStringsEqual", () => {
  it("is true for identical plain text", () => {
    const a = new TemplatedString({ text: ["hello"] });
    const b = new TemplatedString({ text: ["hello"] });
    expect(templatedStringsEqual(a, b, exprCtx)).toBe(true);
  });

  it("is false for different plain text", () => {
    const a = new TemplatedString({ text: ["hello"] });
    const b = new TemplatedString({ text: ["world"] });
    expect(templatedStringsEqual(a, b, exprCtx)).toBe(false);
  });

  it("is true for text resulting in same codegen output", () => {
    const a = new TemplatedString({ text: ["hello,", " world", "!"] });
    const b = new TemplatedString({ text: ["hello, world", "!"] });
    expect(templatedStringsEqual(a, b, exprCtx)).toBe(true);
  });

  it("is true for two TemplatedStrings wrapping the same ObjectPath (different TemplatedString references)", () => {
    const a = new TemplatedString({
      text: [
        "",
        new ObjectPath({ path: ["user", "name"], fallback: null }),
        "",
      ],
    });
    const b = new TemplatedString({
      text: [
        "",
        new ObjectPath({ path: ["user", "name"], fallback: null }),
        "",
      ],
    });
    expect(a).not.toBe(b); // different TemplatedString instances
    expect(templatedStringsEqual(a, b, exprCtx)).toBe(true);
  });

  it("is true for two TemplatedStrings wrapping the same CustomCode (different TemplatedString references)", () => {
    const a = new TemplatedString({
      text: ["", customCode("(user.name)"), ""],
    });
    const b = new TemplatedString({
      text: ["", customCode("(user.name)"), ""],
    });
    expect(a).not.toBe(b);
    expect(templatedStringsEqual(a, b, exprCtx)).toBe(true);
  });

  it("is false for two TemplatedStrings wrapping different ObjectPaths", () => {
    const a = new TemplatedString({
      text: [
        "",
        new ObjectPath({ path: ["user", "name"], fallback: null }),
        "",
      ],
    });
    const b = new TemplatedString({
      text: [
        "",
        new ObjectPath({ path: ["user", "email"], fallback: null }),
        "",
      ],
    });
    expect(templatedStringsEqual(a, b, exprCtx)).toBe(false);
  });

  it("is false for plain text vs dynamic expression", () => {
    const a = new TemplatedString({ text: ["user.name"] });
    const b = new TemplatedString({
      text: [
        "",
        new ObjectPath({ path: ["user", "name"], fallback: null }),
        "",
      ],
    });
    expect(templatedStringsEqual(a, b, exprCtx)).toBe(false);
  });

  it("is false when text is added around an existing dynamic expression", () => {
    const op = new ObjectPath({ path: ["user", "name"], fallback: null });
    const original = new TemplatedString({ text: ["", op, ""] });
    const edited = new TemplatedString({ text: ["Hello ", op, "!"] });
    expect(templatedStringsEqual(original, edited, exprCtx)).toBe(false);
  });
});

describe("simplifyTemplatedString", () => {
  it("returns an empty string for an empty TemplatedString", () => {
    const ts = new TemplatedString({ text: [] });
    expect(simplifyTemplatedString(ts)).toBe("");
  });

  it("returns an empty string for the default empty TemplatedString", () => {
    const ts = new TemplatedString({ text: [""] });
    expect(simplifyTemplatedString(ts)).toBe("");
  });

  it("returns a joined string for multiple plain string parts", () => {
    const ts = new TemplatedString({ text: ["hello", " ", "world"] });
    expect(simplifyTemplatedString(ts)).toBe("hello world");
  });

  it("returns the bare string for a TemplatedString wrapping a single string", () => {
    const ts = new TemplatedString({ text: ["", "hello world", ""] });
    expect(simplifyTemplatedString(ts)).toBe("hello world");
  });

  it("returns the bare ObjectPath for a TemplatedString wrapping a single ObjectPath", () => {
    const op = new ObjectPath({ path: ["user", "name"], fallback: null });
    const ts = new TemplatedString({ text: ["", "", op, ""] });
    expect(simplifyTemplatedString(ts)).toBe(op);
  });

  it("returns the bare CustomCode for a TemplatedString wrapping a single CustomCode", () => {
    const cc = customCode("user.name");
    const ts = new TemplatedString({ text: [cc, ""] });
    expect(simplifyTemplatedString(ts)).toBe(cc);
  });

  it("returns the TemplatedString as-is for multiple expressions", () => {
    const op = new ObjectPath({ path: ["user", "name"], fallback: null });
    const cc = customCode("user.email");
    const ts = new TemplatedString({ text: ["", op, " ", cc, ""] });
    expect(simplifyTemplatedString(ts)).toBe(ts);
  });

  it("returns the TemplatedString as-is, even if strings could be joined ", () => {
    const cc = customCode("cc");
    const ts = new TemplatedString({ text: ["aa", "bb", cc, "dd"] });
    expect(simplifyTemplatedString(ts)).toBe(ts);
  });
});
