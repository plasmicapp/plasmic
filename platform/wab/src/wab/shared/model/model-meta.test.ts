import { withoutUids } from "@/wab/shared/model/model-meta";

describe("model-meta", () => {
  it("should stamp seen references", function () {
    let x = { uid: 111 } as any;
    x.x = x;
    expect(withoutUids(x)).toEqual({ x: "[seen@0]" });
    x = { uid: 111 } as any;
    x.x = { uid: 222 } as any;
    x.y = x.x;
    return expect(withoutUids(x)).toEqual({ x: {}, y: "[seen@1]" });
  });
});
