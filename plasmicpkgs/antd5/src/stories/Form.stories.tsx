import { DataCtxReader, PlasmicCanvasContext } from "@plasmicapp/host";
import { generateOnMutateForSpec, useDollarState } from "@plasmicapp/react-web";
import { StoryFn } from "@storybook/react";
import { expect } from "@storybook/test";
import {
  queryByAttribute,
  userEvent,
  within,
} from "@storybook/testing-library";
import { Button, Checkbox, Input, InputNumber } from "antd";
import TextArea, { TextAreaRef } from "antd/es/input/TextArea";
import { FormListOperation, Select } from "antd/lib";
import React from "react";
import {
  FormWrapper as Form,
  FormRefActions,
  FormWrapperControlContextData,
  FormWrapperProps,
  InputType,
  SimplifiedFormItemsProp,
} from "../form/Form";
import { FormGroup } from "../form/FormGroup";
import { FormItemWrapper as FormItem } from "../form/FormItem";
import { FormListWrapper } from "../form/FormList";
import { formHelpers } from "../form/registerForm";
import { AntdCheckbox } from "../registerCheckbox";
import { fakeInitDatabase, fakeSchema } from "./fake-data-source";

export default {
  title: "Form",
};

const deepClone = function <T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function PlasmicCanvasProvider(props: React.PropsWithChildren<{}>) {
  return (
    <PlasmicCanvasContext.Provider
      value={{
        componentName: "test",
        globalVariants: {},
      }}
    >
      {props.children}
    </PlasmicCanvasContext.Provider>
  );
}
interface ExtendedSimplifiedFormItemsProp extends SimplifiedFormItemsProp {
  selectedLabel?: string;
}

const ALL_FORM_ITEMS_TYPE: ExtendedSimplifiedFormItemsProp[] = [
  {
    name: "textField",
    label: "Text Field",
    inputType: InputType.Text,
    initialValue: "text",
    preserve: false,
  },
  {
    name: "textAreaField",
    label: "Text Area Field",
    inputType: InputType.TextArea,
    initialValue: "textarea",
    preserve: false,
  },
  {
    name: "numberField",
    label: "Number Field",
    inputType: InputType.Number,
    initialValue: "123",
    preserve: false,
  },
  {
    name: "passwordField",
    label: "Password Field",
    inputType: InputType.Password,
    initialValue: "password",
    preserve: false,
  },
  {
    name: "selectField",
    label: "Select Field",
    inputType: InputType.Select,
    options: [
      {
        label: "Opt 1",
        value: "opt1",
      },
      {
        label: "Opt 2",
        value: "opt2",
      },
    ],
    initialValue: "opt1",
    preserve: false,
  },
  {
    name: "checkboxField",
    label: "Checkbox Field",
    inputType: InputType.Checkbox,
    initialValue: true,
    preserve: false,
  },
  {
    name: "radioGroupField",
    inputType: InputType.RadioGroup,
    options: [
      {
        label: "radio 1",
        value: "radio1",
      },
      {
        label: "radio 2",
        value: "radio2",
      },
    ],
    initialValue: "radio1",
    preserve: false,
  },
];

const SubmitSlot = ({ label }: { label?: string }) => (
  <Button type="primary" htmlType="submit">
    {label ?? "Submit"}
  </Button>
);

const _SimplifiedForm: StoryFn = (args: any) => {
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
    ],
    { $props: args }
  );
  return (
    <div>
      <Form
        extendedOnValuesChange={(values) => ($state.form.value = values)}
        formItems={args.formItems}
        mode="simplified"
        submitSlot={<SubmitSlot />}
      />
      <p>{JSON.stringify($state.form.value)}</p>
    </div>
  );
};

export const SimplifiedForm = _SimplifiedForm.bind({});
SimplifiedForm.tags = ["skip-test"]; // simplified forms broken?
SimplifiedForm.args = {
  formItems: ALL_FORM_ITEMS_TYPE,
};

const _AdvancedForm: StoryFn = (args: any) => {
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
    ],
    { $props: args }
  );
  return (
    <div>
      <Form extendedOnValuesChange={(values) => ($state.form.value = values)}>
        <FormItem label={<p>Text Field</p>} name="textField">
          <Input />
        </FormItem>
        <FormItem label={<p>Text Area</p>} name="textAreaField">
          <TextArea />
        </FormItem>
        <FormItem label={<p>Number</p>} name="numberField">
          <InputNumber />
        </FormItem>
        <FormItem label={<p>Password</p>} name="passwordField">
          <Input.Password />
        </FormItem>
        <FormItem
          label={<p>Select</p>}
          name="selectField"
          initialValue={"opt1"}
        >
          <Select
            options={[
              { label: "Opt1", value: "opt1" },
              { label: "Opt2", value: "opt2" },
            ]}
          />
        </FormItem>
        <FormItem
          label={"Checkbox"}
          name="checkboxField"
          valuePropName="checked"
        >
          <Checkbox />
        </FormItem>
        <Button type="primary">Submit</Button>
      </Form>
      <p>{JSON.stringify($state.form.value)}</p>
    </div>
  );
};

export const AdvancedForm = _AdvancedForm.bind({});
AdvancedForm.args = {};

const _TestSimplifiedForm: StoryFn = (args: any) => {
  const ref = React.createRef<TextAreaRef>();
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
      {
        path: "submittedValue",
        type: "private",
        variableType: "object",
      },
      {
        path: "formItems",
        type: "private",
        variableType: "text",
        initFunc: ({ $props }) => JSON.stringify($props.formItems),
      },
    ],
    { $props: args }
  );
  return (
    <div>
      <FormItem label="Form items">
        <Input.TextArea
          defaultValue={$state.formItems}
          ref={ref}
          rows={5}
          data-testid="formItems"
        />
      </FormItem>
      <Button
        onClick={() =>
          ($state.formItems = ref.current?.resizableTextArea?.textArea.value)
        }
      >
        Update form
      </Button>
      <h1>Form</h1>
      <Form
        mode="simplified"
        formItems={JSON.parse($state.formItems)}
        submitSlot={<SubmitSlot />}
        extendedOnValuesChange={(values) => ($state.form.value = values)}
        onFinish={(values) => ($state.submittedValue = values)}
      />
      <p data-testid={"value"}>Value: {JSON.stringify($state.form.value)}</p>
      <p data-testid={"submitted"}>
        Submitted: {JSON.stringify($state.submittedValue)}
      </p>
    </div>
  );
};

export const TestSimplifiedForm = _TestSimplifiedForm.bind({});
TestSimplifiedForm.tags = ["skip-test"]; // simplified forms broken?
TestSimplifiedForm.args = {
  formItems: ALL_FORM_ITEMS_TYPE,
};

const checkFormItems = async (
  canvasElement: HTMLElement,
  expectedFormItems: ExtendedSimplifiedFormItemsProp[]
) => {
  for (const formItem of expectedFormItems) {
    const dom = queryByAttribute(
      "id",
      canvasElement,
      formItem.name ?? ""
    ) as HTMLSelectElement;
    await expect(dom).toBeInTheDocument();
    if (formItem.inputType === InputType.Select) {
      await userEvent.click(dom);
      await userEvent.click(dom);
      const optionDom = document.querySelector('[aria-selected="true"]');
      if (formItem.initialValue) {
        await expect(optionDom).toBeInTheDocument();
        await expect(optionDom).toHaveTextContent(formItem.initialValue);
      } else {
        await expect(optionDom).not.toBeInTheDocument();
      }
    } else if (formItem.inputType === InputType.Checkbox) {
      if (formItem.initialValue) {
        await expect(dom).toBeChecked();
      } else {
        await expect(dom).not.toBeChecked();
      }
    } else if (formItem.inputType === InputType.RadioGroup) {
      if (formItem.initialValue) {
        const optionDom = queryByAttribute("value", dom, formItem.initialValue);
        await expect(optionDom).toBeChecked();
      }
    } else {
      if (formItem.initialValue) {
        await expect(dom).toHaveValue(`${formItem.initialValue}`);
      } else {
        await expect(dom).not.toHaveValue();
      }
    }
  }
};

