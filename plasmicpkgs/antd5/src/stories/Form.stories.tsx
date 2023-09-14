import { StoryFn } from "@storybook/react";
import React from "react";
import {
  FormWrapper as Form,
  FormItemWrapper as FormItem,
  InputType,
  SimplifiedFormItemsProp,
} from "../registerForm";
import { Button, Checkbox, Input, InputNumber } from "antd";
import TextArea, { TextAreaRef } from "antd/es/input/TextArea";
import { Select } from "antd/lib";
import { useDollarState } from "@plasmicapp/react-web";
import {
  userEvent,
  within,
  queryByAttribute,
  screen,
} from "@storybook/testing-library";
import { expect } from "@storybook/jest";

export default {
  title: "Form",
};

const deepClone = function <T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ExtendedSimplifiedFormItemsProp extends SimplifiedFormItemsProp {
  selectedLabel?: string;
}

const ALL_FORM_ITEMS_TYPE: ExtendedSimplifiedFormItemsProp[] = [
  {
    name: "textField",
    label: "Text Field",
    inputType: InputType.Text,
    initialValue: "text",
  },
  {
    name: "textAreaField",
    label: "Text Area Field",
    inputType: InputType.TextArea,
    initialValue: "textarea",
  },
  {
    name: "numberField",
    label: "Number Field",
    inputType: InputType.Number,
    initialValue: "123",
  },
  {
    name: "passwordField",
    label: "Password Field",
    inputType: InputType.Password,
    initialValue: "password",
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
  },
  {
    name: "checkboxField",
    label: "Checkbox Field",
    inputType: InputType.Checkbox,
    initialValue: true,
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
  },
];

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
        submitSlot={<Button type="primary">Submit</Button>}
      />
      <p>{JSON.stringify($state.form.value)}</p>
    </div>
  );
};

export const SimplifiedForm = _SimplifiedForm.bind({});
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
        submitSlot={
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        }
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
      await expect(optionDom).toBeInTheDocument();
      await expect(optionDom).toHaveTextContent(formItem.initialValue);
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
      await expect(dom).toHaveValue(`${formItem.initialValue}`);
    }
  }
};

const modifyFormItems = async (
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
      await userEvent.type(dom, `{selectall}{del}${formItem.initialValue}`);
    }
  }
};

const getFormItemsValue = (
  expectedFormItems: ExtendedSimplifiedFormItemsProp[]
) => {
  return Object.fromEntries(
    expectedFormItems
      .filter((formItem) => formItem.initialValue != null)
      .map((formItem) => [formItem.name, formItem.initialValue])
  );
};

TestSimplifiedForm.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  let expectedFormItems = deepClone(ALL_FORM_ITEMS_TYPE);

  await checkFormItems(canvasElement, expectedFormItems);

  (expectedFormItems[0].initialValue = "foo"),
    // test state is updating properly
    await modifyFormItems(canvasElement, expectedFormItems.slice(0, 1));
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    `Value: ${JSON.stringify(getFormItemsValue(expectedFormItems))}`
  );

  (expectedFormItems[1].initialValue = "bar"),
    (expectedFormItems[2].initialValue = 456),
    await modifyFormItems(canvasElement, expectedFormItems.slice(1, 3));
  await expect(canvas.getByTestId("value")).toHaveTextContent(
    `Value: ${JSON.stringify(getFormItemsValue(expectedFormItems))}`
  );

  await checkFormItems(canvasElement, expectedFormItems);

  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    `Submitted: ${JSON.stringify(getFormItemsValue(expectedFormItems))}`
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
  await userEvent.type(canvas.getByTestId("formItems"), `{selectall}{del}`);
  await userEvent.paste(
    canvas.getByTestId("formItems"),
    JSON.stringify(expectedFormItems)
  );
  await userEvent.click(canvas.getByText("Update form"));
  await checkFormItems(canvasElement, expectedFormItems);

  (expectedFormItems[2].initialValue = "opt3"),
    (expectedFormItems[2].selectedLabel = "Opt 3"),
    await modifyFormItems(canvasElement, expectedFormItems.slice(2, 3));

  await expect(canvas.getByTestId("value")).toHaveTextContent(
    `Value: ${JSON.stringify(getFormItemsValue(expectedFormItems))}`
  );
  await checkFormItems(canvasElement, expectedFormItems);
  await userEvent.click(canvas.getByText("Submit"));
  await sleep(100);
  await expect(canvas.getByTestId("submitted")).toHaveTextContent(
    `Submitted: ${JSON.stringify(getFormItemsValue(expectedFormItems))}`
  );
};
