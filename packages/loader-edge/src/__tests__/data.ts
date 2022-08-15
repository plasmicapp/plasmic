import { Split } from '@plasmicapp/loader-fetcher';

export const SEGMENT_SPLIT: Split = {
  id: 'split-0',
  type: 'segment',
  slices: [
    {
      id: 'slice-0',
      contents: [],
      cond: {},
    },
    {
      id: 'slice-1',
      contents: [],
      cond: {
        and: [
          {
            '==': [
              {
                var: 'gender',
              },
              'male',
            ],
          },
          {
            '<=': [
              {
                var: 'age',
              },
              30,
            ],
          },
        ],
      },
    },
    {
      id: 'slice-2',
      contents: [],
      cond: {
        and: [
          {
            '==': [
              {
                var: 'gender',
              },
              'male',
            ],
          },
          {
            '>': [
              {
                var: 'age',
              },
              30,
            ],
          },
        ],
      },
    },
  ],
};

export const EXPERIMENT_SPLIT: Split = {
  id: 'split-1',
  type: 'experiment',
  slices: [
    {
      id: 'slice-0',
      prob: 0.5,
      contents: [],
    },
    {
      id: 'slice-1',
      prob: 0.5,
      contents: [],
    },
  ],
};

export const EXTERNAL_SPLIT: Split = {
  id: 'split-2',
  type: 'experiment',
  externalId: 'EXTSPLIT',
  slices: [
    {
      id: 'slice-0',
      prob: 0.65,
      externalId: 'EXTSLICE0',
      contents: [],
    },
    {
      id: 'slice-1',
      prob: 0.35,
      externalId: 'EXTSLICE1',
      contents: [],
    },
  ],
};