const modifyFormItems = async (
  canvasElement: HTMLElement,
  expectedFormItems: Partial<ExtendedSimplifiedFormItemsProp>[]
) => {
  for (const formItem of expectedFormItems) {
    const dom = queryByAttribute(
      "id",
      canvasElement,
      formItem.name ?? ""
    ) as HTMLSelectElement;
    await expect(dom).toBeInTheDocument();
    if (formItem.inputType === InputType.Select) {
      await userEvent.click(dom);
      await sleep(100);
      const optionDom = document.querySelector(
        `[title="${formItem.selectedLabel}"]`
      );
      if (optionDom) {
        await userEvent.click(optionDom);
      }
    } else if (formItem.inputType === InputType.Checkbox) {
      await userEvent.click(dom);
    } else if (formItem.inputType === InputType.RadioGroup) {
      const optionDom = queryByAttribute("value", dom, formItem.initialValue);
      await expect(optionDom).toBeInTheDocument();
      if (optionDom) {
        await userEvent.click(optionDom);
      }
    } else {
      await justType(dom, `${formItem.initialValue}`);
    }
  }
};

const getFormItemsValue = (
  expectedFormItems: ExtendedSimplifiedFormItemsProp[]
) => {
  return JSON.stringify(
    Object.fromEntries(
      expectedFormItems
        .filter((formItem) => formItem.initialValue != null)
        .map((formItem) => [formItem.name, formItem.initialValue])
    )
  );
};

TestSimplifiedForm.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  let expectedFormItems = deepClone(ALL_FORM_ITEMS_TYPE);

  await checkFormItems(canvasElement, expectedFormItems);

  expectedFormItems[0].initialValue = "foo";
  // test state is updating properly
  await modifyFormItems(canvasElement, expectedFormItems.slice(0, 1));
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    `Value: ${getFormItemsValue(expectedFormItems)}`
  );

  expectedFormItems[1].initialValue = "bar";
  expectedFormItems[2].initialValue = 456;
  await modifyFormItems(canvasElement, expectedFormItems.slice(1, 3));
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    `Value: ${getFormItemsValue(expectedFormItems)}`
  );

  await checkFormItems(canvasElement, expectedFormItems);

  await sleep(100);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    `Submitted: ${getFormItemsValue(expectedFormItems)}`
  );

  // test can modify the form structure -- simulates changing props in studio
  expectedFormItems = [
    {
      name: "text2",
      label: "Text 2",
      inputType: InputType.Text,
      initialValue: "foo",
    },
    {
      name: "number2",
      label: "Number 2",
      inputType: InputType.Number,
      initialValue: "456",
    },
    {
      name: "select2",
      label: "Select 2",
      inputType: InputType.Select,
      options: [
        {
          label: "Opt 3",
          value: "opt3",
        },
        {
          label: "Opt 4",
          value: "opt4",
        },
      ],
      initialValue: "opt4",
    },
  ];

  await sleep(1000);
  await userEvent.clear(canvas.getByTestId("formItems"));
  await userEvent.paste(JSON.stringify(expectedFormItems));
  await userEvent.click(canvas.getByText("Update form"));
  await checkFormItems(canvasElement, expectedFormItems);

  expectedFormItems[2].initialValue = "opt3";
  expectedFormItems[2].selectedLabel = "Opt 3";
  await modifyFormItems(canvasElement, expectedFormItems.slice(2, 3));
  await sleep(100);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    `Value: ${getFormItemsValue(expectedFormItems)}`
  );
  await checkFormItems(canvasElement, expectedFormItems);
  await sleep(100);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(200);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    `Submitted: ${getFormItemsValue(expectedFormItems)}`
  );
};

const useForceRender = () => {
  const [_, setRenderCnt] = React.useState(0);
  return () => setRenderCnt((c) => c + 1);
};

const _InternalFormCtx: StoryFn = (args: any) => {
  const forceRender = useForceRender();
  const ctxDataRef = React.useRef<FormWrapperControlContextData | null>(null);
  const setControlContextData = React.useCallback((data: any) => {
    if (
      JSON.stringify(ctxDataRef.current?.internalFieldCtx) !==
      JSON.stringify(data.internalFieldCtx)
    ) {
      ctxDataRef.current = data;
      forceRender();
    }
  }, []);
  const registeredFields =
    ctxDataRef.current?.internalFieldCtx?.registeredFields;
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
    ],
    { $props: args }
  );
  const [formItems, setFormItems] = React.useState(() => [
    {
      preserve: true,
      name: "textField",
    },
    {
      preserve: true,
      name: "textAreaField",
      hidden: true,
    },
    {
      preserve: true,
      name: "numberField",
    },
    {
      preserve: true,
      name: "address",
    },
    {
      preserve: true,
      name: "city",
    },
    {
      preserve: true,
      name: "state",
    },
  ]);
  const [selectedFormItem, setSelectedFormItem] = React.useState<string>("0");
  const [renameInput, setRenameInput] = React.useState("");
  const [fieldVisibility, setFieldVisibility] = React.useState<
    "visible" | "invisible"
  >("visible");
  return (
    <PlasmicCanvasProvider>
      <Form
        extendedOnValuesChange={(values) => ($state.form.value = values)}
        setControlContextData={setControlContextData}
      >
        {!formItems[0].hidden && (
          <FormItem label={"Text Field"} name={formItems[0].name}>
            <Input />
          </FormItem>
        )}
        {!formItems[1].hidden && (
          <FormItem label={"Text Area"} name={formItems[1].name}>
            <TextArea />
          </FormItem>
        )}
        {!formItems[2].hidden && (
          <FormItem label={"Number"} name={formItems[2].name}>
            <InputNumber />
          </FormItem>
        )}
        {!formItems[3].hidden && (
          <FormGroup name={formItems[3].name}>
            {!formItems[4].hidden && (
              <FormItem label="City" name={formItems[4].name}>
                <Input />
              </FormItem>
            )}
            {!formItems[5].hidden && (
              <FormItem label="State" name={formItems[5].name}>
                <Input />
              </FormItem>
            )}
          </FormGroup>
        )}
      </Form>
      <p data-testid={"registeredFields"}>{JSON.stringify(registeredFields)}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p>Modify fields</p>
        <select
          data-testid={"registeredFieldsSelect"}
          value={selectedFormItem}
          onChange={(e) => setSelectedFormItem(e.target.value)}
        >
          {formItems.map((formItem, index) => (
            <option value={index}>{formItem.name}</option>
          ))}
        </select>
        <div style={{ display: "flex" }}>
          <Input
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            style={{ width: 200 }}
            data-testid={"renameInput"}
          />
          <Button
            onClick={() => {
              setFormItems((formItems) => {
                formItems[+selectedFormItem].name = renameInput;
                return [...formItems];
              });
              // updating the field registration doesn't cause a re-render in the parent component
              // so we need to force a re-render to get latest registered fields
              setTimeout(() => setRenameInput(""), 1);
            }}
          >
            Rename field
          </Button>
        </div>
        <div>
          <select
            data-testid={"visibilitySelect"}
            value={fieldVisibility}
            onChange={(e) => setFieldVisibility(e.target.value as any)}
          >
            <option value="visible">Visible</option>
            <option value="invisible">Invisible</option>
          </select>
          <Button
            onClick={() => {
              setFormItems((formItems) => {
                formItems[+selectedFormItem].hidden =
                  fieldVisibility === "invisible";
                return [...formItems];
              });
              setRenameInput("");
            }}
          >
            Change visibility
          </Button>
        </div>
      </div>
    </PlasmicCanvasProvider>
  );
};

