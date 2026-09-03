import * as Dom from "@/wab/client/dom";
import $ from "jquery";

if (typeof window !== "undefined" && window !== null) {
  describe("bfs", () =>
    it("should work", function () {
      const root = $(`\
<div>
  <span>
    <a></a>
    <b></b>
  </span>
  <p>
    <em></em>
    <strong></strong>
  </p>
</div>\
`);
      return expect(
        [...Dom.bfs(root)].map((x) => x.get(0).tagName.toLowerCase())
      ).toEqual(["div", "span", "p", "a", "b", "em", "strong"]);
    }));
}
