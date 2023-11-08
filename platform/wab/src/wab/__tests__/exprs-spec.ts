import { CompositeExpr } from "../classes";
import { inspect } from "../common";
import { getProjectFlags } from "../devflags";
import { asCode, code } from "../exprs";
import { createSite } from "../sites";

describe("asCode", () => {
  it("works for CompositeExpr", () => {
    expect(
      eval(
        inspect(
          asCode(
            new CompositeExpr({
              hostLiteral: '{"fields": [{}, {"value": null}, {"value": null}]}',
              substitutions: {
                "fields.1.value": code("42"),
                "fields.2.value": code("42"),
              },
            }),
            {
              component: null,
              projectFlags: getProjectFlags(createSite()),
              inStudio: true,
            }
          ).code
        )
      )
    ).toEqual({
      fields: [{}, { value: 42 }, { value: 42 }],
    });
  });
});
