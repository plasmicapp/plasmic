import { getExternalIds } from "../index";
import { EXTERNAL_SPLIT } from "./data";

describe("getExternalIds", () => {
  it("should convert normal ids to external ones", () => {
    expect(
      getExternalIds([EXTERNAL_SPLIT], {
        "exp.split-2": "slice-0",
      })
    ).toMatchObject({
      EXTSPLIT: "EXTSLICE0",
    });

    expect(
      getExternalIds([EXTERNAL_SPLIT], {
        "exp.split-2": "slice-1",
      })
    ).toMatchObject({
      EXTSPLIT: "EXTSLICE1",
    });
  });
});