export const InternalFormCtx = _InternalFormCtx.bind({});
InternalFormCtx.args = {};
InternalFormCtx.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  let expectedRegisteredFields = [
    { preserve: true, fullPath: ["textField"], name: "textField" },
    { preserve: true, fullPath: ["numberField"], name: "numberField" },
    { preserve: true, fullPath: ["address", "city"], name: "city" },
    { preserve: true, fullPath: ["address", "state"], name: "state" },
  ];

  const checkRegisteredFields = async () => {
    await sleep(200);
    await expect(canvas.getByTestId("registeredFields")).toHaveTextContent(
      JSON.stringify(expectedRegisteredFields)
    );
  };
  await checkRegisteredFields();
  // // change fields visibility --> this should register/unregister fields
  expectedRegisteredFields.push({
    preserve: true,
    fullPath: ["textAreaField"],
    name: "textAreaField",
  });
  await userEvent.selectOptions(
    canvas.getByTestId("registeredFieldsSelect"),
    "1"
  );
  await userEvent.selectOptions(
    canvas.getByTestId("visibilitySelect"),
    "visible"
  );
  await userEvent.click(canvas.getByText("Change visibility"));
  await checkRegisteredFields();

  expectedRegisteredFields = expectedRegisteredFields.slice(1);
  await userEvent.selectOptions(
    canvas.getByTestId("registeredFieldsSelect"),
    "0"
  );
  await userEvent.selectOptions(
    canvas.getByTestId("visibilitySelect"),
    "invisible"
  );
  await userEvent.click(canvas.getByText("Change visibility"));
  await checkRegisteredFields();

  // //rename fields name
  expectedRegisteredFields = [
    ...expectedRegisteredFields.slice(-1),
    ...expectedRegisteredFields.slice(0, -1),
  ];
  expectedRegisteredFields[1].fullPath[0] = "new field name";
  expectedRegisteredFields[1].name = "new field name";
  await userEvent.selectOptions(
    canvas.getByTestId("registeredFieldsSelect"),
    "2"
  );
  await userEvent.type(canvas.getByTestId("renameInput"), "new field name");
  await userEvent.click(canvas.getByText("Rename field"));
  await checkRegisteredFields();

  //renaming form group name should rename all children
  expectedRegisteredFields[2].fullPath[0] = "address2";
  expectedRegisteredFields[3].fullPath[0] = "address2";
  await userEvent.selectOptions(
    canvas.getByTestId("registeredFieldsSelect"),
    "3"
  );
  await userEvent.type(canvas.getByTestId("renameInput"), "address2");
  await userEvent.click(canvas.getByText("Rename field"));
  await checkRegisteredFields();
};

const _SchemaForms: StoryFn = () => {
  const [formType, setFormType] = React.useState<"new" | "update">("new");
  const [table, setTable] = React.useState<"athletes" | "products">("athletes");
  const [id, setId] = React.useState<number>(0);
  const [newFieldName, setNewFieldName] = React.useState("");
  const [dataFields, setDataFields] = React.useState<SimplifiedFormItemsProp[]>(
    []
  );
  const [dataOp, setDataOp] = React.useState<
    FormWrapperProps["data"] | undefined
  >({
    sourceId: "fake",
    opId: "fake",
    userArgs: {
      table: "athletes",
      opName: "schema",
    },
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <p>Form Type</p>
        <select
          data-testid={"formType"}
          value={formType}
          onChange={(e) => setFormType(e.target.value as any)}
        >
          <option value="new">New Entry</option>
          <option value="update">Update Entry</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <p>Table</p>
        <select
          data-testid={"table"}
          value={table}
          onChange={(e) => setTable(e.target.value as any)}
        >
          <option value={"athletes"}>Athletes</option>
          <option value="products">Products</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span>Id</span>
        <InputNumber
          value={id}
          onChange={(val) => setId(val ?? 0)}
          data-testid={"rowId"}
        />
      </div>
      <Button
        onClick={() => {
          setDataOp({
            sourceId: "fake",
            opId: "fake",
            userArgs: {
              table,
              opName: formType === "new" ? "schema" : "getRow",
              id,
            },
          });
        }}
      >
        Generate new form
      </Button>
      <Button
        onClick={() => {
          setDataOp(undefined);
          setDataFields([]);
        }}
        danger
      >
        Disconnect from data
      </Button>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span>New field name</span>
        <Input
          value={newFieldName}
          onChange={(e) => setNewFieldName(e.target.value)}
          style={{ width: 200 }}
          data-testid={"newFieldName"}
        />
        <Button
          onClick={() => {
            setDataFields((dataFields) => [
              ...dataFields,
              {
                inputType: InputType.Text,
                name: newFieldName,
                label: newFieldName,
              },
            ]);
            setNewFieldName("");
          }}
        >
          Add field
        </Button>
      </div>
      <hr />
      <Form
        mode="simplified"
        submitSlot={<SubmitSlot />}
        colon={false}
        data={dataOp}
        formItems={[
          {
            inputType: InputType.Text,
            name: "name",
            label: "Name",
            initialValue: "hello",
          },
          { inputType: InputType.TextArea, name: "message", label: "Message" },
        ]}
        dataFormItems={dataFields}
      />
    </div>
  );
};

const mockedData = [
  {
    url: "https://data.plasmic.app/api/v1/server-data/sources/:id/execute",
    method: "POST",
    status: 200,
    response: (request: any) => {
      const body = JSON.parse(request.body);
      const { opName, id } = body.userArgs;
      const table = body.userArgs.table;
      return {
        data:
          opName === "getRow"
            ? fakeInitDatabase[table].find((row: any) => row.id === id)
            : [],
        schema: {
          id: table,
          fields: fakeSchema[table],
        },
      };
    },
  },
];

const genExpectedFormItemsFromSchema = (
  table: keyof typeof fakeSchema,
  formType: "new" | "update",
  id?: number
) => {
  return fakeSchema[table].map((column) => ({
    name: column.name,
    fieldId: column.name,
    id: column.name,
    inputType:
      column.type === "string"
        ? InputType.Text
        : column.type === "number"
        ? InputType.Number
        : column.type === "boolean"
        ? InputType.Checkbox
        : InputType.Text,
    ...(formType === "update"
      ? {
          initialValue: fakeInitDatabase[table].find(
            (row: any) => row.id === id
          )?.[column.name],
        }
      : {}),
  })) as SimplifiedFormItemsProp[];
};

export const SchemaForms = _SchemaForms.bind({});
SchemaForms.tags = ["skip-test"]; // simplified forms broken?
SchemaForms.args = {};
SchemaForms.parameters = {
  mockData: mockedData,
};
SchemaForms.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  let expectedFormItems = genExpectedFormItemsFromSchema("athletes", "new");
  await sleep(100);
  await checkFormItems(canvasElement, expectedFormItems);

  // can switch between rows and tables
  await userEvent.selectOptions(canvas.getByTestId("formType"), "update");
  await justType(canvas.getByTestId("rowId"), "1");
  await userEvent.click(canvas.getByText("Generate new form"));
  await sleep(100);
  expectedFormItems = genExpectedFormItemsFromSchema("athletes", "update", 1);
  await checkFormItems(canvasElement, expectedFormItems);

  await userEvent.selectOptions(canvas.getByTestId("formType"), "update");
  await justType(canvas.getByTestId("rowId"), "2");
  await userEvent.click(canvas.getByText("Generate new form"));
  await sleep(100);
  expectedFormItems = genExpectedFormItemsFromSchema("athletes", "update", 2);
  await checkFormItems(canvasElement, expectedFormItems);

  await userEvent.selectOptions(canvas.getByTestId("formType"), "new");
  await userEvent.selectOptions(canvas.getByTestId("table"), "products");
  await userEvent.click(canvas.getByText("Generate new form"));
  await sleep(100);
  expectedFormItems = genExpectedFormItemsFromSchema("products", "update");
  await checkFormItems(canvasElement, expectedFormItems);

  await userEvent.selectOptions(canvas.getByTestId("formType"), "update");
  await justType(canvas.getByTestId("rowId"), "2");
  await userEvent.click(canvas.getByText("Generate new form"));
  await sleep(100);
  expectedFormItems = genExpectedFormItemsFromSchema("products", "update", 2);
  await checkFormItems(canvasElement, expectedFormItems);

  // can add new fields to schema forms
  await userEvent.type(canvas.getByTestId("newFieldName"), "new field");
  await userEvent.click(canvas.getByText("Add field"));
  await sleep(100);
  expectedFormItems.push({
    inputType: InputType.Text,
    name: "new field",
    label: "new field",
  });
  await userEvent.type(canvas.getByTestId("newFieldName"), "new field2");
  await userEvent.click(canvas.getByText("Add field"));
  await sleep(100);
  expectedFormItems.push({
    inputType: InputType.Text,
    name: "new field2",
    label: "new field2",
  });
  await checkFormItems(canvasElement, expectedFormItems);

  // disconnecting from data switches to the formItems prop
  await userEvent.click(canvas.getByText("Disconnect from data"));
  expectedFormItems = [
    {
      inputType: InputType.Text,
      name: "name",
      initialValue: "hello",
    },
    {
      inputType: InputType.TextArea,
      name: "message",
    },
  ];
  await sleep(100);
  await checkFormItems(canvasElement, expectedFormItems);

  // can connect back to data
  await userEvent.selectOptions(canvas.getByTestId("formType"), "update");
  await userEvent.selectOptions(canvas.getByTestId("table"), "athletes");
  await justType(canvas.getByTestId("rowId"), "3");
  await userEvent.click(canvas.getByText("Generate new form"));
  await sleep(100);
  expectedFormItems = genExpectedFormItemsFromSchema("athletes", "update", 3);
  await checkFormItems(canvasElement, expectedFormItems);
};

