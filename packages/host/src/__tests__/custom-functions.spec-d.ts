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
  PartialParams,
  PlainBooleanType,
  PlainNumberType,
  PlainStringType,
  RequiredParam,
  SingleChoiceType,
  StringType,
} from "../registerFunction";
import type { ContextDependentConfig } from "../types/shared-controls";

type NoParams = [];

const stringType: StringType<NoParams> = { type: "string" };
const numberType: NumberType<NoParams> = { type: "number" };
const booleanType: BooleanType<NoParams> = { type: "boolean" };
const stringChoiceType: ChoiceType<NoParams, "red" | "blue"> = {
  type: "choice",
  options: ["red", "blue"],
};
const numberChoiceType: ChoiceType<NoParams, 1 | 2 | 3> = {
  type: "choice",
  options: [1, 2, 3],
};
const booleanChoiceType: ChoiceType<NoParams, true | false> = {
  type: "choice",
  options: [true, false],
};
const multiChoiceType: MultiChoiceType<NoParams, "red" | "blue"> = {
  type: "choice",
  options: ["red", "blue"],
  multiSelect: true,
};
const arrayType: ArrayType<NoParams> = { type: "array" };
const objectType: ObjectType<NoParams> = { type: "object" };
const arrWithNestedObjectType: ArrayType<NoParams> = {
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

const stringParam: ParamType<NoParams, string> = {
  name: "mystr",
  ...stringType,
};
const numberParam: ParamType<NoParams, number> = {
  name: "mynum",
  ...numberType,
};
const booleanParam: ParamType<NoParams, boolean> = {
  name: "mybool",
  ...booleanType,
};
const stringChoiceParam: ParamType<NoParams, "red" | "blue"> = {
  name: "mychoice",
  ...stringChoiceType,
};
const numberChoiceParam: ParamType<NoParams, 1 | 2 | 3> = {
  name: "mychoice",
  ...numberChoiceType,
};
const booleanChoiceParam: ParamType<NoParams, true | false> = {
  name: "mychoice",
  ...booleanChoiceType,
};
const arrayParam: ParamType<NoParams, any[]> = {
  name: "myarray",
  ...arrayType,
};
const objectParam: ParamType<NoParams, {}> = {
  name: "myobject",
  ...objectType,
};
const arrWithNestedObjectParam: ParamType<NoParams, any[]> = {
  name: "myarray",
  ...arrWithNestedObjectType,
};

describe("custom-function primitive type tests", () => {
  it("String type keeps its discriminant", () => {
    expect<StringType<NoParams, string>>().type.toBeAssignableWith(stringType);
    expect<StringType<NoParams, string>>().type.not.toBeAssignableWith(
      numberType
    );
    expect<StringType<NoParams, string>>().type.not.toBeAssignableWith(
      booleanType
    );

    expect<StringType<NoParams, string>>().type.toBeAssignableWith(
      stringChoiceType
    ); // string choice is a string
    // TODO: This assertion should fail because multi select returns a string[]
    expect<StringType<NoParams, string>>().type.toBeAssignableWith({
      ...stringChoiceType,
      multiSelect: true,
    });
    expect<StringType<NoParams, string>>().type.not.toBeAssignableWith(
      numberChoiceType
    );
    expect<StringType<NoParams, string>>().type.not.toBeAssignableWith(
      booleanChoiceType
    );
  });

  it("Number type keeps its discriminant", () => {
    expect<NumberType<NoParams, number>>().type.toBeAssignableWith(numberType);
    expect<NumberType<NoParams, number>>().type.not.toBeAssignableWith(
      stringType
    );
    expect<NumberType<NoParams, number>>().type.not.toBeAssignableWith(
      booleanType
    );

    expect<NumberType<NoParams, number>>().type.toBeAssignableWith(
      numberChoiceType
    ); // number choice is a number
    expect<NumberType<NoParams, number>>().type.not.toBeAssignableWith(
      stringChoiceType
    );
    expect<NumberType<NoParams, number>>().type.not.toBeAssignableWith(
      booleanChoiceType
    );
  });

  it("Boolean type keeps its discriminant", () => {
    expect<BooleanType<NoParams, boolean>>().type.toBeAssignableWith(
      booleanType
    );
    expect<BooleanType<NoParams, boolean>>().type.not.toBeAssignableWith(
      stringType
    );
    expect<BooleanType<NoParams, boolean>>().type.not.toBeAssignableWith(
      numberType
    );

    expect<BooleanType<NoParams, boolean>>().type.toBeAssignableWith(
      booleanChoiceType
    ); // boolean choice is a boolean
    expect<BooleanType<NoParams, boolean>>().type.not.toBeAssignableWith(
      stringChoiceType
    );
    expect<BooleanType<NoParams, boolean>>().type.not.toBeAssignableWith(
      numberChoiceType
    );
  });

  it('StringType can be literal "string" or object form', () => {
    const lit = "string" as const;
    expect<StringType<NoParams>>().type.toBeAssignableWith(lit);

    const obj: StringType<NoParams> = stringType;
    expect<StringType<NoParams>>().type.toBeAssignableWith(obj);
  });

  it("AnyType allows the bare 'any' discriminant", () => {
    const anyParam: AnyType<NoParams> = { type: "any" };
    expect(anyParam).type.toBe<AnyType<NoParams>>();

    // AnyType is a valid member of every primitive type union
    expect<StringType<NoParams>>().type.toBeAssignableWith(anyParam);
    expect<NumberType<NoParams>>().type.toBeAssignableWith(anyParam);
    expect<BooleanType<NoParams>>().type.toBeAssignableWith(anyParam);
  });

  // Choice-based param types
  it("SingleChoiceType requires multiSelect=false|undefined and flat options", () => {
    const single: SingleChoiceType<NoParams, "red" | "blue"> = {
      type: "choice",
      options: ["red", "blue"],
      // multiSelect defaults to false
    };
    expect(single).type.toBe<SingleChoiceType<NoParams, "red" | "blue">>();

    expect<
      SingleChoiceType<NoParams, "red" | "blue">
    >().type.not.toBeAssignableWith({
      ...single,
      multiSelect: true,
    });
  });

  it("MultiChoiceType requires multiSelect=true and nested options", () => {
    expect(multiChoiceType).type.toBe<
      MultiChoiceType<NoParams, "red" | "blue">
    >();

    expect<
      MultiChoiceType<NoParams, "red" | "blue">
    >().type.not.toBeAssignableWith({
      ...multiChoiceType,
      multiSelect: false,
    });
  });
});

describe("custom-function param type regression tests", () => {
  it("String param keeps its discriminant", () => {
    expect<ParamType<NoParams, string>>().type.toBeAssignableWith(stringParam);
    expect<ParamType<NoParams, string>>().type.not.toBeAssignableWith(
      numberParam
    );
    expect<ParamType<NoParams, string>>().type.not.toBeAssignableWith(
      booleanParam
    );

    expect<ParamType<NoParams, string>>().type.not.toBeAssignableWith(
      stringType
    );
    expect<ParamType<NoParams, string>>().type.not.toBeAssignableWith(
      stringChoiceType
    );

    expect<ParamType<NoParams, string>>().type.toBeAssignableWith(
      stringChoiceParam
    ); // string choice is a string
    // TODO: This assertion should fail because multi select returns a string[]
    expect<ParamType<NoParams, string>>().type.toBeAssignableWith({
      ...stringChoiceParam,
      multiSelect: true,
    });
    expect<ParamType<NoParams, string>>().type.not.toBeAssignableWith(
      numberChoiceParam
    );
    expect<ParamType<NoParams, string>>().type.not.toBeAssignableWith(
      booleanChoiceParam
    );
  });

  it("Boolean param keeps its discriminant", () => {
    expect<ParamType<NoParams, boolean>>().type.toBeAssignableWith(
      booleanParam
    );
    expect<ParamType<NoParams, boolean>>().type.not.toBeAssignableWith(
      numberParam
    );
    expect<ParamType<NoParams, boolean>>().type.not.toBeAssignableWith(
      stringParam
    );

    expect<ParamType<NoParams, boolean>>().type.not.toBeAssignableWith(
      booleanType
    );
    expect<ParamType<NoParams, boolean>>().type.not.toBeAssignableWith(
      booleanChoiceType
    );

    expect<ParamType<NoParams, boolean>>().type.toBeAssignableWith(
      booleanChoiceParam
    ); // boolean choice is a boolean
    // TODO: This assertion should fail because multi select returns a boolean[]
    expect<ParamType<NoParams, boolean>>().type.toBeAssignableWith({
      ...booleanChoiceParam,
      multiSelect: true,
    });
    expect<ParamType<NoParams, boolean>>().type.not.toBeAssignableWith(
      numberChoiceParam
    );
    expect<ParamType<NoParams, boolean>>().type.not.toBeAssignableWith(
      stringChoiceParam
    );
  });

  it("Number param keeps its discriminant", () => {
    expect<ParamType<NoParams, number>>().type.toBeAssignableWith(numberParam);
    expect<ParamType<NoParams, number>>().type.not.toBeAssignableWith(
      booleanParam
    );
    expect<ParamType<NoParams, number>>().type.not.toBeAssignableWith(
      stringParam
    );

    expect<ParamType<NoParams, number>>().type.not.toBeAssignableWith(
      numberType
    );
    expect<ParamType<NoParams, number>>().type.not.toBeAssignableWith(
      numberChoiceType
    );

    expect<ParamType<NoParams, number>>().type.toBeAssignableWith(
      numberChoiceParam
    ); // number choice is a number
    // TODO: This assertion should fail because multi select returns a number[]
    expect<ParamType<NoParams, number>>().type.toBeAssignableWith({
      ...numberChoiceParam,
      multiSelect: true,
    });
    expect<ParamType<NoParams, number>>().type.not.toBeAssignableWith(
      booleanChoiceParam
    );
    expect<ParamType<NoParams, number>>().type.not.toBeAssignableWith(
      stringChoiceParam
    );
  });

  it("Array Param Type and Object Param Type discriminants work", () => {
    expect<ParamType<NoParams, any[]>>().type.toBeAssignableWith(arrayParam);

    expect<ParamType<NoParams, {}>>().type.toBeAssignableWith(objectParam);

    // Wrong discriminant
    expect<ParamType<NoParams, any[]>>().type.not.toBeAssignableWith(
      objectParam
    );
    expect<ParamType<NoParams, {}>>().type.not.toBeAssignableWith(arrayParam);
  });

  it("Array Param Type with nested objects work", () => {
    expect<ParamType<NoParams, any[]>>().type.toBeAssignableWith(
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

    expect<ParamType<NoParams, GraphQLValue>>().type.toBeAssignableWith(gql);

    expect<ParamType<NoParams, GraphQLValue>>().type.not.toBeAssignableWith(
      notGql
    );
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
    expect(testContext).type.toBe<
      [PartialParams<FunctionParams>, any, unknown]
    >();

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
    type TestFieldfulProps = [data?: any, fields?: any[]];

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
    expect<PlainStringType<NoParams>>().type.toBeAssignableWith(
      stringParamWithDefaultValue
    );

    const numberParamWithDefaultValue = {
      ...numberParam,
      defaultValue: 42,
    } as const;
    expect<PlainNumberType<NoParams>>().type.toBeAssignableWith(
      numberParamWithDefaultValue
    );

    const boolParamWithDefaultValue = {
      ...booleanParam,
      defaultValue: true,
    } as const;
    expect<PlainBooleanType<NoParams>>().type.toBeAssignableWith(
      boolParamWithDefaultValue
    );
  });

  it("Primitive types reject wrong defaultValue types", () => {
    expect<PlainStringType<NoParams>>().type.not.toBeAssignableWith({
      ...stringType,
      defaultValue: 42,
    });
    expect<PlainStringType<NoParams>>().type.not.toBeAssignableWith({
      ...stringType,
      defaultValue: true,
    });

    expect<PlainNumberType<NoParams>>().type.not.toBeAssignableWith({
      ...numberType,
      defaultValue: "wrong",
    });
    expect<PlainNumberType<NoParams>>().type.not.toBeAssignableWith({
      ...numberType,
      defaultValue: true,
    });

    expect<PlainBooleanType<NoParams>>().type.not.toBeAssignableWith({
      ...booleanType,
      defaultValue: "wrong",
    });
    expect<PlainBooleanType<NoParams>>().type.not.toBeAssignableWith({
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
      params: [
        { name: "name", type: "string" },
        { name: "greeting", type: "string", defaultValue: "Hello" },
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

    const meta: CustomFunctionMeta<typeof calculate> = {
      name: "calculate",
      importPath: "./calculate",
      params: [
        { name: "base", type: "number" },
        { name: "multiplier", type: "number", defaultValue: 1 },
        { name: "offset", type: "number", defaultValue: 0 },
      ],
    };

    expect<CustomFunctionMeta<typeof calculate>>().type.toBeAssignableWith(
      meta
    );
  });
});

describe("hidden callback receives function params", () => {
  type FirstParam = string;
  type SecondParam = { bool: boolean };
  type Params = [FirstParam, SecondParam];

  it("FirstArg hidden receives function params", () => {
    const field: StringType<Params, FirstParam> = {
      type: "string",
      hidden: (args) => {
        expect(args).type.toBe<
          [FirstParam | undefined, SecondParam | undefined]
        >();
        return (args[0] ?? "").includes("foo") && args[1]?.bool === true;
      },
    };
    expect<GenericType<Params, FirstParam>>().type.toBeAssignableWith(field);
  });

  it("SecondArg hidden receives function params", () => {
    const field: ObjectType<Params, SecondParam> = {
      type: "object",
      hidden: (args) => {
        expect(args).type.toBe<
          [FirstParam | undefined, SecondParam | undefined]
        >();
        return (args[0] ?? "").includes("foo") && args[1]?.bool === true;
      },
    };
    expect<GenericType<Params, SecondParam>>().type.toBeAssignableWith(field);
  });
});
