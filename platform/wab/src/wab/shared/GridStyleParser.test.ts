import GridStyleParser from "@/wab/gen/GridStyleParser";

describe("GridStyleParser", () => {
  it("works", () => {
    expect(
      GridStyleParser.parse("1fr 1fr 1fr", {
        startRule: "axisTemplate",
      })
    ).toMatchObject([
      { size: { type: "NumericSize", num: 1, unit: "fr" } },
      { size: { type: "NumericSize", num: 1, unit: "fr" } },
      { size: { type: "NumericSize", num: 1, unit: "fr" } },
    ]);

    expect(
      GridStyleParser.parse("repeat(auto-fill, minmax(70px, 1fr))", {
        startRule: "axisTemplate",
      })
    ).toMatchObject({
      type: "FlexibleSize",
      size: {
        type: "NumericSize",
        num: 70,
        unit: "px",
      },
    });

    expect(
      GridStyleParser.parse("repeat(2, minmax(0, 1fr))", {
        startRule: "axisTemplate",
      })
    ).toMatchObject({
      type: "FixedSize",
      num: 2,
    });
  });
});
