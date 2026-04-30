import { Bundler } from "@/wab/shared/bundler";
import { Site } from "@/wab/shared/model/classes";
import { toJson } from "@/wab/shared/model/model-tree-util";
import { typeFactory, wabToTsType } from "@/wab/shared/model/model-util";
import { readFileSync } from "fs";

describe("model-util", () => {
  it("works", () => {
    const bundle = JSON.parse(
      readFileSync(
        "src/wab/shared/codegen/__tests__/bundles/todomvc.json",
        "utf8"
      )
    );
    const bundler = new Bundler();
    const site = bundler.unbundle(bundle, "uuid") as Site;
    const json = toJson(site, bundler);
    expect(json).toMatchSnapshot();
  });
});

describe("wabToTsType", () => {
  describe("choice", () => {
    it("emits a string-literal union for primitive options", () => {
      expect(wabToTsType(typeFactory.choice(["red", "blue", "green"]))).toBe(
        `"red"|"blue"|"green"`
      );
    });

    it("emits a string-literal union of values for {label, value} options", () => {
      expect(
        wabToTsType(
          typeFactory.choice([
            { label: "Red", value: "red" },
            { label: "Blue", value: "blue" },
            { label: "Green", value: "green" },
          ])
        )
      ).toBe(`"red"|"blue"|"green"`);
    });

    it("handles a mix of primitive and object options", () => {
      expect(
        wabToTsType(
          typeFactory.choice([
            "red",
            { label: "Blue", value: "blue" },
            "green",
          ] as any)
        )
      ).toBe(`"red"|"blue"|"green"`);
    });

    it("supports number-typed values", () => {
      expect(
        wabToTsType(
          typeFactory.choice([
            { label: "One", value: 1 },
            { label: "Two", value: 2 },
          ])
        )
      ).toBe(`1|2`);
    });

    it("falls back to string when there are no options", () => {
      expect(wabToTsType(typeFactory.choice([]))).toBe("string");
    });
  });

  describe("function types", () => {
    it("emits () => void for a function with no params", () => {
      expect(wabToTsType(typeFactory.func())).toBe("() => void");
    });

    it("emits a typed signature for a function with params", () => {
      expect(
        wabToTsType(
          typeFactory.func(
            typeFactory.arg("event", typeFactory.any()),
            typeFactory.arg("count", typeFactory.num())
          )
        )
      ).toBe("(event: any, count: number) => void");
    });
  });

  describe("non-choice types", () => {
    it("maps primitive types via wabToTsTypeMap", () => {
      expect(wabToTsType(typeFactory.text())).toBe("string");
      expect(wabToTsType(typeFactory.num())).toBe("number");
      expect(wabToTsType(typeFactory.bool())).toBe("boolean");
      expect(wabToTsType(typeFactory.img())).toBe("string");
      expect(wabToTsType(typeFactory.href())).toBe("string");
      // PLA-13024: This is incorrect - there is no Target type in scope!
      expect(wabToTsType(typeFactory.target())).toBe("Target");
    });

    it("maps any to any", () => {
      expect(wabToTsType(typeFactory.any())).toBe("any");
    });
  });

  describe("renderable", () => {
    it("returns ReactNode by default", () => {
      expect(wabToTsType(typeFactory.renderable())).toBe("ReactNode");
    });

    it("returns React.ReactNode when forCodeGen is true", () => {
      expect(wabToTsType(typeFactory.renderable(), true)).toBe(
        "React.ReactNode"
      );
    });
  });
});
