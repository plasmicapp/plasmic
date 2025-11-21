import { describe, expect, it } from "tstyche";
import type {
  AnyType,
  ArrayType,
  BooleanType,
  CustomFunctionMeta,
  DynamicType,
  FunctionControlContext,
  GraphQLType,
  MultiChoiceType,
  NumberType,
  ObjectType,
  ParamType,
  PlainBooleanType,
  PlainNumberType,
  PlainStringType,
  RequiredParam,
  SingleChoiceType,
  StringType,
} from "../registerFunction";
import type { ContextDependentConfig } from "../types/shared-controls";

// Dummy props context for the generic <P>
type Ctx = {};

describe("custom-function param type regression tests", () => {
  // Primitive param types
  it("PlainStringType keeps its discriminant", () => {
    const sample: PlainStringType<""> = { name: "mystr", type: "string" };
    expect(sample).type.toBe<PlainStringType<"">>();
  });

  it("BooleanType accepts only boolean-typed variants", () => {
    const ok: BooleanType<Ctx> = { name: "flag", type: "boolean" };
    expect<BooleanType<Ctx>>().type.toBeAssignableWith(ok);

    // wrong discriminant
    expect<BooleanType<Ctx>>().type.not.toBeAssignableWith({
      name: "bad",
      type: "number",
    });
  });

  it("NumberType accepts only number-typed variants", () => {
    const ok: NumberType<Ctx> = { name: "age", type: "number" };
    expect<NumberType<Ctx>>().type.toBeAssignableWith(ok);

    expect<NumberType<Ctx>>().type.not.toBeAssignableWith({
      name: "bad",
      type: "string",
    });
  });

  it('StringType can be literal "string" or object form', () => {
    const lit = "string" as const;
    expect<StringType<Ctx>>().type.toBeAssignableWith(lit);

    const obj: StringType<Ctx> = { name: "title", type: "string" };
    expect<StringType<Ctx>>().type.toBeAssignableWith(obj);
  });

  // Choice-based param types
  it("SingleChoiceType requires multiSelect=false|undefined and flat options", () => {
    const single: SingleChoiceType<Ctx, "red" | "blue"> = {
      name: "color",
      type: "choice",
      options: ["red", "blue"],
      // multiSelect defaults to false
    };
    expect(single).type.toBe<SingleChoiceType<Ctx, "red" | "blue">>();

    // `multiSelect: true` is not allowed for SingleChoiceType
    expect<SingleChoiceType<Ctx, "red" | "blue">>().type.not.toBeAssignableWith(
      {
        ...single,
        multiSelect: true,
      }
    );
  });

  it("MultiChoiceType requires multiSelect=true and nested options", () => {
    const multi: MultiChoiceType<Ctx, "red" | "blue"> = {
      name: "colors",
      type: "choice",
      multiSelect: true,
      options: ["red", "blue"],
    };
    expect(multi).type.toBe<MultiChoiceType<Ctx, "red" | "blue">>();

    // `multiSelect: false` (or missing) is not allowed for MultiChoiceType
    expect<MultiChoiceType<Ctx, "red" | "blue">>().type.not.toBeAssignableWith({
      ...multi,
      multiSelect: false,
    });
  });

  // Any / GraphQL / Structural param types
  it('AnyType allows the bare "any" discriminant', () => {
    const anyParam: AnyType = { name: "whatever", type: "any" };
    expect(anyParam).type.toBe<AnyType>();
  });

  it("ArrayType and ObjectType discriminants work", () => {
    const arr: ArrayType<Ctx> = { name: "items", type: "array" };
    expect<ArrayType<Ctx>>().type.toBeAssignableWith(arr);

    const obj: ObjectType<Ctx> = { name: "payload", type: "object" };
    expect<ObjectType<Ctx>>().type.toBeAssignableWith(obj);

    // Wrong discriminant
    expect<ArrayType<Ctx>>().type.not.toBeAssignableWith({
      name: "nope",
      type: "object",
    });
    expect<ObjectType<Ctx>>().type.not.toBeAssignableWith({
      name: "nope",
      type: "array",
    });
  });

  it("Arrays with nested objects work", () => {
    const arr: ArrayType<Ctx> = {
      name: "items",
      type: "array",
      itemType: {
        type: "object",
        fields: {
          a: "string",
          // TODO -- make `b: "number"` work
          b: { name: "num", type: "number" },
        },
      },
    };

    expect<ArrayType<Ctx>>().type.toBeAssignableWith(arr);
  });

  it("CustomFunctionMeta handles multiple string parameters with union types", () => {
    // Test for regression in multiple parameter handling
    function testFn(
      _host: string,
      _token: number | undefined,
      _optional?: string
    ): string {
      return "";
    }

    const meta: CustomFunctionMeta<typeof testFn> = {
      name: "testFunction",
      importPath: "./test",
      params: [
        {
          name: "host",
          type: "string",
        },
        {
          name: "token",
          type: "number",
        },
        {
          name: "optional",
          type: "string",
        },
      ],
    };

    expect(meta).type.toBe<CustomFunctionMeta<typeof testFn>>();
    expect<CustomFunctionMeta<typeof testFn>>().type.toBeAssignableWith(meta);
  });

  it("GraphQLType enforces required shape", () => {
    const gql: GraphQLType<Ctx> = {
      name: "GetUsers",
      type: "code",
      lang: "graphql",
      endpoint: "/api/graphql",
    };
    expect(gql).type.toBe<GraphQLType<Ctx>>();

    // Missing `type: "code"` should fail
    expect<GraphQLType<Ctx>>().type.not.toBeAssignableWith({
      ...gql,
      type: "graphql",
    });
  });

  it("GraphQL ContextDependentConfig receives function context as 3-tuple", () => {
    // Test that GraphQL context dependency functions for custom functions receive:
    // [Partial<FunctionParams>, Data, unknown] (3-element tuple)
    // Unlike component contexts which have typed data and ControlExtras

    type FunctionParams = [string, boolean, number?];

    // Test context structure outside of callbacks
    const testContext: FunctionControlContext<FunctionParams> = [
      ["test", true, 5],
      { someData: "value" },
      undefined,
    ];
    expect(testContext).type.toBe<FunctionControlContext<FunctionParams>>();
    expect(testContext).type.toBe<[Partial<FunctionParams>, any, unknown]>();

    const [params, _d, _e] = testContext;

    // Access partial function parameters as tuple elements
    const [host, useProd, timeout] = params;
    expect(host).type.toBe<string | undefined>();
    expect(useProd).type.toBe<boolean | undefined>();
    expect(timeout).type.toBe<number | undefined>();

    // Test both static and dynamic (callback) forms
    const gqlParamStatic: GraphQLType<FunctionParams> = {
      name: "apiEndpoint",
      type: "code",
      lang: "graphql",
      endpoint: "https://api.example.com/graphql",
      method: "POST",
    };

    const gqlParamDynamic: GraphQLType<FunctionParams> = {
      name: "apiEndpoint",
      type: "code",
      lang: "graphql",
      endpoint: (...ctx: FunctionControlContext<FunctionParams>) => {
        const [fnParams, _data, _extra] = ctx;
        const [_fnHost, fnUseProd] = fnParams;
        return fnUseProd
          ? "https://prod.api.com/graphql"
          : "https://dev.api.com/graphql";
      },
      method: "POST",
    };

    // Test that both GraphQL forms are properly structured for functions
    expect<GraphQLType<FunctionParams>>().type.toBeAssignableWith(
      gqlParamStatic
    );
    expect<GraphQLType<FunctionParams>>().type.toBeAssignableWith(
      gqlParamDynamic
    );
  });

  it("ObjectType parameters work with fetch function (regression)", () => {
    function wrappedFetch(
      _url: string,
      _method: "GET" | "POST" | "PUT" | "DELETE",
      _headers: Record<string, string>,
      _body?: string | object
    ): Promise<any> {
      return Promise.resolve({});
    }

    const fetchMeta: CustomFunctionMeta<typeof wrappedFetch> = {
      name: "fetch",
      importPath: "@plasmicpkgs/fetch",
      params: [
        {
          name: "url",
          type: "string",
        },
        {
          name: "method",
          type: "choice",
          options: ["GET", "POST", "PUT", "DELETE"],
        },
        {
          name: "headers",
          type: "object",
        },
        {
          name: "body",
          type: "object",
        },
      ],
    };

    expect(fetchMeta).type.toBe<CustomFunctionMeta<typeof wrappedFetch>>();
    expect<CustomFunctionMeta<typeof wrappedFetch>>().type.toBeAssignableWith(
      fetchMeta
    );
  });

  it("ContextDependentConfig works with FunctionControlContext in field mappings (regression)", () => {
    interface TestFieldfulProps {
      data?: any;
      fields?: any[];
    }

    // ContextDependentConfig expects FunctionControlContext as a tuple
    type MinimalValueType = ContextDependentConfig<
      FunctionControlContext<TestFieldfulProps>,
      any
    >;

    const minimalValueFunc: MinimalValueType = (_props, contextData) => {
      return contextData?.minimalFullLengthFields;
    };

    expect(minimalValueFunc).type.toBe<MinimalValueType>();
    expect<MinimalValueType>().type.toBeAssignableWith(minimalValueFunc);
  });

  it("DynamicType works for function parameters", () => {
    type ProcessArgs = [mode: string, value: any];

    const dynamicParam: DynamicType<ProcessArgs> = {
      type: "dynamic",
      name: "value",
      description: "Dynamic parameter that changes based on mode",
      control: (
        args: Partial<ProcessArgs>,
        _data: any
      ): ParamType<ProcessArgs, any> => {
        const [mode] = args;
        switch (mode) {
          case "string":
            return { type: "string", name: "value" };
          case "number":
            return { type: "number", name: "value", min: 0, max: 100 };
          case "boolean":
            return { type: "boolean", name: "value" };
          case "object":
            return { type: "object", name: "value" };
          default:
            return { type: "any", name: "value" };
        }
      },
    };

    expect<ParamType<ProcessArgs, any>>().type.toBeAssignableWith(dynamicParam);

    // Test that it can be used as RequiredParam
    const requiredDynamic: RequiredParam<ProcessArgs, any> = {
      ...dynamicParam,
      isOptional: false,
      isRestParameter: false,
    };
    expect<RequiredParam<ProcessArgs, any>>().type.toBeAssignableWith(
      requiredDynamic
    );
  });

  it("DynamicType control function receives proper FunctionControlContext", () => {
    type TransformArgs = [dataType: string, data: any, options?: object];

    const dynamicOptions: DynamicType<TransformArgs> = {
      type: "dynamic",
      name: "options",
      control: (args, contextData) => {
        // Test that args is properly typed as Partial
        expect<Partial<TransformArgs>>().type.toBeAssignableWith(args);
        const [dataType, _data, _options] = args;
        expect<string | undefined>().type.toBeAssignableWith(dataType);

        // Test that contextData is available
        expect<any>().type.toBeAssignableWith(contextData);

        // Return different option types based on dataType
        if (dataType === "json") {
          return {
            type: "object",
            name: "options",
          };
        }

        return {
          type: "choice",
          name: "options",
          options: ["default", "custom"],
        };
      },
    };

    expect<ParamType<TransformArgs, any>>().type.toBeAssignableWith(
      dynamicOptions
    );
  });

  it("DynamicType can return choice types with dynamic options", () => {
    type SelectArgs = [category: string, selection: string];

    const dynamicChoice: DynamicType<SelectArgs> = {
      type: "dynamic",
      name: "selection",
      control: (args) => {
        const [category] = args;

        const optionsByCategory: Record<string, string[]> = {
          colors: ["red", "green", "blue"],
          sizes: ["small", "medium", "large"],
          shapes: ["circle", "square", "triangle"],
        };

        return {
          type: "choice",
          name: "selection",
          options: optionsByCategory[category ?? "colors"] ?? ["none"],
          multiSelect: false,
        } satisfies SingleChoiceType<SelectArgs, string>;
      },
    };

    expect<ParamType<SelectArgs, any>>().type.toBeAssignableWith(dynamicChoice);
  });

  it("DynamicType works with CustomFunctionMeta", () => {
    function processData(mode: string, value: any): any {
      return value;
    }
    const dynamicValueParam: RequiredParam<
      Parameters<typeof processData>,
      any
    > = {
      type: "dynamic",
      name: "value",
      isOptional: false,
      control: (args) => {
        const [mode] = args;
        return mode === "array"
          ? { type: "array", name: "value" }
          : { type: "string", name: "value" };
      },
    };

    const meta: CustomFunctionMeta<typeof processData> = {
      name: "processData",
      importPath: "utils",
      params: [{ name: "mode", type: "string" }, dynamicValueParam],
    };

    expect<CustomFunctionMeta<typeof processData>>().type.toBeAssignableWith(
      meta
    );
  });
});

