import { generateAllPaths } from '../index';
import { DELIMITER } from '../variation';
import { EXPERIMENT_SPLIT, SEGMENT_SPLIT } from './data';

describe('generateAllPaths', () => {
  it('should generate all paths', () => {
    const segmentResult = generateAllPaths('plasmic.app', [SEGMENT_SPLIT]);
    expect(segmentResult.length).toBe(4);
    expect(segmentResult).toEqual(
      expect.arrayContaining([
        'plasmic.app/',
        `plasmic.app/${DELIMITER}seg.split-0=slice-0`,
        `plasmic.app/${DELIMITER}seg.split-0=slice-1`,
        `plasmic.app/${DELIMITER}seg.split-0=slice-2`,
      ])
    );

    const experimentResult = generateAllPaths('docs.plasmic.app', [
      EXPERIMENT_SPLIT,
    ]);
    expect(experimentResult.length).toBe(3);
    expect(experimentResult).toEqual(
      expect.arrayContaining([
        'docs.plasmic.app/',
        `docs.plasmic.app/${DELIMITER}exp.split-1=slice-0`,
        `docs.plasmic.app/${DELIMITER}exp.split-1=slice-1`,
      ])
    );

    const multiSplitResult = generateAllPaths('https://plasmic.app', [
      EXPERIMENT_SPLIT,
      SEGMENT_SPLIT,
    ]);
    expect(multiSplitResult.length).toBe(12);
    expect(multiSplitResult).toEqual(
      expect.arrayContaining([
        'https://plasmic.app/',
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-0`,
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-1`,
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-2`,
        `https://plasmic.app/${DELIMITER}exp.split-1=slice-0`,
        `https://plasmic.app/${DELIMITER}exp.split-1=slice-1`,
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-0${DELIMITER}exp.split-1=slice-0`,
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-0${DELIMITER}exp.split-1=slice-1`,
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-1${DELIMITER}exp.split-1=slice-0`,
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-1${DELIMITER}exp.split-1=slice-1`,
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-2${DELIMITER}exp.split-1=slice-0`,
        `https://plasmic.app/${DELIMITER}seg.split-0=slice-2${DELIMITER}exp.split-1=slice-1`,
      ])
    );
  });
});
