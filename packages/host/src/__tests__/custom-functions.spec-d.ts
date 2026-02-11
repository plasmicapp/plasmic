import { describe, expect, it } from "tstyche";
import { GraphQLValue } from "../registerComponent";
import type {
  AnyType,
  ArrayType,
  BooleanType,
  ChoiceType,
  CustomFunctionMeta,
  FunctionControlContext,
  GenericType,
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

const stringType: StringType<Ctx, string> = { type: "string" };
const numberType: NumberType<Ctx, number> = { type: "number" };
const booleanType: BooleanType<Ctx, boolean> = { type: "boolean" };
const stringChoiceType: ChoiceType<Ctx, "red" | "blue"> = {
  type: "choice",
  options: ["red", "blue"],
};
const numberChoiceType: ChoiceType<Ctx, 1 | 2 | 3> = {
  type: "choice",
  options: [1, 2, 3],
};
const booleanChoiceType: ChoiceType<Ctx, true | false> = {
  type: "choice",
  options: [true, false],
};
const multiChoiceType: MultiChoiceType<Ctx, "red" | "blue"> = {
  type: "choice",
  options: ["red", "blue"],
  multiSelect: true,
};
const arrayType: ArrayType<Ctx> = { type: "array" };
const objectType: ObjectType<Ctx, {}> = { type: "object" };
const arrWithNestedObjectType: ArrayType<Ctx> = {
  type: "array",
  itemType: {
    type: "object",
    fields: {
      a: "string",
      // TODO -- make `b: "number"` work
      b: { type: "number" },
    },
  },
};

const stringParam: ParamType<Ctx, string> = { name: "mystr", ...stringType };
const numberParam: ParamType<Ctx, number> = { name: "mynum", ...numberType };
const booleanParam: ParamType<Ctx, boolean> = {
  name: "mybool",
  ...booleanType,
};
const stringChoiceParam: ParamType<Ctx, "red" | "blue"> = {
  name: "mychoice",
  ...stringChoiceType,
};
const numberChoiceParam: ParamType<Ctx, 1 | 2 | 3> = {
  name: "mychoice",
  ...numberChoiceType,
};
const booleanChoiceParam: ParamType<Ctx, true | false> = {
  name: "mychoice",
  ...booleanChoiceType,
};
const arrayParam: ParamType<Ctx, any[]> = { name: "myarray", ...arrayType };
const objectParam: ParamType<Ctx, {}> = { name: "myobject", ...objectType };
const arrWithNestedObjectParam: ParamType<Ctx, any[]> = {
  name: "myarray",
  ...arrWithNestedObjectType,
};

describe("custom-function primitive type tests", () => {
  it("String type keeps its discriminant", () => {
    expect<StringType<Ctx, string>>().type.toBeAssignableWith(stringType);
    expect<StringType<Ctx, string>>().type.not.toBeAssignableWith(numberType);
    expect<StringType<Ctx, string>>().type.not.toBeAssignableWith(booleanType);

    expect<StringType<Ctx, string>>().type.toBeAssignableWith(stringChoiceType); // string choice is a string
    // TODO: This assertion should fail because multi select returns a string[]
    expect<StringType<Ctx, string>>().type.toBeAssignableWith({
      ...stringChoiceType,
      multiSelect: true,
    });
    expect<StringType<Ctx, string>>().type.not.toBeAssignableWith(
      numberChoiceType
    );
    expect<StringType<Ctx, string>>().type.not.toBeAssignableWith(
      booleanChoiceType
    );
  });

  it("Number type keeps its discriminant", () => {
    expect<NumberType<Ctx, number>>().type.toBeAssignableWith(numberType);
    expect<NumberType<Ctx, number>>().type.not.toBeAssignableWith(stringType);
    expect<NumberType<Ctx, number>>().type.not.toBeAssignableWith(booleanType);

    expect<NumberType<Ctx, number>>().type.toBeAssignableWith(numberChoiceType); // number choice is a number
    expect<NumberType<Ctx, number>>().type.not.toBeAssignableWith(
      stringChoiceType
    );
    expect<NumberType<Ctx, number>>().type.not.toBeAssignableWith(
      booleanChoiceType
    );
  });

  it("Boolean type keeps its discriminant", () => {
    expect<BooleanType<Ctx, boolean>>().type.toBeAssignableWith(booleanType);
    expect<BooleanType<Ctx, boolean>>().type.not.toBeAssignableWith(stringType);
    expect<BooleanType<Ctx, boolean>>().type.not.toBeAssignableWith(numberType);

    expect<BooleanType<Ctx, boolean>>().type.toBeAssignableWith(
      booleanChoiceType
    ); // boolean choice is a boolean
    expect<BooleanType<Ctx, boolean>>().type.not.toBeAssignableWith(
      stringChoiceType
    );
    expect<BooleanType<Ctx, boolean>>().type.not.toBeAssignableWith(
      numberChoiceType
    );
  });

  it('StringType can be literal "string" or object form', () => {
    const lit = "string" as const;
    expect<StringType<Ctx>>().type.toBeAssignableWith(lit);

    const obj: StringType<Ctx> = stringType;
    expect<StringType<Ctx>>().type.toBeAssignableWith(obj);
  });

  it("AnyType allows the bare 'any' discriminant", () => {
    const anyParam: AnyType = { type: "any" };
    expect(anyParam).type.toBe<AnyType>();

    // AnyType is a valid member of every primitive type union
    expect<StringType<Ctx>>().type.toBeAssignableWith(anyParam);
    expect<NumberType<Ctx>>().type.toBeAssignableWith(anyParam);
    expect<BooleanType<Ctx>>().type.toBeAssignableWith(anyParam);
  });

  // Choice-based param types
  it("SingleChoiceType requires multiSelect=false|undefined and flat options", () => {
    const single: SingleChoiceType<Ctx, "red" | "blue"> = {
      type: "choice",
      options: ["red", "blue"],
      // multiSelect defaults to false
    };
    expect(single).type.toBe<SingleChoiceType<Ctx, "red" | "blue">>();

    expect<SingleChoiceType<Ctx, "red" | "blue">>().type.not.toBeAssignableWith(
      {
        ...single,
        multiSelect: true,
      }
    );
  });

  it("MultiChoiceType requires multiSelect=true and nested options", () => {
    expect(multiChoiceType).type.toBe<MultiChoiceType<Ctx, "red" | "blue">>();

    expect<MultiChoiceType<Ctx, "red" | "blue">>().type.not.toBeAssignableWith({
      ...multiChoiceType,
      multiSelect: false,
    });
  });
});

describe("custom-function param type regression tests", () => {
  it("String param keeps its discriminant", () => {
    expect<ParamType<Ctx, string>>().type.toBeAssignableWith(stringParam);
    expect<ParamType<Ctx, string>>().type.not.toBeAssignableWith(numberParam);
    expect<ParamType<Ctx, string>>().type.not.toBeAssignableWith(booleanParam);

    expect<ParamType<Ctx, string>>().type.not.toBeAssignableWith(stringType);
    expect<ParamType<Ctx, string>>().type.not.toBeAssignableWith(
      stringChoiceType
    );

    expect<ParamType<Ctx, string>>().type.toBeAssignableWith(stringChoiceParam); // string choice is a string
    // TODO: This assertion should fail because multi select returns a string[]
    expect<ParamType<Ctx, string>>().type.toBeAssignableWith({
      ...stringChoiceParam,
      multiSelect: true,
    });
    expect<ParamType<Ctx, string>>().type.not.toBeAssignableWith(
      numberChoiceParam
    );
    expect<ParamType<Ctx, string>>().type.not.toBeAssignableWith(
      booleanChoiceParam
    );
  });

  it("Boolean param keeps its discriminant", () => {
    expect<ParamType<Ctx, boolean>>().type.toBeAssignableWith(booleanParam);
    expect<ParamType<Ctx, boolean>>().type.not.toBeAssignableWith(numberParam);
    expect<ParamType<Ctx, boolean>>().type.not.toBeAssignableWith(stringParam);

    expect<ParamType<Ctx, boolean>>().type.not.toBeAssignableWith(booleanType);
    expect<ParamType<Ctx, boolean>>().type.not.toBeAssignableWith(
      booleanChoiceType
    );

    expect<ParamType<Ctx, boolean>>().type.toBeAssignableWith(
      booleanChoiceParam
    ); // boolean choice is a boolean
    // TODO: This assertion should fail because multi select returns a boolean[]
    expect<ParamType<Ctx, boolean>>().type.toBeAssignableWith({
      ...booleanChoiceParam,
      multiSelect: true,
    });
    expect<ParamType<Ctx, boolean>>().type.not.toBeAssignableWith(
      numberChoiceParam
    );
    expect<ParamType<Ctx, boolean>>().type.not.toBeAssignableWith(
      stringChoiceParam
    );
  });

  it("Number param keeps its discriminant", () => {
    expect<ParamType<Ctx, number>>().type.toBeAssignableWith(numberParam);
    expect<ParamType<Ctx, number>>().type.not.toBeAssignableWith(booleanParam);
    expect<ParamType<Ctx, number>>().type.not.toBeAssignableWith(stringParam);

    expect<ParamType<Ctx, number>>().type.not.toBeAssignableWith(numberType);
    expect<ParamType<Ctx, number>>().type.not.toBeAssignableWith(
      numberChoiceType
    );

    expect<ParamType<Ctx, number>>().type.toBeAssignableWith(numberChoiceParam); // number choice is a number
    // TODO: This assertion should fail because multi select returns a number[]
    expect<ParamType<Ctx, number>>().type.toBeAssignableWith({
      ...numberChoiceParam,
      multiSelect: true,
    });
    expect<ParamType<Ctx, number>>().type.not.toBeAssignableWith(
      booleanChoiceParam
    );
    expect<ParamType<Ctx, number>>().type.not.toBeAssignableWith(
      stringChoiceParam
    );
  });

  it("Array Param Type and Object Param Type discriminants work", () => {
    expect<ParamType<Ctx, any[]>>().type.toBeAssignableWith(arrayParam);

    expect<ParamType<Ctx, {}>>().type.toBeAssignableWith(objectParam);

    // Wrong discriminant
    expect<ParamType<Ctx, any[]>>().type.not.toBeAssignableWith(objectParam);
    expect<ParamType<Ctx, {}>>().type.not.toBeAssignableWith(arrayParam);
  });

  it("Array Param Type with nested objects work", () => {
    expect<ParamType<Ctx, any[]>>().type.toBeAssignableWith(
      arrWithNestedObjectParam
    );
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

  it("GraphQL ParamType enforces required shape", () => {
    const gql = {
      name: "GetUsers",
      type: "code",
      lang: "graphql",
      endpoint: "/api/graphql",
    } as const;

    const notGql = {
      ...gql,
      // Missing `type: "code"` should fail
      type: "graphql",
    } as const;

    expect<ParamType<Ctx, GraphQLValue>>().type.toBeAssignableWith(gql);

    expect<ParamType<Ctx, GraphQLValue>>().type.not.toBeAssignableWith(notGql);
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
    const gqlParamStatic: ParamType<FunctionParams, GraphQLValue> = {
      name: "apiEndpoint",
      type: "code",
      lang: "graphql",
      endpoint: "https://api.example.com/graphql",
      method: "POST",
    };

    const gqlParamDynamic: ParamType<FunctionParams, GraphQLValue> = {
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
    expect<ParamType<FunctionParams, GraphQLValue>>().type.toBeAssignableWith(
      gqlParamStatic
    );
    expect<ParamType<FunctionParams, GraphQLValue>>().type.toBeAssignableWith(
      gqlParamDynamic
    );
  });

  it("ObjectType parameters work with fetch function (regression)", () => {
    function wrappedFetch({
      _url,
      _method,
      _headers,
      _body,
    }: {
      _url: string;
      _method: "GET" | "POST" | "PUT" | "DELETE";
      _headers: Record<string, string>;
      _body?: string | object;
    }): Promise<any> {
      return Promise.resolve({});
    }

    const fetchMeta: CustomFunctionMeta<typeof wrappedFetch> = {
      name: "fetch",
      importPath: "@plasmicpkgs/fetch",
      params: [
        {
          name: "opts",
          type: "object",
          fields: {
            _url: { type: "string" },
            _method: {
              type: "choice",
              options: ["GET", "POST", "PUT", "DELETE"],
            },
            _headers: { type: "object" },
            _body: { type: "object" },
          },
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

    const dynamicParam: ParamType<ProcessArgs, any> = {
      type: "dynamic",
      name: "value",
      description: "Dynamic parameter that changes based on mode",
      control: (
        args: Partial<ProcessArgs>,
        _data: any
      ): GenericType<ProcessArgs, any> => {
        const [mode] = args;
        switch (mode) {
          case "string":
            return { type: "string" };
          case "number":
            return { type: "number", min: 0, max: 100 };
          case "boolean":
            return { type: "boolean" };
          case "object":
            return { type: "object" };
          default:
            return { type: "any" };
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

    const dynamicOptions: ParamType<TransformArgs, any> = {
      type: "dynamic",
      name: "options",
      control: (args, _contextData) => {
        // Test that args is properly typed as Partial
        expect<Partial<TransformArgs>>().type.toBeAssignableWith(args);
        const [dataType, _data, _options] = args;
        expect<string | undefined>().type.toBeAssignableWith(dataType);

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

    const dynamicChoice: ParamType<SelectArgs, any> = {
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
        return mode === "array" ? { type: "array" } : { type: "string" };
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
    const stringParamWithDefaultValue = {
      ...stringParam,
      defaultValue: "Hello",
    } as const;
    expect<PlainStringType<string>>().type.toBeAssignableWith(
      stringParamWithDefaultValue
    );

    const numberParamWithDefaultValue = {
      ...numberParam,
      defaultValue: 42,
    } as const;
    expect<PlainNumberType<number>>().type.toBeAssignableWith(
      numberParamWithDefaultValue
    );

    const boolParamWithDefaultValue = {
      ...booleanParam,
      defaultValue: true,
    } as const;
    expect<PlainBooleanType<boolean>>().type.toBeAssignableWith(
      boolParamWithDefaultValue
    );
  });

  it("Primitive types reject wrong defaultValue types", () => {
    expect<PlainStringType<string>>().type.not.toBeAssignableWith({
      ...stringType,
      defaultValue: 42,
    });
    expect<PlainStringType<string>>().type.not.toBeAssignableWith({
      ...stringType,
      defaultValue: true,
    });

    expect<PlainNumberType<number>>().type.not.toBeAssignableWith({
      ...numberType,
      defaultValue: "wrong",
    });
    expect<PlainNumberType<number>>().type.not.toBeAssignableWith({
      ...numberType,
      defaultValue: true,
    });

    expect<PlainBooleanType<boolean>>().type.not.toBeAssignableWith({
      ...booleanType,
      defaultValue: "wrong",
    });
    expect<PlainBooleanType<boolean>>().type.not.toBeAssignableWith({
      ...booleanType,
      defaultValue: 42,
    });
  });

  it("Choice types support optional defaultValue", () => {
    type TestArgs = [color: "red" | "blue"];

    const singleWithDefault: ParamType<TestArgs, "red" | "blue"> = {
      name: "color",
      type: "choice",
      options: ["red", "blue"],
      defaultValue: "red",
    };
    expect<ParamType<TestArgs, "red" | "blue">>().type.toBeAssignableWith(
      singleWithDefault
    );

    const multiWithDefault: ParamType<TestArgs, "red" | "blue"> = {
      name: "colors",
      type: "choice",
      multiSelect: true,
      options: ["red", "blue"],
      defaultValue: ["red"],
    };
    expect<ParamType<TestArgs, "red" | "blue">>().type.toBeAssignableWith(
      multiWithDefault
    );
  });

  it("CustomFunctionMeta with defaultValue on params", () => {
    function greet(name: string, greeting?: string): string {
      return `${greeting ?? "Hello"}, ${name}!`;
    }

    const meta: CustomFunctionMeta<typeof greet> = {
      name: "greet",
      importPath: "./greet",
      params: [stringParam, { ...stringParam, defaultValue: "Hello" }],
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

    const meta: CustomFunctionMeta<typeof calculate> = {
      name: "calculate",
      importPath: "./calculate",
      params: [
        { ...numberType, name: "base" },
        { ...numberType, name: "multiplier", defaultValue: 1 },
        { ...numberType, name: "offset", defaultValue: 0 },
      ],
    };

    expect<CustomFunctionMeta<typeof calculate>>().type.toBeAssignableWith(
      meta
    );
  });
});
