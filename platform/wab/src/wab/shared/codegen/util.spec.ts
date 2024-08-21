import { toJsIdentifier } from "@/wab/shared/codegen/util";

describe("toJsIdentifier", () => {
  it("should work", () => {
    expect(toJsIdentifier("hello")).toEqual("hello");
    expect(toJsIdentifier("Hello moto")).toEqual("helloMoto");
    expect(toJsIdentifier("hello-moto")).toEqual("helloMoto");
    expect(toJsIdentifier("HELLO_MOTO")).toEqual("helloMoto");
    expect(toJsIdentifier("HelloMoto")).toEqual("helloMoto");
    expect(toJsIdentifier("HELLO MOTO")).toEqual("helloMoto");
    expect(toJsIdentifier("  Hello    Moto       ")).toEqual("helloMoto");
    expect(toJsIdentifier("  Γειά σου. Κόσμε")).toEqual("γειάΣουΚόσμε");
    expect(toJsIdentifier(" مرحبا  بالعالم ")).toEqual("مرحبابالعالم");
    expect(toJsIdentifier("こ.んにち は 世界")).toEqual("こんにちは世界");
    expect(toJsIdentifier("สวัสด-ี ชาว โลก")).toEqual("สวัสดีชาวโลก");
    expect(toJsIdentifier("नमस्ते  दुनिय  ा")).toEqual("नमस्तेदुनिया");
    expect(toJsIdentifier("不對  Hello    Moto   不好    ")).toEqual(
      "不對HelloMoto不好"
    );
    expect(toJsIdentifier("&^#@$*Hello &*#@  Moto   不好    ")).toEqual(
      "helloMoto不好"
    );
    expect(toJsIdentifier("234")).toEqual("_234");
    expect(toJsIdentifier("hi234")).toEqual("hi234");
    expect(toJsIdentifier("1 2 3 4")).toEqual("_1234");
    expect(toJsIdentifier("    1 2 3 4")).toEqual("_1234");
    expect(toJsIdentifier("class")).toEqual("_class");
    expect(toJsIdentifier("true")).toEqual("_true");
    expect(toJsIdentifier("new")).toEqual("_new");
    expect(toJsIdentifier("New")).toEqual("_new");
    expect(toJsIdentifier("claSS")).toEqual("claSs");
    expect(toJsIdentifier("_hello")).toEqual("hello");
    expect(toJsIdentifier("invalidChars🌏")).toEqual("invalidChars");
  });

  it("works with camelCase: false", () => {
    expect(toJsIdentifier("Hello moto", { camelCase: false })).toEqual("Hellomoto");
    expect(toJsIdentifier("hello-moto", { camelCase: false })).toEqual("hellomoto");
    expect(toJsIdentifier("HELLO_MOTO", { camelCase: false })).toEqual("HELLO_MOTO");
  });

  it("works with capitalizeFirst: false", () => {
    expect(toJsIdentifier("Hello moto", { capitalizeFirst: false })).toEqual(
      "helloMoto"
    );
    expect(toJsIdentifier("hello-moto", { capitalizeFirst: false })).toEqual(
      "helloMoto"
    );
    expect(toJsIdentifier("HELLO_MOTO", { capitalizeFirst: false })).toEqual(
      "helloMoto"
    );
  });

  it("works with capitalizeFirst: true", () => {
    expect(toJsIdentifier("Hello moto", { capitalizeFirst: true })).toEqual(
      "HelloMoto"
    );
    expect(toJsIdentifier("hello-moto", { capitalizeFirst: true })).toEqual(
      "HelloMoto"
    );
    expect(toJsIdentifier("HELLO_MOTO", { capitalizeFirst: true })).toEqual(
      "HelloMoto"
    );
  });
});