const _MultiStepForm: StoryFn = (args: any) => {
  const [step, setStep] = React.useState(0);
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
      {
        path: "submittedData",
        type: "private",
        variableType: "object",
      },
    ],
    { $props: args }
  );
  return (
    <div>
      <Form
        extendedOnValuesChange={(values) => ($state.form.value = values)}
        onFinish={(values) => ($state.submittedData = values)}
        validateTrigger={"onFinish"}
      >
        {[0, 1, 2].map((formStep) => {
          if (formStep !== step) {
            return null;
          }
          return [0, 1].map((fieldId) => (
            <FormItem
              name={`field${formStep}${fieldId}`}
              label={`Field ${formStep} ${fieldId}`}
            >
              {fieldId === 0 ? <Input /> : <InputNumber />}
            </FormItem>
          ));
        })}
        <div style={{ display: "flex", gap: 10 }}>
          <Button
            danger
            onClick={() => setStep((s) => s - 1)}
            disabled={step < 1}
            data-testid="prevStep"
          >
            Prev step
          </Button>
          <Button
            onClick={async () => {
              setStep((s) => s + 1);
            }}
            disabled={step == 2}
            data-testid="nextStep"
          >
            Next step
          </Button>
          <Button
            type="primary"
            disabled={step != 2}
            htmlType="submit"
            data-testid="submit"
          >
            Submit
          </Button>
        </div>
      </Form>
      <p data-testid="value">{JSON.stringify($state.form.value)}</p>
      <p data-testid="submittedData">{JSON.stringify($state.submittedData)}</p>
    </div>
  );
};

export const MultiStepForm = _MultiStepForm.bind({});
MultiStepForm.args = {};
MultiStepForm.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  let expectedFormItems: SimplifiedFormItemsProp[] = [
    { name: "field00", inputType: InputType.Text },
    { name: "field01", inputType: InputType.Number },
  ];
  const formItemsValues: Record<string, any> = {
    field00: "foo",
    field01: 123,
  };

  // $state.form.value keeps value stored even if the component is unmounted

  await checkFormItems(canvasElement, expectedFormItems);
  expectedFormItems[0].initialValue = formItemsValues.field00;
  expectedFormItems[1].initialValue = formItemsValues.field01;
  await modifyFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(formItemsValues)
  );

  await userEvent.click(canvas.getByText("Next step"));

  expectedFormItems = [
    { name: "field10", inputType: InputType.Text },
    { name: "field11", inputType: InputType.Number },
  ];
  await checkFormItems(canvasElement, expectedFormItems);
  formItemsValues.field10 = "bar";
  formItemsValues.field11 = 456;
  expectedFormItems[0].initialValue = formItemsValues.field10;
  expectedFormItems[1].initialValue = formItemsValues.field11;
  await modifyFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(formItemsValues)
  );

  await userEvent.click(canvas.getByText("Next step"));

  expectedFormItems = [
    { name: "field20", inputType: InputType.Text },
    { name: "field21", inputType: InputType.Number },
  ];
  await checkFormItems(canvasElement, expectedFormItems);
  formItemsValues.field20 = "baz";
  formItemsValues.field21 = 789;
  expectedFormItems[0].initialValue = formItemsValues.field20;
  expectedFormItems[1].initialValue = formItemsValues.field21;
  await modifyFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(formItemsValues)
  );

  await sleep(100);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submittedData")).toHaveTextContent(
    JSON.stringify(formItemsValues)
  );

  await userEvent.click(canvas.getByText("Prev step"));
  expectedFormItems = [
    { name: "field10", inputType: InputType.Text, initialValue: "bar" },
    { name: "field11", inputType: InputType.Number, initialValue: 456 },
  ];
  await checkFormItems(canvasElement, expectedFormItems);
  formItemsValues.field10 = "";
  formItemsValues.field11 = 123;
  expectedFormItems[0].initialValue = formItemsValues.field10;
  expectedFormItems[1].initialValue = formItemsValues.field11;
  await modifyFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(formItemsValues)
  );

  await userEvent.click(canvas.getByText("Next step"));
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submittedData")).toHaveTextContent(
    JSON.stringify(formItemsValues)
  );
};

