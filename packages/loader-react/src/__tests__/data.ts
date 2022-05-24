import { Split } from '@plasmicapp/loader-core';

export const SPLIT_0: Split = {
  id: 'split-0',
  type: 'experiment',
  slices: [
    {
      id: 'slice-0',
      prob: 0.4,
      contents: [],
    },
    {
      id: 'slice-1',
      prob: 0.4,
      contents: [
        {
          type: 'global-variant',
          projectId: 'proj-0',
          group: 'color',
          variant: 'red',
        },
      ],
    },
    {
      id: 'slice-2',
      prob: 0.2,
      contents: [
        {
          type: 'global-variant',
          projectId: 'proj-0',
          group: 'color',
          variant: 'black',
        },
      ],
    },
  ],
};

export const SPLIT_1: Split = {
  id: 'split-1',
  type: 'segment',
  slices: [
    {
      id: 'slice-0',
      cond: {},
      contents: [],
    },
    {
      id: 'slice-1',
      cond: {},
      contents: [
        {
          type: 'global-variant',
          projectId: 'proj-1',
          group: 'border',
          variant: 'small',
        },
      ],
    },
    {
      id: 'slice-2',
      cond: {},
      contents: [
        {
          type: 'global-variant',
          projectId: 'proj-1',
          group: 'border',
          variant: 'big',
        },
      ],
    },
  ],
};

export const SPLIT_2: Split = {
  id: 'split-2',
  type: 'segment',
  externalId: 'EXTSPLIT2',
  slices: [
    {
      id: 'slice-0',
      externalId: 'EXTSLICE0',
      cond: {},
      contents: [],
    },
    {
      id: 'slice-1',
      externalId: 'EXTSLICE1',
      cond: {},
      contents: [
        {
          type: 'global-variant',
          projectId: 'proj-2',
          group: 'age',
          variant: 'young',
        },
      ],
    },
    {
      id: 'slice-2',
      externalId: 'EXTSLICE2',
      cond: {},
      contents: [
        {
          type: 'global-variant',
          projectId: 'proj-2',
          group: 'age',
          variant: 'old',
        },
      ],
    },
  ],
};
