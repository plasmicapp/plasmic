import { jsonToXml } from "@/wab/shared/web-exporter/json-to-xml";

describe("jsonToXml", () => {
  it("renders scalar fields as attributes and arrays as ARRAY/ITEM", () => {
    const model = {
      __type: "OutputResult",
      messages: ["Created component.", "Done."],
      results: [
        {
          __type: "Component",
          name: "Button",
          uuid: "abc",
          type: "plain",
          pageMeta: { __type: "PageMeta", path: "/home" },
          props: [
            { __type: "Prop", name: "label", type: "text" },
            { __type: "Prop", name: "count", type: "num" },
          ],
        },
      ],
    };

    expect(jsonToXml(model, true)).toMatchInlineSnapshot(`
      "<OutputResult>
        <messages>
          <ARRAY>
            <ITEM>Created component.</ITEM>
            <ITEM>Done.</ITEM>
          </ARRAY>
        </messages>
        <results>
          <ARRAY>
            <ITEM>
              <Component name="Button" uuid="abc" type="plain">
                <pageMeta>
                  <PageMeta path="/home"></PageMeta>
                </pageMeta>
                <props>
                  <ARRAY>
                    <ITEM>
                      <Prop name="label" type="text"></Prop>
                    </ITEM>
                    <ITEM>
                      <Prop name="count" type="num"></Prop>
                    </ITEM>
                  </ARRAY>
                </props>
              </Component>
            </ITEM>
          </ARRAY>
        </results>
      </OutputResult>"
    `);
  });

  it("wraps HTML markup strings (the tpl tree) in CDATA", () => {
    expect(
      jsonToXml(
        {
          __type: "Component",
          baseVariantTplTree: '<div class="root"><span>A & B</span></div>',
        },
        true
      )
    ).toMatchInlineSnapshot(`
      "<Component>
        <baseVariantTplTree><![CDATA[<div class="root"><span>A & B</span></div>]]></baseVariantTplTree>
      </Component>"
    `);
  });

  it("escapes only quotes in attribute values (xml-js default)", () => {
    expect(
      jsonToXml(
        { __type: "Demo", amp: "A & B", gt: "x > y", quote: 'say "hi"' },
        true
      )
    ).toMatchInlineSnapshot(
      `"<Demo amp="A & B" gt="x > y" quote="say &quot;hi&quot;"></Demo>"`
    );
  });

  it("renders an empty array as an empty ARRAY", () => {
    expect(
      jsonToXml(
        {
          __type: "OutputResult",
          messages: ["No changes."],
          results: [],
        },
        true
      )
    ).toMatchInlineSnapshot(`
      "<OutputResult>
        <messages>
          <ARRAY>
            <ITEM>No changes.</ITEM>
          </ARRAY>
        </messages>
        <results>
          <ARRAY></ARRAY>
        </results>
      </OutputResult>"
    `);
  });

  it("renders nested arrays recursively", () => {
    expect(
      jsonToXml(
        {
          __type: "Prop",
          name: "matrix",
          default: [
            [1, 2],
            [3, 4],
          ],
        },
        true
      )
    ).toMatchInlineSnapshot(`
      "<Prop name="matrix">
        <default>
          <ARRAY>
            <ITEM>
              <ARRAY>
                <ITEM>1</ITEM>
                <ITEM>2</ITEM>
              </ARRAY>
            </ITEM>
            <ITEM>
              <ARRAY>
                <ITEM>3</ITEM>
                <ITEM>4</ITEM>
              </ARRAY>
            </ITEM>
          </ARRAY>
        </default>
      </Prop>"
    `);
  });

  it("renders null as an attribute", () => {
    expect(
      jsonToXml({ __type: "Foo", a: null, c: "x" }, true)
    ).toMatchInlineSnapshot(`"<Foo a="null" c="x"></Foo>"`);
  });

  it("renders a plain record (no __type) field as a <key> with its own attributes", () => {
    expect(
      jsonToXml(
        {
          __type: "ElementOverride",
          uuid: "abc",
          styles: { color: "red", background: "blue" },
        },
        true
      )
    ).toMatchInlineSnapshot(`
      "<ElementOverride uuid="abc">
        <styles color="red" background="blue"></styles>
      </ElementOverride>"
    `);
  });
});
