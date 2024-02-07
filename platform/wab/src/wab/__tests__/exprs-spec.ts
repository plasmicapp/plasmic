import { CompositeExpr } from "@/wab/classes";
import { inspect } from "@/wab/common";
import { getProjectFlags } from "@/wab/devflags";
import { asCode, code } from "@/wab/exprs";
import { createSite } from "@/wab/sites";

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