const _FormValidation: StoryFn = () => {
  return (
    <div>
      Simple Validation
      <Form
        mode="simplified"
        submitSlot={<SubmitSlot label="Submit 1" />}
        formItems={[
          {
            inputType: InputType.Text,
            name: "field1",
            label: "Required Field",
            rules: [
              {
                ruleType: "required",
                message: "Field Is Required",
              },
            ],
          },
          {
            inputType: InputType.Text,
            name: "field2",
            label: "Field with maximum length",
            rules: [
              {
                ruleType: "max",
                length: 5,
                message: "Maximum Length is 5",
              },
            ],
          },
          {
            inputType: InputType.Text,
            name: "field3",
            label: "Field with minimum length",
            rules: [
              {
                ruleType: "min",
                length: 5,
                message: "Minimum Length is 5",
              },
            ],
          },
          {
            inputType: InputType.Text,
            name: "field4",
            label: "Must be one of rule",
            rules: [
              {
                ruleType: "enum",
                options: [{ value: "foo" }, { value: "bar" }, { value: "baz" }],
                message: "Invalid value for field4",
              },
            ],
          },
          {
            inputType: InputType.Text,
            name: "field5",
            label: "Forbid all-whitespace",
            rules: [
              {
                ruleType: "whitespace",
                message: "Only whitespace",
              },
            ],
          },
          {
            inputType: InputType.Text,
            name: "field6",
            label: "Custom validator",
            rules: [
              {
                ruleType: "advanced",
                message: "Invalid value for field 6",
                custom: (_rule, value) => value === "qux",
              },
            ],
          },
        ]}
      />
      Multiple validations
      <Form
        mode="simplified"
        submitSlot={<SubmitSlot label="Submit 2" />}
        formItems={[
          {
            inputType: InputType.Text,
            name: "field7",
            label: "Required Field",
            rules: [
              {
                ruleType: "required",
                message: "Field Is Required",
              },
              {
                ruleType: "whitespace",
                message: "No whitespace",
              },
              {
                ruleType: "min",
                length: 3,
                message: "min length 3",
              },
              {
                ruleType: "max",
                length: 6,
                message: "max length 6",
              },
            ],
          },
        ]}
      />
    </div>
  );
};

export const FormValidation = _FormValidation.bind({});
FormValidation.tags = ["skip-test"]; // simplified forms broken?
FormValidation.args = {};
FormValidation.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  let labelDom = canvasElement.querySelector(`label[for="field1"]`);
  await expect(labelDom).toBeInTheDocument();
  await expect(labelDom).toHaveClass("ant-form-item-required");

  labelDom = canvasElement.querySelector(`label[for="field2"]`);
  await expect(labelDom).toBeInTheDocument();
  await expect(labelDom).not.toHaveClass("ant-form-item-required");

  await modifyFormItems(canvasElement, [
    { name: "field2", initialValue: "more than five chars" },
    { name: "field3", initialValue: "foo" },
    { name: "field4", initialValue: "hello" },
    { name: "field5", initialValue: "   " },
    { name: "field6", initialValue: "bar" },
  ]);

  await userEvent.click(canvas.getByText("Submit 1"));
  await sleep(1000);
  await expect(
    canvasElement.getElementsByClassName("ant-form-item-explain-error").length
  ).toBe(6);

  await expect(canvas.getByText("Field Is Required")).toBeInTheDocument();
  await expect(canvas.getByText("Maximum Length is 5")).toBeInTheDocument();
  await expect(canvas.getByText("Minimum Length is 5")).toBeInTheDocument();
  await expect(
    canvas.getByText("Invalid value for field4")
  ).toBeInTheDocument();
  await expect(canvas.getByText("Only whitespace")).toBeInTheDocument();
  await expect(
    canvas.getByText("Invalid value for field 6")
  ).toBeInTheDocument();

  await modifyFormItems(canvasElement, [
    { name: "field1", initialValue: "hello" },
    { name: "field2", initialValue: "foo" },
    { name: "field3", initialValue: "more than five chars" },
    { name: "field4", initialValue: "bar" },
    { name: "field5", initialValue: "baz" },
    { name: "field6", initialValue: "qux" },
  ]);

  await userEvent.click(canvas.getByText("Submit 1"));
  await sleep(1000);
  await expect(
    canvasElement.getElementsByClassName("ant-form-item-explain-error").length
  ).toBe(0);

  await userEvent.click(canvas.getByText("Submit 2"));
  await sleep(700);
  await expect(canvas.getByText("Field Is Required")).toBeInTheDocument();

  await modifyFormItems(canvasElement, [
    { name: "field7", initialValue: "  " },
  ]);
  await userEvent.click(canvas.getByText("Submit 2"));
  await sleep(700);
  await expect(canvas.getByText("No whitespace")).toBeInTheDocument();

  await modifyFormItems(canvasElement, [
    { name: "field7", initialValue: "ab" },
  ]);
  await userEvent.click(canvas.getByText("Submit 2"));
  await sleep(700);
  await expect(canvas.getByText("min length 3")).toBeInTheDocument();

  await modifyFormItems(canvasElement, [
    { name: "field7", initialValue: "more than six chars" },
  ]);
  await userEvent.click(canvas.getByText("Submit 2"));
  await sleep(700);
  await expect(canvas.getByText("max length 6")).toBeInTheDocument();

  await modifyFormItems(canvasElement, [
    { name: "field7", initialValue: "  " },
  ]);
  await sleep(700);
  await expect(canvas.getByText("No whitespace")).toBeInTheDocument();
  await expect(canvas.getByText("min length 3")).toBeInTheDocument();
  await expect(
    canvasElement.getElementsByClassName("ant-form-item-explain-error").length
  ).toBe(2);

  await modifyFormItems(canvasElement, [
    { name: "field7", initialValue: "valid" },
  ]);
  await userEvent.click(canvas.getByText("Submit 2"));
  await sleep(700);
  await expect(
    canvasElement.getElementsByClassName("ant-form-item-explain-error").length
  ).toBe(0);
};

const _TestFormRefActions: StoryFn = (args: any) => {
  const refsRef = React.useRef<{ form?: FormRefActions | null }>({});
  const $refs = refsRef.current;
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
      {
        path: "itemName",
        type: "private",
        variableType: "text",
      },
      {
        path: "itemValue",
        type: "private",
        variableType: "text",
      },
    ],
    { $props: args, $refs }
  );
  return (
    <div>
      <Form
        mode="simplified"
        extendedOnValuesChange={(val) => ($state.form.value = val)}
        ref={(ref) => ($refs["form"] = ref)}
        formItems={[
          ...ALL_FORM_ITEMS_TYPE,
          {
            label: "Validate Field",
            name: "validateField",
            inputType: InputType.Text,
            rules: [
              { ruleType: "required", message: "Field Is Required" },
              { ruleType: "max", message: "max length is 5", length: 5 },
            ],
          },
        ]}
        submitSlot={<SubmitSlot />}
        validateTrigger={"onFinish"}
      />
      <p data-testid="value">{JSON.stringify($state.form.value)}</p>
      <Input
        value={$state.itemName}
        onChange={(e) => ($state.itemName = e.target.value)}
        data-testid={"itemName"}
      />
      <Input
        value={$state.itemValue}
        onChange={(e) => ($state.itemValue = e.target.value)}
        data-testid={"itemValue"}
      />
      <div>
        <Button onClick={() => $refs.form?.clearFields()}>Clear fields</Button>
        <Button onClick={() => $refs.form?.resetFields()}>Reset fields</Button>
        <Button
          onClick={() =>
            $refs.form?.setFieldValue(
              JSON.parse($state.itemName),
              JSON.parse($state.itemValue)
            )
          }
        >
          Set field
        </Button>
        <Button
          onClick={() =>
            $refs.form?.setFieldsValue(JSON.parse($state.itemValue))
          }
        >
          Set fields
        </Button>
        <Button onClick={() => $refs.form?.validateFields()}>
          Validate all fields
        </Button>
        <Button
          onClick={() =>
            $refs.form?.validateFields(JSON.parse($state.itemName))
          }
        >
          Validate fields
        </Button>
      </div>
    </div>
  );
};

