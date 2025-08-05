import { getActiveVariation } from "../index";
import { EXPERIMENT_SPLIT, EXTERNAL_SPLIT, SEGMENT_SPLIT } from "./data";

describe("getActiveVariation", () => {
  beforeEach(() => {
    jest
      .spyOn(global.Math, "random")
      .mockReturnValue(0.5)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.7);
  });

  afterEach(() => {
    jest.spyOn(global.Math, "random").mockRestore();
  });

  it("should pick slice based on traits", () => {
    const getKnownValue = jest.fn();
    const updateKnownValue = jest.fn();

    expect(
      getActiveVariation({
        splits: [SEGMENT_SPLIT],
        traits: {
          gender: "male",
          age: 30,
        },
        getKnownValue,
        updateKnownValue,
      })
    ).toMatchObject({
      "seg.split-0": "slice-1",
    });

    expect(
      getActiveVariation({
        splits: [SEGMENT_SPLIT],
        traits: {
          gender: "female",
          age: 31,
        },
        getKnownValue,
        updateKnownValue,
      })
    ).toMatchObject({
      "seg.split-0": "slice-0",
    });

    expect(
      getActiveVariation({
        splits: [SEGMENT_SPLIT],
        traits: {
          gender: "male",
          age: 31,
        },
        getKnownValue,
        updateKnownValue,
      })
    ).toMatchObject({
      "seg.split-0": "slice-2",
    });

    expect(getKnownValue).toBeCalledTimes(0);

    // segments shouldn't be called with update known value
    expect(updateKnownValue).not.toBeCalled();
  });

  it("should pick slice based on random value", () => {
    const getKnownValue = jest.fn();
    const updateKnownValue = jest.fn();

    expect(
      // rand = 0.4
      getActiveVariation({
        splits: [EXPERIMENT_SPLIT], // p = [0.2, 0.8]
        traits: {},
        getKnownValue,
        updateKnownValue,
        enableUnseededExperiments: true,
      })
    ).toMatchObject({
      "exp.split-1": "slice-0",
    });

    expect(
      // rand = 0.7
      getActiveVariation({
        splits: [EXPERIMENT_SPLIT], // p = [0.5, 0.5]
        traits: {},
        getKnownValue,
        updateKnownValue,
        enableUnseededExperiments: true,
      })
    ).toMatchObject({
      "exp.split-1": "slice-1",
    });

    expect(
      // rand = 0.5
      getActiveVariation({
        splits: [EXPERIMENT_SPLIT], // p = [0.5, 0.5]
        traits: {},
        getKnownValue,
        updateKnownValue,
        enableUnseededExperiments: true,
      })
    ).toMatchObject({
      "exp.split-1": "slice-0",
    });

    expect(getKnownValue).toBeCalledTimes(3);
    expect(getKnownValue.mock.calls).toEqual([
      ["exp.split-1"],
      ["exp.split-1"],
      ["exp.split-1"],
    ]);

    expect(updateKnownValue).toBeCalledTimes(3);
    expect(updateKnownValue.mock.calls).toEqual([
      ["exp.split-1", "slice-0"],
      ["exp.split-1", "slice-1"],
      ["exp.split-1", "slice-0"],
    ]);
  });

  it("should return variation with external slices info", () => {
    const getKnownValue = jest.fn();
    const updateKnownValue = jest.fn();

    expect(
      // rand = 0.4
      getActiveVariation({
        splits: [EXTERNAL_SPLIT], // p = [0.65, 0.35]
        traits: {},
        getKnownValue,
        updateKnownValue,
        enableUnseededExperiments: true,
      })
    ).toMatchObject({
      "exp.split-2": "slice-0",
      "ext.EXTSPLIT": "EXTSLICE0",
    });

    expect(updateKnownValue).toBeCalledTimes(1);
    expect(updateKnownValue.mock.calls).toEqual([["exp.split-2", "slice-0"]]);
  });

  it("should handle multiple slices", () => {
    const getKnownValue = jest.fn();
    const updateKnownValue = jest.fn();

    expect(
      // rand = 0.4, 0.7
      getActiveVariation({
        splits: [SEGMENT_SPLIT, EXPERIMENT_SPLIT, EXTERNAL_SPLIT], // p = [0.5, 0.5], [0.65, 0.35]
        traits: {
          gender: "male",
          age: 30,
        },
        getKnownValue,
        updateKnownValue,
        enableUnseededExperiments: true,
      })
    ).toMatchObject({
      "seg.split-0": "slice-1",
      "exp.split-1": "slice-0",
      "exp.split-2": "slice-1",
      "ext.EXTSPLIT": "EXTSLICE1",
    });

    expect(getKnownValue).toBeCalledTimes(2);
    expect(getKnownValue.mock.calls).toEqual([
      ["exp.split-1"],
      ["exp.split-2"],
    ]);

    expect(updateKnownValue).toBeCalledTimes(2);
    expect(updateKnownValue.mock.calls).toEqual([
      ["exp.split-1", "slice-0"],
      ["exp.split-2", "slice-1"],
    ]);
  });

  it("should handle custom random value functions", () => {
    const getKnownValue = jest.fn();
    const updateKnownValue = jest.fn();
    const getRandomValue = jest
      .fn()
      .mockReturnValueOnce(0.7)
      .mockReturnValueOnce(0.1);

    expect(
      // rand = 0.7, 0.1
      getActiveVariation({
        splits: [EXPERIMENT_SPLIT, EXTERNAL_SPLIT], // p = [0.5, 0.5], [0.65, 0.35]
        traits: {},
        getRandomValue,
        getKnownValue,
        updateKnownValue,
        enableUnseededExperiments: true,
      })
    ).toMatchObject({
      "exp.split-1": "slice-1",
      "exp.split-2": "slice-0",
      "ext.EXTSPLIT": "EXTSLICE0",
    });
  });

  it("should return variation from known info", () => {
    const getKnownValue = jest.fn().mockReturnValueOnce("KNOWNVALUE");
    const updateKnownValue = jest.fn();

    expect(
      getActiveVariation({
        splits: [EXPERIMENT_SPLIT],
        traits: {},
        getKnownValue,
        updateKnownValue,
        enableUnseededExperiments: true,
      })
    ).toMatchObject({
      "exp.split-1": "KNOWNVALUE",
    });

    expect(getKnownValue).toBeCalledTimes(1);
    expect(getKnownValue.mock.calls).toEqual([["exp.split-1"]]);

    expect(updateKnownValue).not.toBeCalled();
  });
});
