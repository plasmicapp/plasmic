import { describe, expect, it } from "vitest";
import { EXTERNAL_SPLIT } from "./__testonly__/data";
import { getExternalIds } from "./index";

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