const justType = async (element: HTMLElement, text: string) => {
  await userEvent.clear(element);
  if (text) {
    await userEvent.type(element, text);
  }
};
export const TestFormRefActions = _TestFormRefActions.bind({});
TestFormRefActions.tags = ["skip-test"]; // simplified forms broken?
TestFormRefActions.args = {};
TestFormRefActions.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  let expectedFormItems = deepClone(ALL_FORM_ITEMS_TYPE);
  expectedFormItems.push({
    label: "Validate Field",
    name: "validateField",
    inputType: InputType.Text,
    rules: [
      { ruleType: "required", message: "Field Is Required" },
      { ruleType: "max", message: "max length is 5", length: 5 },
    ],
  });
  await checkFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );

  // can clear fields
  await userEvent.click(canvas.getByText("Clear fields"));
  await sleep(100);
  let newExpectedFormItems = deepClone(expectedFormItems);
  newExpectedFormItems.forEach(
    (formItem) => (formItem.initialValue = undefined)
  );
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(newExpectedFormItems)
  );
  await checkFormItems(canvasElement, newExpectedFormItems);

  // can reset fields to initial value
  await userEvent.click(canvas.getByText("Reset fields"));
  await sleep(100);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );
  await checkFormItems(canvasElement, expectedFormItems);

  // can set single fields
  expectedFormItems[0].initialValue = "foo";
  expectedFormItems[1].initialValue = "bar";
  expectedFormItems[2].initialValue = 456;
  expectedFormItems[3].initialValue = "new password";
  expectedFormItems[4].initialValue = "opt2";
  expectedFormItems[5].initialValue = false;
  expectedFormItems[6].initialValue = "radio2";
  for (const formItem of expectedFormItems) {
    await justType(canvas.getByTestId("itemName"), `"${formItem.name}"`);
    await justType(
      canvas.getByTestId("itemValue"),
      JSON.stringify(formItem.initialValue)
    );
    await userEvent.click(canvas.getByText("Set field"));
  }
  await checkFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );

  // can set multiple fields with setFields action
  expectedFormItems[0].initialValue = "foo3";
  expectedFormItems[1].initialValue = "bar3";
  expectedFormItems[2].initialValue = 789;
  expectedFormItems[3].initialValue = "password3";
  expectedFormItems[4].initialValue = "opt2";
  expectedFormItems[5].initialValue = false;
  expectedFormItems[6].initialValue = "radio2";
  await userEvent.clear(canvas.getByTestId("itemValue"));
  await userEvent.paste(getFormItemsValue(expectedFormItems));
  await userEvent.click(canvas.getByText("Set fields"));
  await sleep(100);
  await checkFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );

  // can use validateFields action
  await userEvent.click(canvas.getByText("Validate all fields"));
  await sleep(500);
  await expect(
    canvasElement.getElementsByClassName("ant-form-item-explain-error").length
  ).toBe(1);
  await expect(canvas.getByText("Field Is Required")).toBeInTheDocument();

  await justType(canvas.getByTestId("itemName"), `"validateField"`);
  await justType(canvas.getByTestId("itemValue"), `"abcdefgh"`);
  await userEvent.click(canvas.getByText("Set field"));
  await userEvent.click(canvas.getByText("Validate all fields"));
  await sleep(1000);
  await expect(
    canvasElement.getElementsByClassName("ant-form-item-explain-error").length
  ).toBe(1);
  await expect(canvas.getByText("max length is 5")).toBeInTheDocument();

  await justType(canvas.getByTestId("itemName"), `"validateField"`);
  await justType(canvas.getByTestId("itemValue"), `"valid"`);
  await userEvent.click(canvas.getByText("Set field"));
  await userEvent.clear(canvas.getByTestId("itemName"));
  await userEvent.paste(`["textField"]`);
  await userEvent.click(canvas.getByText("Validate fields"));
  await sleep(1000);
  await expect(
    canvasElement.getElementsByClassName("ant-form-item-explain-error").length
  ).toBe(1);
  await expect(canvas.getByText("max length is 5")).toBeInTheDocument();

  await userEvent.clear(canvas.getByTestId("itemName"));
  await userEvent.paste(`["validateField"]`);
  await userEvent.click(canvas.getByText("Validate fields"));
  await sleep(1000);
  await expect(
    canvasElement.getElementsByClassName("ant-form-item-explain-error").length
  ).toBe(0);
};

const _FormStateIsMutable: StoryFn = (args: any) => {
  const refsRef = React.useRef<{ form?: FormRefActions | null }>({});
  const $refs = refsRef.current;
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
        refName: "form",
        onMutate: generateOnMutateForSpec("value", formHelpers),
      },
      {
        path: "runCode",
        type: "private",
        variableType: "text",
      },
    ],
    { $props: args, $refs }
  );
  return (
    <div>
      <Form
        mode="simplified"
        extendedOnValuesChange={(val) => ($state.form.value = val)}
        ref={(ref) => ($refs["form"] = ref)}
        formItems={ALL_FORM_ITEMS_TYPE}
        submitSlot={<SubmitSlot />}
        validateTrigger={"onFinish"}
      />
      <p data-testid="value">{JSON.stringify($state.form.value)}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <Input
          value={$state.runCode}
          onChange={(e) => ($state.runCode = e.target.value)}
          data-testid={"runCode"}
        />
        <Button
          onClick={() => {
            eval($state.runCode);
          }}
        >
          Run Code
        </Button>
      </div>
    </div>
  );
};

export const FormStateIsMutable = _FormStateIsMutable.bind({});
FormStateIsMutable.tags = ["skip-test"]; // simplified forms broken?
FormStateIsMutable.args = {};
FormStateIsMutable.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  let expectedFormItems = deepClone(ALL_FORM_ITEMS_TYPE);
  await checkFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );

  expectedFormItems[0].initialValue = "foo2";
  expectedFormItems[1].initialValue = "bar2";
  expectedFormItems[2].initialValue = 123;
  expectedFormItems[3].initialValue = "password123";
  expectedFormItems[4].initialValue = "opt1";
  expectedFormItems[5].initialValue = true;
  expectedFormItems[6].initialValue = "radio1";

  for (const formItem of expectedFormItems) {
    await justType(
      canvas.getByTestId("runCode"),
      `$state.form.value.${formItem.name} = ${JSON.stringify(
        formItem.initialValue
      )}`
    );
    await userEvent.click(canvas.getByText("Run Code"));
  }
  await sleep(100);
  await checkFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );
};

