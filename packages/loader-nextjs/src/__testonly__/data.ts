import { Split } from "@plasmicapp/loader-core";

export const SPLIT_0: Split = {
  id: "split-0",
  type: "experiment",
  slices: [
    {
      id: "slice-0",
      prob: 0.4,
      contents: [],
    },
    {
      id: "slice-1",
      prob: 0.4,
      contents: [
        {
          type: "global-variant",
          projectId: "proj-0",
          group: "color",
          variant: "red",
        },
      ],
    },
    {
      id: "slice-2",
      prob: 0.2,
      contents: [
        {
          type: "global-variant",
          projectId: "proj-0",
          group: "color",
          variant: "black",
        },
      ],
    },
  ],
  projectId: "proj-0",
  name: "split-0",
  description: "description",
  pagesPaths: [],
};

export const SPLIT_1: Split = {
  id: "split-1",
  type: "segment",
  slices: [
    {
      id: "slice-0",
      cond: {},
      contents: [],
    },
    {
      id: "slice-1",
      cond: {
        and: [
          {
            ">=": [
              {
                var: "age",
              },
              30,
            ],
          },
        ],
      },
      contents: [
        {
          type: "global-variant",
          projectId: "proj-1",
          group: "border",
          variant: "small",
        },
      ],
    },
    {
      id: "slice-2",
      cond: {
        and: [
          {
            ">=": [
              {
                var: "age",
              },
              50,
            ],
          },
        ],
      },
      contents: [
        {
          type: "global-variant",
          projectId: "proj-1",
          group: "border",
          variant: "big",
        },
      ],
    },
  ],
  projectId: "proj-0",
  name: "split-0",
  description: "description",
  pagesPaths: [],
};