describe("custom-function param defaultValue support", () => {
  it("Primitive types support optional defaultValue", () => {
    const stringParam = { name: "text", type: "string" } as const;
    expect<PlainStringType<string>>().type.toBeAssignableWith(stringParam);
    expect<PlainStringType<string>>().type.toBeAssignableWith({
      ...stringParam,
      defaultValue: "Hello",
    });

    const numberParam = { name: "count", type: "number" } as const;
    expect<PlainNumberType<number>>().type.toBeAssignableWith(numberParam);
    expect<PlainNumberType<number>>().type.toBeAssignableWith({
      ...numberParam,
      defaultValue: 42,
    });

    const boolParam = { name: "enabled", type: "boolean" } as const;
    expect<PlainBooleanType<boolean>>().type.toBeAssignableWith(boolParam);
    expect<PlainBooleanType<boolean>>().type.toBeAssignableWith({
      ...boolParam,
      defaultValue: true,
    });
  });

  it("Complex types support optional defaultValue", () => {
    type TestArgs = [obj: Record<string, any>, arr: any[]];

    const objParam = { name: "options", type: "object" } as const;
    expect<ObjectType<TestArgs>>().type.toBeAssignableWith(objParam);
    expect<ObjectType<TestArgs>>().type.toBeAssignableWith({
      ...objParam,
      defaultValue: { foo: "bar" },
    });

    const arrParam = { name: "items", type: "array" } as const;
    expect<ArrayType<TestArgs>>().type.toBeAssignableWith(arrParam);
    expect<ArrayType<TestArgs>>().type.toBeAssignableWith({
      ...arrParam,
      defaultValue: [1, 2, 3],
    });
  });

  it("Choice types support optional defaultValue", () => {
    type TestArgs = [color: "red" | "blue"];

    // Without default values
    const single: SingleChoiceType<TestArgs, "red" | "blue"> = {
      name: "color",
      type: "choice",
      options: ["red", "blue"],
    };
    expect<
      SingleChoiceType<TestArgs, "red" | "blue">
    >().type.toBeAssignableWith(single);

    // With default values
    const singleWithDefault: SingleChoiceType<TestArgs, "red" | "blue"> = {
      name: "color",
      type: "choice",
      options: ["red", "blue"],
      defaultValue: "red",
    };
    expect<
      SingleChoiceType<TestArgs, "red" | "blue">
    >().type.toBeAssignableWith(singleWithDefault);

    const multi: MultiChoiceType<TestArgs, "red" | "blue"> = {
      name: "colors",
      type: "choice",
      multiSelect: true,
      options: ["red", "blue"],
      defaultValue: ["red"],
    };
    expect<MultiChoiceType<TestArgs, "red" | "blue">>().type.toBeAssignableWith(
      multi
    );
  });

  it("CustomFunctionMeta with defaultValue on params", () => {
    function greet(name: string, greeting?: string): string {
      return `${greeting ?? "Hello"}, ${name}!`;
    }

    const stringParam = { name: "name", type: "string" } as const;
    const meta: CustomFunctionMeta<typeof greet> = {
      name: "greet",
      importPath: "./greet",
      params: [
        stringParam,
        { ...stringParam, name: "greeting", defaultValue: "Hello" },
      ],
    };

    expect<CustomFunctionMeta<typeof greet>>().type.toBeAssignableWith(meta);
  });

  it("CustomFunctionMeta with mixed defaultValues", () => {
    function calculate(
      base: number,
      multiplier?: number,
      offset?: number
    ): number {
      return base * (multiplier ?? 1) + (offset ?? 0);
    }

    const numParam = { name: "base", type: "number" } as const;
    const meta: CustomFunctionMeta<typeof calculate> = {
      name: "calculate",
      importPath: "./calculate",
      params: [
        numParam,
        { ...numParam, name: "multiplier", defaultValue: 1 },
        { ...numParam, name: "offset", defaultValue: 0 },
      ],
    };

    expect<CustomFunctionMeta<typeof calculate>>().type.toBeAssignableWith(
      meta
    );
  });
});