const _CanModifyPropsInCanvasForSchema: StoryFn = (args: any) => {
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
      {
        path: "input.value",
        type: "private",
        variableType: "text",
      },
    ],
    { $props: args }
  );
  const dataOp = React.useMemo(
    () => ({
      sourceId: "fake",
      opId: "fake",
      userArgs: {
        table: "athletes",
        opName: "schema",
      },
    }),
    []
  );
  const [dataFormItems, setDataFormItems] = React.useState<
    SimplifiedFormItemsProp[]
  >([]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          gap: 20,
        }}
      >
        <Input
          value={$state.input.value}
          onChange={(e) => ($state.input.value = e.target.value)}
          data-testid="input"
        />
        <Button
          onClick={() => {
            const [opName, formItem] = JSON.parse($state.input.value) as any;
            if (opName === "add") {
              setDataFormItems((formItems) => [...formItems, formItem]);
            } else if (opName === "delete") {
              setDataFormItems((formItems) =>
                formItems.filter((item) => item.name !== formItem.name)
              );
            } else {
              setDataFormItems((formItems) =>
                formItems.map((item) => {
                  if (item.name !== opName) {
                    return item;
                  } else {
                    return {
                      ...item,
                      ...formItem,
                    };
                  }
                })
              );
            }
            $state.input.value = "";
          }}
        >
          Update form
        </Button>
      </div>
      <PlasmicCanvasProvider>
        <Form
          mode="simplified"
          extendedOnValuesChange={(values) => ($state.form.value = values)}
          submitSlot={<SubmitSlot />}
          colon={false}
          data={dataOp}
          formItems={[
            {
              inputType: InputType.Text,
              name: "name",
              label: "Name",
              initialValue: "hello",
            },
            {
              inputType: InputType.TextArea,
              name: "message",
              label: "Message",
            },
          ]}
          dataFormItems={dataFormItems}
        />
      </PlasmicCanvasProvider>
      <p data-testid="value">{JSON.stringify($state.form.value ?? {})}</p>
    </div>
  );
};

export const CanModifyPropsInCanvasForSchema =
  _CanModifyPropsInCanvasForSchema.bind({});
CanModifyPropsInCanvasForSchema.tags = ["skip-test"]; // simplified forms broken?
CanModifyPropsInCanvasForSchema.args = {};
CanModifyPropsInCanvasForSchema.parameters = {
  mockData: mockedData,
};
CanModifyPropsInCanvasForSchema.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  let expectedFormItems = genExpectedFormItemsFromSchema("athletes", "new");

  await sleep(100);
  await checkFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent("{}");
  await userEvent.click(canvas.getByTestId("input"));
  await userEvent.paste(
    JSON.stringify([
      "add",
      { name: "testInput", label: "Test Input", initialValue: "hello" },
    ])
  );
  await userEvent.click(canvas.getByText("Update form"));
  expectedFormItems = [
    {
      label: "Test Input",
      name: "testInput",
      inputType: InputType.Text,
      initialValue: "hello",
    },
    ...expectedFormItems,
  ];
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );

  await sleep(100);
  await checkFormItems(canvasElement, expectedFormItems);
  await userEvent.click(canvas.getByTestId("input"));
  await userEvent.paste(
    JSON.stringify([
      "testInput",
      { name: "testInput2", label: "Test Input", initialValue: "hello" },
    ])
  );
  await userEvent.click(canvas.getByText("Update form"));
  expectedFormItems[0].name = "testInput2";
  await sleep(500);
  await checkFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );

  await sleep(100);
  await checkFormItems(canvasElement, expectedFormItems);
  await userEvent.click(canvas.getByTestId("input"));
  await userEvent.paste(
    JSON.stringify([
      "testInput2",
      {
        name: "testInput3",
        label: "Test Input",
        initialValue: 123,
        inputType: InputType.Number,
      },
    ])
  );
  await userEvent.click(canvas.getByText("Update form"));
  expectedFormItems[0].name = "testInput3";
  expectedFormItems[0].initialValue = 123;
  await sleep(500);
  await checkFormItems(canvasElement, expectedFormItems);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    getFormItemsValue(expectedFormItems)
  );
};

const _OnlySubmitMountedFields: StoryFn = (args: any) => {
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
      {
        path: "submitted",
        type: "private",
        variableType: "object",
      },
      {
        path: "input.value",
        type: "private",
        variableType: "text",
      },
    ],
    { $props: args }
  );
  const [formItems, setFormItems] = React.useState<SimplifiedFormItemsProp[]>([
    { label: "Field 1", name: "field1", inputType: InputType.Text },
    { label: "Field 2", name: "field2", inputType: InputType.Text },
  ]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          gap: 20,
        }}
      >
        <Input
          value={$state.input.value}
          onChange={(e) => ($state.input.value = e.target.value)}
          data-testid="input"
        />
        <Button
          onClick={() => {
            const [opName, formItem] = JSON.parse($state.input.value) as any;
            if (opName === "add") {
              setFormItems((items) => [...items, formItem]);
            } else if (opName === "delete") {
              setFormItems((items) =>
                items.filter((item) => item.name !== formItem.name)
              );
            } else {
              setFormItems((items) =>
                items.map((item) => {
                  if (item.name !== opName) {
                    return item;
                  } else {
                    return {
                      ...item,
                      ...formItem,
                    };
                  }
                })
              );
            }
            $state.input.value = "";
          }}
        >
          Update form
        </Button>
      </div>
      <PlasmicCanvasProvider>
        <Form
          extendedOnValuesChange={(values) => ($state.form.value = values)}
          onFinish={(values) => ($state.submitted = values)}
          mode="simplified"
          submitSlot={<SubmitSlot />}
          colon={false}
          formItems={formItems}
          initialValues={{
            field1: "hello",
            field3: "world",
          }}
        />
      </PlasmicCanvasProvider>
      <p data-testid="value">{JSON.stringify($state.form.value)}</p>
      <p data-testid="submitted">{JSON.stringify($state.submitted)}</p>
    </div>
  );
};

export const OnlySubmitMountedFields = _OnlySubmitMountedFields.bind({});
OnlySubmitMountedFields.tags = ["skip-test"]; // simplified forms broken?
OnlySubmitMountedFields.args = {};
OnlySubmitMountedFields.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  const expectedValue: Record<string, any> = {
    field1: "hello",
    field3: "world",
  };
  const expectedSubmitted: Record<string, any> = { field1: "hello" };
  let expectedFormItems: SimplifiedFormItemsProp[] = [
    {
      label: "Field 1",
      name: "field1",
      inputType: InputType.Text,
      initialValue: "hello",
    },
    {
      label: "Field 2",
      name: "field2",
      inputType: InputType.Text,
    },
  ];
  await sleep(100);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValue)
  );
  await checkFormItems(canvasElement, expectedFormItems);

  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    JSON.stringify(expectedSubmitted)
  );

  // add new field
  const newField: SimplifiedFormItemsProp & { name: string } = {
    name: "testInput",
    label: "Test Input",
    inputType: InputType.Number,
    initialValue: 123,
  };
  await userEvent.click(canvas.getByTestId("input"));
  await userEvent.paste(JSON.stringify(["add", newField]));
  await userEvent.click(canvas.getByText("Update form"));

  expectedValue[newField.name] = newField.initialValue;
  expectedSubmitted[newField.name] = newField.initialValue;
  expectedFormItems.push(newField);

  await sleep(100);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValue)
  );
  await checkFormItems(canvasElement, expectedFormItems);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    JSON.stringify(expectedSubmitted)
  );

  // add delete field
  // submitted and value states shouldn't change
  await userEvent.click(canvas.getByTestId("input"));
  await userEvent.paste(JSON.stringify(["delete", newField]));
  await userEvent.click(canvas.getByText("Update form"));
  expectedFormItems = expectedFormItems.slice(0, 2);
  await sleep(100);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValue)
  );
  await checkFormItems(canvasElement, expectedFormItems);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    JSON.stringify(expectedSubmitted)
  );

  // add it back
  await userEvent.click(canvas.getByTestId("input"));
  await userEvent.paste(JSON.stringify(["add", newField]));
  await userEvent.click(canvas.getByText("Update form"));
  expectedFormItems.push(newField);
  await sleep(100);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValue)
  );
  await checkFormItems(canvasElement, expectedFormItems);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    JSON.stringify(expectedSubmitted)
  );

  // mark field to not preserve
  await userEvent.click(canvas.getByTestId("input"));
  await userEvent.paste(JSON.stringify([newField.name, { preserve: false }]));
  await userEvent.click(canvas.getByText("Update form"));

  // add delete field
  // submitted and value states shouldn't change
  await userEvent.click(canvas.getByTestId("input"));
  await userEvent.paste(JSON.stringify(["delete", newField]));
  await userEvent.click(canvas.getByText("Update form"));
  expectedFormItems = expectedFormItems.slice(0, 2);
  delete expectedSubmitted[newField.name];
  await sleep(100);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValue)
  );
  await checkFormItems(canvasElement, expectedFormItems);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    JSON.stringify(expectedSubmitted)
  );

  expectedFormItems[0].initialValue = "abc";
  expectedValue["field1"] = expectedFormItems[0].initialValue;
  delete expectedValue[newField.name];
  await modifyFormItems(canvasElement, [expectedFormItems[0]]);
  await sleep(100);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValue)
  );
  await checkFormItems(canvasElement, expectedFormItems);
};

