import {
  getGlobalVariantsFromSplits,
  mergeGlobalVariantsSpec,
} from '../variation';
import { SPLIT_0, SPLIT_1, SPLIT_2 } from './data';

describe('getGlobalVariantsFromSplits', () => {
  it('should get global variatins from variation mapping', () => {
    expect(
      getGlobalVariantsFromSplits([SPLIT_0, SPLIT_1, SPLIT_2], {
        'exp.split-0': 'slice-0',
        'seg.split-1': 'slice-1',
        'seg.split-2': 'slice-1',
      })
    ).toEqual(
      expect.arrayContaining([
        {
          name: 'border',
          value: 'small',
          projectId: 'proj-1',
        },
        {
          name: 'age',
          value: 'young',
          projectId: 'proj-2',
        },
      ])
    );

    expect(
      getGlobalVariantsFromSplits([SPLIT_0, SPLIT_1, SPLIT_2], {
        'exp.split-0': 'slice-1',
        'seg.split-1': 'slice-2',
        'ext.EXTSPLIT2': 'EXTSLICE2',
      })
    ).toEqual(
      expect.arrayContaining([
        {
          name: 'color',
          value: 'red',
          projectId: 'proj-0',
        },
        {
          name: 'border',
          value: 'big',
          projectId: 'proj-1',
        },
        {
          name: 'age',
          value: 'old',
          projectId: 'proj-2',
        },
      ])
    );

    expect(
      getGlobalVariantsFromSplits([SPLIT_0, SPLIT_1, SPLIT_2], {
        'exp.split-0': 'badid',
      })
    ).toEqual([]);
  });
});

describe('mergeGlobalVariantSpec', () => {
  it('should merge global variants', () => {
    expect(
      mergeGlobalVariantsSpec(
        [
          {
            name: 'border',
            value: 'small',
            projectId: 'proj-1',
          },
        ],
        [
          {
            name: 'age',
            value: 'old',
            projectId: 'proj-2',
          },
        ]
      )
    ).toEqual([
      {
        name: 'border',
        value: 'small',
        projectId: 'proj-1',
      },
      {
        name: 'age',
        value: 'old',
        projectId: 'proj-2',
      },
    ]);

    expect(
      mergeGlobalVariantsSpec(
        [
          {
            name: 'border',
            value: 'small',
            projectId: 'proj-1',
          },
        ],
        [
          {
            name: 'border',
            value: 'big',
            projectId: 'proj-1',
          },
        ]
      )
    ).toEqual([
      {
        name: 'border',
        value: 'small',
        projectId: 'proj-1',
      },
    ]);
  });
});
