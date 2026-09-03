import { Split } from "@plasmicapp/loader-fetcher";

export const SEGMENT_SPLIT: Split = {
  name: "SEGMENT_SPLIT",
  id: "split-0",
  type: "segment",
  projectId: "project-0",
  description: "Segment split",
  pagesPaths: ["/"],
  slices: [
    {
      id: "slice-0",
      contents: [],
      cond: {},
    },
    {
      id: "slice-1",
      contents: [],
      cond: {
        and: [
          {
            "==": [
              {
                var: "gender",
              },
              "male",
            ],
          },
          {
            "<=": [
              {
                var: "age",
              },
              30,
            ],
          },
        ],
      },
    },
    {
      id: "slice-2",
      contents: [],
      cond: {
        and: [
          {
            "==": [
              {
                var: "gender",
              },
              "male",
            ],
          },
          {
            ">": [
              {
                var: "age",
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
  name: "EXPERIMENT_SPLIT",
  id: "split-1",
  type: "experiment",
  projectId: "project-1",
  description: "A/B test split",
  pagesPaths: ["/", "/about"],
  slices: [
    {
      id: "slice-0",
      prob: 0.5,
      contents: [],
    },
    {
      id: "slice-1",
      prob: 0.5,
      contents: [],
    },
  ],
};

export const EXTERNAL_SPLIT: Split = {
  name: "EXTERNAL_SPLIT",
  id: "split-2",
  type: "experiment",
  externalId: "EXTSPLIT",
  projectId: "project-2",
  description: "A/B test with external ids",
  pagesPaths: ["/faq"],
  slices: [
    {
      id: "slice-0",
      prob: 0.65,
      externalId: "EXTSLICE0",
      contents: [],
    },
    {
      id: "slice-1",
      prob: 0.35,
      externalId: "EXTSLICE1",
      contents: [],
    },
  ],
};
