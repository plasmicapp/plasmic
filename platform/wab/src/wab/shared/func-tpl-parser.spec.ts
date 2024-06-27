import { tuple } from "@/wab/shared/common";
import * as ftp from "@/wab/shared/func-tpl-parser";
import * as oftp from "@/wab/gen/funcTplParser";

const check = (tpl) => expect(ftp.parse(tpl)).toEqual(oftp.parse(tpl));

describe("parse", function () {
  it("should match the old pegjs parser", function () {
    //check 'TEXT LOWER'
    check("TEXT lower-case -> TEXT");
    check("TEXT upper-case -> TEXT");
    check("TEXT capitalize -> TEXT");
    check("TEXT length -> NUM");
    check("TEXT trim -> TEXT");
    check("TEXT trim left -> TEXT");
    check("TEXT trim right -> TEXT");
    check("TEXT slice: from START:NUM through END:NUM? -> TEXT");
    check("TEXT contains TEXT -> BOOL");
    check("TEXT equals TEXT -> BOOL");
    check("TEXT is blank -> BOOL");
    check("TEXT starts with TEXT -> BOOL");
    check("TEXT ends with TEXT -> BOOL");
    check("TEXT replace: all PATTERN:TEXT with REPLACEMENT:TEXT -> TEXT");
    check("NUM as text -> TEXT");
    check("TEXTBOX text -> TEXT");
    check("CHECKBOX checked -> BOOL");
    check("COLLECTION[$ELEMENT] count -> NUM");
    check("COLLECTION[$ELEMENT] first item -> $ELEMENT");
    check("COLLECTION[$ELEMENT] first n items NUM -> COLLECTION[$ELEMENT]");
    check(
      "COLLECTION[$ELEMENT] combined with COLLECTION[$ELEMENT] -> COLLECTION[$ELEMENT]"
    );
    check("current time -> DATETIME");
    check("TEXT combine with TEXT -> TEXT");
    check("DROPDOWN has any chosen value -> BOOL");
    check("DROPDOWN currently chosen value -> TEXT");
    check("RADIOBUTTON has any chosen value in group -> BOOL");
    check("RADIOBUTTON currently chosen value in group -> TEXT");
    check("RADIOBUTTON is checked -> BOOL");
    check("DATETIMEBOX timestamp value -> DATETIME");
    check("NUMBERBOX numeric value -> NUM");
  });
  it("should handle global-nary", () =>
    expect(
      ftp.parse(
        "generate numbers: starting with START:NUM ending with END:NUM incrementing by STEP:NUM -> COLLECTION[NUM]"
      )
    ).toEqual({
      form: "global-nary",
      desc: "generate numbers",
      parts: [
        {
          fixed: "starting with",
          param: {
            name: "start",
            type: {
              name: "num",
              params: [],
            },
            opt: false,
          },
        },
        {
          fixed: "ending with",
          param: {
            name: "end",
            type: {
              name: "num",
              params: [],
            },
            opt: false,
          },
        },
        {
          fixed: "incrementing by",
          param: {
            name: "step",
            type: {
              name: "num",
              params: [],
            },
            opt: false,
          },
        },
      ],
      ret: {
        type: {
          name: "collection",
          params: [
            {
              name: "num",
              params: [],
            },
          ],
        },
      },
    }));
  return it("should handle multivariate types", () =>
    expect(ftp.parse("MAP[$KEY,$VALUE] lookup $KEY -> $VALUE")).toEqual({
      form: "binary",
      desc: "lookup",
      mainType: {
        name: "map",
        params: tuple(
          { name: "$key", params: [] },
          { name: "$value", params: [] }
        ),
      },
      secondType: {
        name: "$key",
        params: [],
      },
      ret: {
        type: {
          name: "$value",
          params: [],
        },
      },
    }));
});
