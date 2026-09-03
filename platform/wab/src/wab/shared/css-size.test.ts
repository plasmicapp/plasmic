import { parseScreenSpec } from "@/wab/shared/css-size";

describe("Css", function () {
  it("should work", () => {
    expect(
      parseScreenSpec("(min-width : 100px ) and ( max-width: 200px )").query()
    ).toEqual("(min-width:100px) and (max-width:200px)");
    expect(parseScreenSpec("(min-width : 100px)").query()).toEqual(
      "(min-width:100px)"
    );
    expect(parseScreenSpec("(max-width : 100px)").query()).toEqual(
      "(max-width:100px)"
    );
    expect(parseScreenSpec("(min-width : -1px)").query()).toEqual(
      "(min-width:0px)"
    );
  });
});
