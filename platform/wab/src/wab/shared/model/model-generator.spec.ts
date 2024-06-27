import { ensure, tuple } from "@/wab/shared/common";
import { clean, parse, transform } from "@/wab/shared/model/model-generator";
import { Class, Field, Type } from "@/wab/shared/model/model-meta";
import L from "lodash";

function trimIndent(x: string) {
  const lines = x.split("\n");
  const matches = lines.map((line) => {
    return line.match(/^\s*\S/);
  });
  const minIndent = ensure(
    L.min(
      Array.from(matches)
        .filter(((match) => match != null) as (m) => m is RegExpMatchArray)
        .map((match) => match[0].length - 1)
    ),
    "At least one match must exist"
  );
  return lines
    .map((line) => {
      return line.substr(minIndent);
    })
    .join("\n");
}

describe("clean", () =>
  it("should work", () =>
    expect(
      clean(
        trimIndent(`\
Abc

#

#
  Abc
    @a Abc
  #\
`)
      )
    ).toBe(
      trimIndent(
        `\
Abc
{{{
  Abc
{{{
    @a Abc
}}} }}}\
`
      )
    )));

const example = `\
# aoeu
Abc: Abc
  a: A
  b: B
  A
    c: C
    d: D
#

  B
    c: C
    d: D
    # aoeu
Abc: Abc
  @WeakRef a: A
  b: B
  A
    c: [C]
    d: {D}
  B
    c: C?
    d: D
    e: A | B | C
    x: [A | B | C]?
    z: Z[A,B]\
`;
describe("parse", () =>
  it("should work", function () {
    const parsed = parse(example);
    const expected = tuple(
      {
        name: "Abc",
        base: "Abc",
        concrete: false,
        fields: [
          {
            name: "a",
            type: {
              type: "A",
              params: [],
            },
            annotations: [],
          },
          {
            name: "b",
            type: {
              type: "B",
              params: [],
            },
            annotations: [],
          },
        ],
        subclasses: [
          {
            name: "A",
            base: undefined,
            concrete: false,
            fields: [
              {
                name: "c",
                type: {
                  type: "C",
                  params: [],
                },
                annotations: [],
              },
              {
                name: "d",
                type: {
                  type: "D",
                  params: [],
                },
                annotations: [],
              },
            ],
            subclasses: [],
          },
          {
            name: "B",
            base: undefined,
            concrete: false,
            fields: [
              {
                name: "c",
                type: {
                  type: "C",
                  params: [],
                },
                annotations: [],
              },
              {
                name: "d",
                type: {
                  type: "D",
                  params: [],
                },
                annotations: [],
              },
            ],
            subclasses: [],
          },
        ],
      },
      {
        name: "Abc",
        base: "Abc",
        concrete: false,
        fields: [
          {
            name: "a",
            type: {
              type: "A",
              params: [],
            },
            annotations: ["WeakRef"],
          },
          {
            name: "b",
            type: {
              type: "B",
              params: [],
            },
            annotations: [],
          },
        ],
        subclasses: [
          {
            name: "A",
            base: undefined,
            concrete: false,
            fields: [
              {
                name: "c",
                type: {
                  type: "List",
                  params: [
                    {
                      type: "C",
                      params: [],
                    },
                  ],
                },
                annotations: [],
              },
              {
                name: "d",
                type: {
                  type: "Set",
                  params: [
                    {
                      type: "D",
                      params: [],
                    },
                  ],
                },
                annotations: [],
              },
            ],
            subclasses: [],
          },
          {
            name: "B",
            base: undefined,
            concrete: false,
            fields: [
              {
                name: "c",
                type: {
                  type: "Optional",
                  params: [
                    {
                      type: "C",
                      params: [],
                    },
                  ],
                },
                annotations: [],
              },
              {
                name: "d",
                type: {
                  type: "D",
                  params: [],
                },
                annotations: [],
              },
              {
                name: "e",
                type: {
                  type: "Or",
                  params: [
                    {
                      type: "A",
                      params: [],
                    },
                    {
                      type: "B",
                      params: [],
                    },
                    {
                      type: "C",
                      params: [],
                    },
                  ],
                },
                annotations: [],
              },
              {
                name: "x",
                type: {
                  type: "Optional",
                  params: [
                    {
                      type: "List",
                      params: [
                        {
                          type: "Or",
                          params: [
                            {
                              type: "A",
                              params: [],
                            },
                            {
                              type: "B",
                              params: [],
                            },
                            {
                              type: "C",
                              params: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                annotations: [],
              },
              {
                name: "z",
                type: {
                  type: "Z",
                  params: [
                    {
                      type: "A",
                      params: [],
                    },
                    {
                      type: "B",
                      params: [],
                    },
                  ],
                },
                annotations: [],
              },
            ],
            subclasses: [],
          },
        ],
      }
    );
    return expect(parsed).toEqual(expected);
  }));

describe("transform", () =>
  it("should work", () =>
    expect(transform(parse(example).slice(1))).toEqual([
      new Class({
        name: "Abc",
        concrete: false,
        base: "Abc",
        fields: tuple(
          new Field({
            name: "a",
            type: new Type({ type: "A", params: [] }),
            annotations: ["WeakRef"],
          }),
          new Field({
            name: "b",
            type: new Type({ type: "B", params: [] }),
            annotations: [],
          })
        ),
      }),
      new Class({
        name: "A",
        concrete: false,
        base: "Abc",
        fields: tuple(
          new Field({
            name: "c",
            type: new Type({
              type: "List",
              params: [new Type({ type: "C", params: [] })],
            }),
            annotations: [],
          }),
          new Field({
            name: "d",
            type: new Type({
              type: "Set",
              params: [new Type({ type: "D", params: [] })],
            }),
            annotations: [],
          })
        ),
      }),
      new Class({
        name: "B",
        concrete: false,
        base: "Abc",
        fields: [
          new Field({
            name: "c",
            type: new Type({
              type: "Optional",
              params: [new Type({ type: "C", params: [] })],
            }),
            annotations: [],
          }),
          new Field({
            name: "d",
            type: new Type({ type: "D", params: [] }),
            annotations: [],
          }),
          new Field({
            name: "e",
            type: new Type({
              type: "Or",
              params: [
                new Type({ type: "A", params: [] }),
                new Type({ type: "B", params: [] }),
                new Type({ type: "C", params: [] }),
              ],
            }),
            annotations: [],
          }),
          new Field({
            name: "x",
            type: new Type({
              type: "Optional",
              params: [
                new Type({
                  type: "List",
                  params: [
                    new Type({
                      type: "Or",
                      params: [
                        new Type({ type: "A", params: [] }),
                        new Type({ type: "B", params: [] }),
                        new Type({ type: "C", params: [] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            annotations: [],
          }),
          new Field({
            name: "z",
            type: new Type({
              type: "Z",
              params: tuple(
                new Type({ type: "A", params: [] }),
                new Type({ type: "B", params: [] })
              ),
            }),
            annotations: [],
          }),
        ],
      }),
    ])));
