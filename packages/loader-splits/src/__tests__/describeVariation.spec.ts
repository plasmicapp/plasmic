import { describeVariation } from "../index";
import { EXPERIMENT_SPLIT, EXTERNAL_SPLIT, SEGMENT_SPLIT } from "./data";

describe("describeVariation", () => {
  it("should properly match key/value", () => {
    expect(
      describeVariation([SEGMENT_SPLIT, EXTERNAL_SPLIT], {
        "seg.split-0": "slice-0",
        "exp.split-2": "slice-1",
        "ext.EXTSPLIT": "EXTSLICE1",
      })
    ).toMatchObject({
      "seg.split-0": {
        name: "SEGMENT_SPLIT",
        description: "Segment split",
        pagesPaths: ["/"],
        type: "original",
        chosenValue: "slice-0",
        externalIdGroup: undefined,
        externalIdValue: undefined,
      },
      "exp.split-2": {
        name: "EXTERNAL_SPLIT",
        description: "A/B test with external ids",
        pagesPaths: ["/faq"],
        type: "override",
        chosenValue: "slice-1",
        externalIdGroup: "EXTSPLIT",
        externalIdValue: "EXTSLICE1",
      },
      "ext.EXTSPLIT": {
        name: "EXTERNAL_SPLIT",
        description: "A/B test with external ids",
        pagesPaths: ["/faq"],
        type: "override",
        chosenValue: "EXTSLICE1",
        externalIdGroup: "EXTSPLIT",
        externalIdValue: "EXTSLICE1",
      },
    });

    expect(
      describeVariation([EXPERIMENT_SPLIT], {
        "exp.split-1": "slice-1",
      })
    ).toMatchObject({
      "exp.split-1": {
        name: "EXPERIMENT_SPLIT",
        description: "A/B test split",
        pagesPaths: ["/", "/about"],
        type: "override",
        chosenValue: "slice-1",
        externalIdGroup: undefined,
        externalIdValue: undefined,
      },
    });
  });

  it("should return unknown for unknown keys", () => {
    expect(() =>
      describeVariation([EXPERIMENT_SPLIT, SEGMENT_SPLIT, EXTERNAL_SPLIT], {
        "exp.unknown": "slice-1",
        "ext.unknown": "EXTSLICE1",
      })
    ).toThrow('Split not found for key "exp.unknown"');

    expect(() =>
      describeVariation([EXPERIMENT_SPLIT, SEGMENT_SPLIT, EXTERNAL_SPLIT], {
        "exp.split-1": "slice-unknown",
      })
    ).toThrow('Invalid split value "slice-unknown" for key "exp.split-1"');
  });
});
