import { describe, expect, test } from "tstyche";
import type {
  ArgType,
  ArrayType,
  CanvasComponentProps,
  ChoiceOptions,
  ChoiceType,
  ChoiceValue,
  ComponentControlContext,
  CustomChoiceType,
  CustomControl,
  CustomType,
  DataPickerType,
  DataSourceType,
  DateRangeStringsType,
  DateStringType,
  DynamicType,
  EventHandlerType,
  ExprEditorType,
  FormValidationRulesType,
  GraphQLType,
  ImageUrlType,
  InferDataType,
  JSONLikeType,
  MultiChoiceType,
  NumberType,
  ObjectType,
  PlainStringType,
  PropType,
  RestrictPropType,
  RichDataPickerType,
  RichExprEditorType,
  RichSlotType,
  SingleChoiceType,
  SlotType,
  StringCompatType,
  StringType,
} from "../prop-types";
import type { ControlExtras } from "../types/shared-controls";

describe("prop-types type regression tests", () => {
  test("PlainStringType keeps its discriminant", () => {
    const sample: PlainStringType<{}> = { type: "string" };
    expect(sample).type.toBe<PlainStringType<{}>>();
  });

  test("StringType literal and rich variants", () => {
    type P = {};

    expect<StringType<P>>().type.toBeAssignableWith("string");
    expect<StringType<P>>().type.toBeAssignableWith("href");
    expect<StringType<P>>().type.toBeAssignableWith({
      type: "string",
    } as const);

    // should NOT accept numbers
    expect<StringType<P>>().type.not.toBeAssignableWith(42);
  });

  test("NumberType literal and slider variants", () => {
    type P = {};

    expect<NumberType<P>>().type.toBeAssignableWith("number");
    expect<NumberType<P>>().type.toBeAssignableWith({
      type: "number",
      control: "slider",
      step: 0.1,
    } as const);
    expect<NumberType<P>>().type.not.toBeAssignableWith("string");
  });

  test("JSONLikeType accepts plain literal, ObjectType and ArrayType", () => {
    type P = {};

    const obj: ObjectType<P> = { type: "object", fields: {} };
    const arr: ArrayType<P> = { type: "array" };
    expect<JSONLikeType<P>>().type.toBeAssignableWith("object");
    expect<JSONLikeType<P>>().type.toBeAssignableWith(obj);
    expect<JSONLikeType<P>>().type.toBeAssignableWith(arr);
  });

  test("DataSourceType requires datasource", () => {
    type P = {};
    expect<DataSourceType<P>>().type.toBeAssignableWith({
      type: "dataSource",
      dataSource: "airtable",
    } as const);

    expect<DataSourceType<P>>().type.toBeAssignableWith({
      type: "dataSource",
      dataSource: "cms",
    } as const);
    expect<DataSourceType<P>>().type.not.toBeAssignableWith({
      type: "dataSource",
    });
  });

  test("DataPickerType – literal vs rich", () => {
    type P = {};

    expect<DataPickerType<P>>().type.toBeAssignableWith("dataPicker");

    const rich: RichDataPickerType<P> = {
      type: "dataSelector",
      data: { foo: 1 },
      defaultValue: "foo",
    };
    expect<DataPickerType<P>>().type.toBeAssignableWith(rich);
  });

  test("ExprEditorType – literal vs rich", () => {
    type P = {};

    expect<ExprEditorType<P>>().type.toBeAssignableWith("exprEditor");

    const rich: RichExprEditorType<P> = {
      type: "exprEditor",
      data: (_p: P) => ({ now: Date.now() }),
      defaultValue: ["abc"],
    };
    expect<ExprEditorType<P>>().type.toBeAssignableWith(rich);
  });

  test("FormValidationRulesType basic shape", () => {
    type P = {};

    expect<FormValidationRulesType<P>>().type.toBeAssignableWith({
      type: "formValidationRules",
    } as const);
  });

  test("EventHandlerType with argTypes", () => {
    type P = {};

    const handler: EventHandlerType<P> = {
      type: "eventHandler",
      argTypes: [
        {
          name: "event",
          type: { type: "string" } as ArgType<any>,
        },
      ],
    };
    expect<EventHandlerType<P>>().type.toBeAssignableWith(handler);
  });

  test("CustomType – control component and rich object", () => {
    type P = {};

    const Dummy: CustomControl<P> = (_props) => null;
    expect<CustomType<P>>().type.toBeAssignableWith(Dummy);

    expect<CustomType<P>>().type.toBeAssignableWith({
      type: "custom",
      control: Dummy,
      defaultValue: 123,
    } as const);
  });

  test("ImageUrlType literal and rich", () => {
    type P = {};

    expect<ImageUrlType<P>>().type.toBeAssignableWith("imageUrl");
    expect<ImageUrlType<P>>().type.toBeAssignableWith({
      type: "imageUrl",
    } as const);
  });

  test("SlotType literal and rich", () => {
    type P = {};

    expect<SlotType<P>>().type.toBeAssignableWith("slot");

    const rich: RichSlotType<P> = {
      type: "slot",
      allowedComponents: ["Card"],
      displayName: "Body",
    };
    expect<SlotType<P>>().type.toBeAssignableWith(rich);
  });

  test("DateStringType and DateRangeStringsType", () => {
    type P = {};

    expect<DateStringType<P>>().type.toBeAssignableWith({
      type: "dateString",
    } as const);
    expect<DateRangeStringsType<P>>().type.toBeAssignableWith({
      type: "dateRangeStrings",
      defaultValue: ["2025-01-01", "2025-01-31"] as [string, string],
    } as const);
  });

  test("ChoiceType accepts single and multi-select variants", () => {
    type P = {};

    expect<ChoiceType<P>>().type.toBeAssignableWith({
      type: "choice" as const,
      options: ["a", "b"],
      multiSelect: false as const,
    });

    expect<ChoiceType<P>>().type.toBeAssignableWith({
      type: "choice" as const,
      options: ["a", "b"],
      multiSelect: true as const,
    });
  });

  test("ChoiceType exhaustive typing (Single / Multi / Custom)", () => {
    type P1 = { showHidden?: boolean };
    const single = {
      type: "choice" as const,
      options: ["a", 42, true] as ChoiceValue[],
      multiSelect: false as const,
      defaultValue: 42 as ChoiceValue,
    };
    expect<SingleChoiceType<P1>>().type.toBeAssignableWith(single);
    expect<ChoiceValue>().type.toBeAssignableWith(single.defaultValue);

    type P2 = {};
    const multi = {
      type: "choice" as const,
      options: [
        { label: "One", value: 1 },
        { label: "Two", value: 2 },
      ] as { label: string; value: number }[],
      multiSelect: true as const,
      defaultValue: [1] as number[],
    };
    expect<MultiChoiceType<P2>>().type.toBeAssignableWith(multi);
    expect<number[]>().type.toBeAssignableWith(multi.defaultValue);

    type P3 = { useMulti: boolean };
    const custom = {
      type: "choice" as const,
      options: (_p: P3) => ["x", "y"],
      multiSelect: (p: P3) => p.useMulti,
    };
    expect<CustomChoiceType<P3>>().type.toBeAssignableWith(custom);

    type ValueWhen<T extends boolean> = T extends true
      ? ChoiceValue[]
      : T extends false
      ? ChoiceValue
      : never;
    type Expected = ChoiceValue | ChoiceValue[];
    type Actual = ValueWhen<ReturnType<(typeof custom)["multiSelect"]>>;
    expect<Expected>().type.toBeAssignableWith({} as Actual);
    expect<Actual>().type.toBeAssignableWith({} as Expected);

    const ctxOptions = {
      type: "choice" as const,
      options: (p: P1) =>
        p.showHidden
          ? [{ label: "Hidden", value: "x" }]
          : [{ label: "Visible", value: "y" }],
    };
    type Arr = ReturnType<typeof ctxOptions.options>;
    expect<ChoiceOptions>().type.toBeAssignableWith({} as Arr);
  });

  test("InferDataType propagates through ControlContext", () => {
    interface Props extends CanvasComponentProps<{ foo: number }> {
      choice: ChoiceValue | ChoiceValue[];
    }
    type Ctx = ComponentControlContext<Props>;
    const ctx: Ctx = [
      { choice: "a", setControlContextData: (_d: { foo: number }) => {} },
      { foo: 123 },
      { path: [] },
    ];
    expect<Ctx>().type.toBeAssignableWith(ctx);
  });

  test("RestrictPropType maps primitives to compat unions", () => {
    type X = RestrictPropType<string, {}>;
    expect<StringCompatType<{}>>().type.toBeAssignableWith({} as X);
    expect<StringCompatType<{}>>().type.not.toBeAssignableWith(42);
  });

  test("ArrayType with nested ObjectType accepts advanced config", () => {
    type P = { readonlyMode?: boolean };

    const complexArray = {
      type: "array",
      defaultValue: [] as any[],
      unstable__canDelete: (
        _item: unknown,
        ...[props]: ComponentControlContext<P>
      ) => !props.readonlyMode,
      unstable__keyFunc: (item: { id: string }) => item.id,
      unstable__minimalValue: (..._ctx: ComponentControlContext<P>) => [
        { id: "sample-1", status: "todo", count: 1 },
      ],
      itemType: {
        type: "object",
        nameFunc: (item: { id: string }) => `Row ${item.id}`,
        fields: {
          id: { type: "string" } as PlainStringType<P>,
          status: {
            type: "choice",
            options: ["todo", "doing", "done"],
            defaultValue: "todo",
            multiSelect: false,
          } as SingleChoiceType<P>,
          count: {
            type: "number",
            min: 0,
            max: 10,
            defaultValue: 1,
          },
        },
      },
    } as const;

    expect<ArrayType<P>>().type.toBeAssignableWith(complexArray);
    expect<PlainStringType<P>>().type.toBeAssignableWith(
      complexArray.itemType.fields.id
    );
    expect<SingleChoiceType<P>>().type.toBeAssignableWith(
      complexArray.itemType.fields.status
    );
  });

  test("PlainStringType rejects boolean values", () => {
    expect<PlainStringType<{}>>().type.not.toBeAssignableWith(true);
  });

  test("GraphQLType handles dynamic endpoint / headers", () => {
    type P = { useProd?: boolean; authToken?: string };
    const gql = {
      type: "code",
      lang: "graphql",
      endpoint: (p: P) =>
        p.useProd
          ? "https://api.prod.example.com/graphql"
          : "https://api.dev.example.com/graphql",
      method: "POST",
      headers: (p: P) => ({
        Authorization: `Bearer ${p.authToken ?? "anonymous"} `,
      }),
      defaultValue: { query: "query Foo { foo }" },
    } as const;
    expect<GraphQLType<P>>().type.toBeAssignableWith(gql);
    expect<string>().type.toBeAssignableWith(gql.defaultValue.query);
  });

  test("GraphQL ContextDependentConfig receives component context as 3-tuple with typed data", () => {
    // Test that GraphQL context dependency functions for components receive:
    // [Props, InferDataType<Props> | null, ControlExtras] (3-element tuple)
    interface TestProps extends CanvasComponentProps<{ apiKey: string }> {
      useProd?: boolean;
    }

    // Test the actual context structure so expectType actually runs
    const testContext: ComponentControlContext<TestProps> = [
      { useProd: true, setControlContextData: () => {} }, // Full props object
      { apiKey: "test-key" }, // Typed canvas data
      { path: ["test"], item: null }, // ControlExtras
    ];
    expect(testContext).type.toBe<ComponentControlContext<TestProps>>();
    expect(testContext).type.toBe<
      [TestProps, { apiKey: string } | null, ControlExtras]
    >();

    // Test destructuring the context
    const [props, data, extras] = testContext;
    expect(props).type.toBe<TestProps>();
    expect(data).type.toBe<{ apiKey: string } | null>();
    expect(extras).type.toBe<ControlExtras>();

    // Test both static and dynamic GraphQL configurations
    const gqlStatic: GraphQLType<TestProps> = {
      type: "code",
      lang: "graphql",
      endpoint: "https://api.example.com/graphql", // Static string
      method: "POST",
      defaultValue: { query: "query { test }" },
    };

    const gqlDynamic: GraphQLType<TestProps> = {
      type: "code",
      lang: "graphql",
      endpoint: (...ctx: ComponentControlContext<TestProps>) => {
        // If this were called, ctx would be [Props, TypedData | null, ControlExtras]
        const [compProps, _data, _extras] = ctx;
        return compProps.useProd
          ? "https://prod.api.com"
          : "https://dev.api.com";
      },
      method: "POST",
      defaultValue: { query: "query { test }" },
    };

    expect<GraphQLType<TestProps>>().type.toBeAssignableWith(gqlStatic);
    expect<GraphQLType<TestProps>>().type.toBeAssignableWith(gqlDynamic);
  });

  test("DynamicType can return different prop types based on context", () => {
    interface DynamicTestProps {
      mode: "text" | "number" | "boolean";
      value: any;
    }

    const dynamicProp: DynamicType<DynamicTestProps> = {
      type: "dynamic",
      control: (
        props: DynamicTestProps,
        _data: InferDataType<DynamicTestProps> | null,
        _extras: ControlExtras
      ): PropType<DynamicTestProps> => {
        switch (props.mode) {
          case "text":
            return { type: "string", defaultValueHint: "hello" };
          case "number":
            return { type: "number", defaultValueHint: 42 };
          case "boolean":
            return { type: "boolean", defaultValueHint: false };
          default:
            return "string";
        }
      },
    };

    expect<PropType<DynamicTestProps>>().type.toBeAssignableWith(dynamicProp);
    expect<ArgType<DynamicTestProps>>().type.toBeAssignableWith(dynamicProp);

    // Test that control function receives proper context
    const controlFn = dynamicProp.control;
    const result = controlFn({ mode: "text", value: "test" }, null, {
      path: [],
      item: undefined,
    });
    expect<PropType<DynamicTestProps>>().type.toBeAssignableWith(result);
  });

  test("DynamicType control function can access component props and context", () => {
    interface ContextAwareProps
      extends CanvasComponentProps<{ items: string[] }> {
      selectedIndex: number;
      displayValue: any;
    }

    const dynamicWithContext: DynamicType<ContextAwareProps> = {
      type: "dynamic",
      description: "Dynamic prop that adapts based on context",
      control: (props, data, extras) => {
        // Test that we can access props
        expect<number>().type.toBeAssignableWith(props.selectedIndex);

        // Test that data is properly typed
        if (data !== null) {
          expect<string[]>().type.toBeAssignableWith(data.items);
        }

        // Test that extras has proper structure
        expect<(string | number)[]>().type.toBeAssignableWith(extras.path);
        expect<any>().type.toBeAssignableWith(extras.item);

        // Return different types based on context
        if (data && data.items[props.selectedIndex]) {
          return {
            type: "choice",
            options: data.items,
            defaultValueHint: data.items[props.selectedIndex],
          };
        }

        return { type: "string", defaultValueHint: "" };
      },
    };

    expect<PropType<ContextAwareProps>>().type.toBeAssignableWith(
      dynamicWithContext
    );
  });

  test("DynamicType works with nested prop types", () => {
    interface NestedProps {
      dataType: "json" | "array" | "primitive";
      data: any;
    }

    const nestedDynamic: DynamicType<NestedProps> = {
      type: "dynamic",
      control: (props) => {
        switch (props.dataType) {
          case "json":
            return {
              type: "object",
              fields: {
                name: "string",
                age: "number",
                active: "boolean",
              },
            };
          case "array":
            return {
              type: "array",
              defaultValue: ["item1", "item2"],
            };
          case "primitive":
          default:
            return "string";
        }
      },
    };

    expect<PropType<NestedProps>>().type.toBeAssignableWith(nestedDynamic);
  });

  test("DynamicType respects PropTypeBase properties", () => {
    interface BaseTestProps {
      mode: string;
      value: any;
    }

    const dynamicWithBase: DynamicType<BaseTestProps> = {
      type: "dynamic",
      displayName: "Dynamic Value",
      description: "A value that changes based on mode",
      advanced: true,
      readOnly: false,
      hidden: (props) => props.mode === "hidden",
      control: (props) => {
        return props.mode === "number" ? "number" : "string";
      },
    };

    expect<PropType<BaseTestProps>>().type.toBeAssignableWith(dynamicWithBase);

    // Test that hidden function receives correct context
    if (typeof dynamicWithBase.hidden === "function") {
      const isHidden = dynamicWithBase.hidden(
        { mode: "hidden", value: null },
        null,
        { path: [], item: undefined }
      );
      expect<boolean>().type.toBeAssignableWith(isHidden);
    }
  });
});