const _TestFormList: StoryFn = (args: any) => {
  const refsRef = React.useRef<{ form?: FormListOperation | null }>({});
  const $refs = refsRef.current;
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
    ],
    { $props: args, $refs }
  );
  const [withDefault, setWithDefault] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {JSON.stringify(withDefault)}
      <PlasmicCanvasProvider>
        <div>
          <AntdCheckbox
            checked={withDefault}
            onChange={(v) => setWithDefault(v)}
          />{" "}
          Add new form item with default value
        </div>
        <Form
          extendedOnValuesChange={(values) => ($state.form.value = values)}
          submitSlot={<SubmitSlot />}
          colon={false}
        >
          <FormListWrapper
            name="guests"
            initialValue={[
              { firstName: "Jane", lastName: "Doe" },
              { firstName: "John", lastName: "Smith" },
            ]}
            ref={(ref) => ($refs["form"] = ref)}
          >
            <DataCtxReader>
              {($ctx) => (
                <>
                  <FormItem name="firstName" label="First Name">
                    <Input />
                  </FormItem>
                  <FormItem name="lastName" label="Last Name">
                    <Input />
                  </FormItem>
                  <Button
                    onClick={() => $refs.form?.remove($ctx?.currentFieldIndex)}
                  >
                    Remove {$ctx?.currentFieldIndex}
                  </Button>
                </>
              )}
            </DataCtxReader>
          </FormListWrapper>
          <br />
          <Button
            onClick={() =>
              $refs.form?.add(
                withDefault
                  ? {
                      firstName: "Foo",
                      lastName: "Bar",
                    }
                  : {}
              )
            }
          >
            Add item
          </Button>
        </Form>
      </PlasmicCanvasProvider>
      <p data-testid="value">{JSON.stringify($state.form.value)}</p>
    </div>
  );
};

export const TestFormList = _TestFormList.bind({});
TestFormList.args = {};
TestFormList.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  let expectedValues = [
    { firstName: "Jane", lastName: "Doe" },
    { firstName: "John", lastName: "Smith" },
  ];
  const getExpectedFormItems = () => {
    return expectedValues.flatMap(
      (listItem, i) =>
        [
          {
            label: "First Name",
            initialValue: listItem.firstName,
            name: ["guests", i, "firstName"].join("_"),
          },
          {
            label: "Last Name",
            initialValue: listItem.lastName,
            name: ["guests", i, "lastName"].join("_"),
          },
        ] as SimplifiedFormItemsProp[]
    );
  };

  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValues)
  );
  await checkFormItems(canvasElement, getExpectedFormItems());

  await userEvent.click(canvas.getByText("Add item"));
  expectedValues.push({} as any);

  await sleep(500);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValues)
  );
  await checkFormItems(canvasElement, getExpectedFormItems());

  await userEvent.click(canvas.getByText("Remove 0"));
  expectedValues = expectedValues.slice(1);

  await sleep(500);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValues)
  );
  await checkFormItems(canvasElement, getExpectedFormItems());

  await userEvent.click(canvas.getByRole("checkbox"));
  await userEvent.click(canvas.getByText("Add item"));
  expectedValues.push({ firstName: "Foo", lastName: "Bar" });

  await sleep(500);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValues)
  );
  await checkFormItems(canvasElement, getExpectedFormItems());

  const expectedFormItems = getExpectedFormItems();
  for (const formItem of expectedFormItems) {
    formItem.initialValue += "a";
  }
  for (const formItem of expectedValues) {
    formItem.firstName += "a";
    formItem.lastName += "a";
  }
  await modifyFormItems(canvasElement, expectedFormItems);
  await sleep(500);
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    JSON.stringify(expectedValues)
  );
  await checkFormItems(canvasElement, getExpectedFormItems());
};

const _DisableMultipleSubmissions: StoryFn = (args: any) => {
  const refsRef = React.useRef<{ form?: FormListOperation | null }>({});
  const $refs = refsRef.current;
  const $state = useDollarState(
    [
      {
        path: "form.value",
        type: "private",
        variableType: "object",
      },
      {
        path: "submittedData",
        type: "private",
        variableType: "object",
      },
      {
        path: "count",
        type: "private",
        variableType: "number",
        initVal: 0,
      },
      {
        path: "isDisabled",
        type: "private",
        variableType: "boolean",
        initVal: false,
      },
    ],
    { $props: args, $refs }
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Button onClick={() => ($state.isDisabled = !$state.isDisabled)}>
        Toggle "Disable Multiple Submissions"
      </Button>
      <p>Is disabled: {$state.isDisabled ? "true" : "false"}</p>
      <p>Active submissions: {$state.count}</p>
      <Form
        extendedOnValuesChange={(values) => ($state.form.value = values)}
        colon={false}
        onFinish={async () => {
          $state.count++;
          await new Promise((r) => setTimeout(r, 2000));
          $state.count = 0;
        }}
        autoDisableWhileSubmitting={$state.isDisabled}
      >
        <FormItem label={<p>Text Field</p>} name="textField">
          <Input />
        </FormItem>
        <FormItem label={<p>Text Area</p>} name="textAreaField">
          <TextArea />
        </FormItem>
        <div
          style={{
            display: "flex",
            gap: "20px",
          }}
        >
          <Button htmlType="submit">Submit</Button>
          <button type="submit">Native HTML Submit</button>
        </div>
      </Form>
    </div>
  );
};

export const DisableMultipleSubmissions = _DisableMultipleSubmissions.bind({});
DisableMultipleSubmissions.args = {};
DisableMultipleSubmissions.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await expect(canvas.getByText("Active submissions: 0")).toBeInTheDocument();

  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByText("Active submissions: 3")).toBeInTheDocument();

  await sleep(2000);
  await expect(canvas.getByText("Active submissions: 0")).toBeInTheDocument();

  await userEvent.click(
    canvas.getByText(`Toggle "Disable Multiple Submissions"`)
  );
  await sleep(100);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByText("Submit").parentNode).toBeDisabled();
};
