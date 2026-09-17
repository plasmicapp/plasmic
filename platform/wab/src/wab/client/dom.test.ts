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
        [...Dom.bfs(root)].map((x) => x.get(0).tagName.toLowerCase()),
      ).toEqual(["div", "span", "p", "a", "b", "em", "strong"]);
    }));
}

describe("getFormStringValues", () => {
  it("reads named string fields, skipping disabled and file inputs", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input name="email" value=" a@b.com " />
      <input name="password" type="password" value="pw" />
      <input name="disabled" value="x" disabled />
      <input name="unchecked" type="checkbox" value="x" />
      <input name="checked" type="checkbox" value="yes" checked />
      <input name="file" type="file" />
      <input value="no-name" />
    `;
    expect(Dom.getFormStringValues(form)).toEqual({
      email: " a@b.com ",
      password: "pw",
      checked: "yes",
    });
  });
});
