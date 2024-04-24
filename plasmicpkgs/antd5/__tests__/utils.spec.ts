import { get, pick, set } from "../src/utils";

describe("pick", () => {
  it("should pick properties", () => {
    const obj: any = {
      foo: "bar",
      bar: {
        baz: {
          beep: "boop",
        },
      },
      guests: [
        {
          firstName: "Jane",
          lastName: "Doe",
        },
        {
          firstName: "John",
          lastName: "Smith",
        },
      ],
    };
    expect(pick(obj, ["foo"])).toEqual({ foo: "bar" });
    expect(pick(obj, ["bar"])).toEqual({ bar: { baz: { beep: "boop" } } });
    expect(pick(obj, ["foo"], ["bar"])).toEqual({
      foo: "bar",
      bar: { baz: { beep: "boop" } },
    });
    expect(pick(obj, ["guests", 0, "firstName"])).toEqual({
      guests: [
        {
          firstName: "Jane",
        },
      ],
    });
    expect(pick(obj, ["guests", 1, "lastName"])).toEqual({
      guests: [
        undefined,
        {
          lastName: "Smith",
        },
      ],
    });
    expect(
      pick(
        obj,
        ["guests", 0, "firstName"],
        ["guests", 0, "lastName"],
        ["guests", 1, "lastName"]
      )
    ).toEqual({
      guests: [
        {
          firstName: "Jane",
          lastName: "Doe",
        },
        {
          lastName: "Smith",
        },
      ],
    });
  });
});

describe("deep gets", () => {
  it("should get deep properties", () => {
    const obj = {
      foo: "bar",
      bar: {
        baz: {
          beep: "boop",
        },
      },
    };

    expect(get(obj, "foo")).toBe("bar");
    expect(get(obj, "bar.baz.beep")).toBe("boop");
    expect(get(obj, "bar.baz.beep.yep.nope")).toBeUndefined();
  });
});

describe("deep gets with array of paths", () => {
  it("should get deep properties with array of paths", () => {
    const obj = {
      foo: "bar",
      bar: {
        baz: {
          beep: "boop",
        },
        "baz.beep": "blop",
      },
    };

    expect(get(obj, ["bar", "baz", "beep"])).toBe("boop");
    expect(get(obj, ["bar", "baz", "beep", "yep", "nope"])).toBeUndefined();
    expect(get(obj, ["bar", "baz.beep"])).toBe("blop");
  });
});

describe("deep sets", () => {
  it("should deep set properties", () => {
    const obj: any = {
      foo: "bar",
      bar: {
        baz: {
          beep: "boop",
        },
      },
    };

    expect(set(obj, "foo", "yep")).toEqual("yep");
    expect(obj.foo).toEqual("yep");
    expect(set(obj, "bar.baz.beep", "nok")).toEqual("nok");
    expect(obj.bar.baz.beep).toEqual("nok");

    expect(set(obj, "yep.nope", "p")).toEqual("p");
    expect(obj.yep.nope).toEqual("p");
  });
});

describe("deep sets with array of paths", () => {
  it("should deep set properties with array of paths", () => {
    const obj: any = {
      foo: "bar",
      bar: {
        baz: {
          beep: "boop",
        },
      },
      guests: [
        {
          firstName: "Jane",
          lastName: "Doe",
        },
        {
          firstName: "John",
          lastName: "Smith",
        },
      ],
    };

    expect(set(obj, ["foo"], "yep")).toEqual("yep");
    expect(obj.foo).toEqual("yep");

    expect(set(obj, ["bar", "baz", "beep"], "nok")).toEqual("nok");
    expect(obj.bar.baz.beep).toEqual("nok");

    expect(set(obj, ["yep", "nope"], "p")).toEqual("p");
    expect(obj.yep.nope).toEqual("p");

    expect(set(obj, ["bar", "baz.beep"], "nooope")).toEqual("nooope");
    expect(obj.bar["baz.beep"]).toEqual("nooope");
    expect(obj.bar.baz.beep).toEqual("nok"); // original value is not modified

    expect(set(obj, ["guests", 0, "firstName"], "Sarah")).toEqual("Sarah");
    expect(obj.guests[0].firstName).toEqual("Sarah");
    expect(obj.guests[0].lastName).toEqual("Doe"); // original value is not modified

    expect(set(obj, ["users", 0, "email"], "sarah@plasmic.app")).toEqual(
      "sarah@plasmic.app"
    ); // new object key is created
    expect(obj.users[0].email).toEqual("sarah@plasmic.app");
    expect(obj.users).toStrictEqual([{ email: "sarah@plasmic.app" }]); // ensure that users is an array, not an object with number keys
  });
});

describe("deep deletes", () => {
  it("should delete deep properties", () => {
    const obj = {
      foo: "bar",
      bar: {
        baz: {
          beep: "boop",
        },
      },
    };

    expect(set(obj, "foo", undefined)).toEqual(undefined);
    expect(obj.foo).toEqual(undefined);
    expect(set(obj, "bar.baz", undefined)).toEqual(undefined);
    expect(obj.bar.baz).toEqual(undefined);
  });
});
