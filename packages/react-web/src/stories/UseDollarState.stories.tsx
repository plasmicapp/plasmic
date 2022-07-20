import { expect } from "@storybook/jest";
import { Story } from "@storybook/react";
import { userEvent, within } from "@storybook/testing-library";
import React from "react";
import useDollarState from "../states";

export default {
  title: "UseDollarState",
};

interface CounterArgs {
  stateType?: "private" | "readonly" | "writable";
  showCount?: boolean;
  onChange?: (val: number) => void;
  initCount?: number;
  useInitalFunction?: boolean;
}
const Counter: Story<CounterArgs> = (args) => {
  const {
    stateType = "private" as const,
    showCount = true,
    useInitalFunction,
  } = args;

  const $state = useDollarState(
    [
      {
        path: "count",
        type: stateType,
        ...(stateType !== "writable"
          ? {
              ...(useInitalFunction
                ? { initFunc: ($props) => $props.initCount ?? 0 }
                : { initVal: 0 }),
            }
          : {}),
        ...(stateType !== "private"
          ? {
              onChangeProp: "onChange",
            }
          : {}),
        ...(stateType === "writable"
          ? {
              valueProp: "initCount",
            }
          : {}),
      },
    ],
    args
  );

  return (
    <div>
      <button
        onClick={() => {
          $state.count = $state.count + 1;
        }}
        data-testid="counter-btn"
      >
        Counter Increment
      </button>
      {showCount && <p>Counter: {$state.count}</p>}
    </div>
  );
};

const ParentCounter: Story<{
  counterStateType?: "readonly" | "writable";
}> = (args) => {
  const { counterStateType = "readonly" } = args;

  const $state = useDollarState(
    [
      {
        path: "counter.count",
        type: "private",
        initVal: 0,
      },
    ],
    args
  );

  return (
    <div>
      <Counter
        stateType={counterStateType}
        onChange={(val) => ($state.counter.count = val)}
        {...(counterStateType === "writable"
          ? { initCount: $state.counter.count }
          : {})}
      />
      <p>ParentCounter: {$state.counter.count}</p>
      <button
        onClick={() => ($state.counter.count += 1)}
        data-testid="parent-counter-btn"
      >
        ParentCounter Increment
      </button>
    </div>
  );
};

export const PrivateCounter = Counter.bind({});
PrivateCounter.args = {
  stateType: "private",
  showCount: true,
};
PrivateCounter.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button"));

  await expect(canvas.getByText("Counter: 1")).toBeInTheDocument();
};

export const ReadonlyCounter = ParentCounter.bind({});
ReadonlyCounter.args = {
  counterStateType: "readonly",
};
ReadonlyCounter.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByTestId("counter-btn"));
  await expect(canvas.getByText("Counter: 1")).toBeInTheDocument();
  await expect(canvas.getByText("ParentCounter: 1")).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("parent-counter-btn"));
  //Readonly state shouldn't change the implicit state
  await expect(canvas.getByText("Counter: 1")).toBeInTheDocument();
  await expect(canvas.getByText("ParentCounter: 2")).toBeInTheDocument();
};

export const WritableCounter = ParentCounter.bind({});
WritableCounter.args = {
  counterStateType: "writable",
};
WritableCounter.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByTestId("counter-btn"));
  await expect(canvas.getByText("Counter: 1")).toBeInTheDocument();
  await expect(canvas.getByText("ParentCounter: 1")).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("parent-counter-btn"));
  await expect(canvas.getByText("Counter: 2")).toBeInTheDocument();
  await expect(canvas.getByText("ParentCounter: 2")).toBeInTheDocument();
};

const _DynamicInitCount: Story = (args) => {
  const $state = useDollarState(
    [
      {
        path: "initCount",
        type: "private",
        initVal: 0,
      },
      {
        path: "counter.count",
        type: "private",
        initVal: 0,
      },
    ],
    args
  );

  return (
    <div>
      <button
        onClick={() => ($state.initCount = $state.initCount + 1)}
        data-testid={"init-count-btn"}
      >
        Bump initCount
      </button>
      <Counter
        initCount={$state.initCount}
        onChange={(count) => ($state.counter.count = count)}
        showCount={false}
        stateType={"readonly"}
        useInitalFunction={true}
      />
      <div>Current count: {$state.counter.count}</div>
    </div>
  );
};

export const DynamicInitCount = _DynamicInitCount.bind({});
DynamicInitCount.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByTestId("counter-btn"));
  await userEvent.click(canvas.getByTestId("counter-btn"));
  await expect(canvas.getByText("Current count: 2")).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("init-count-btn"));
  await expect(canvas.getByText("Current count: 1")).toBeInTheDocument();
  await userEvent.click(canvas.getByTestId("counter-btn"));
  await userEvent.click(canvas.getByTestId("counter-btn"));
  await expect(canvas.getByText("Current count: 3")).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("init-count-btn"));
  await expect(canvas.getByText("Current count: 2")).toBeInTheDocument();
};

function TextInput(props: {
  value: string | undefined;
  onChange: (val: string) => void;
  "data-testid": string;
}) {
  const $state = useDollarState(
    [
      {
        path: "value",
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
      },
    ],
    props
  );
  return (
    <input
      value={$state.value}
      onChange={(event) => ($state.value = event.target.value)}
      data-testid={props["data-testid"]}
    />
  );
}

function PeopleList(props: {
  data: { firstName: string; lastName: string }[];
  onIndexSelected: (index: number) => void;
}) {
  const $state = useDollarState(
    [
      {
        path: "selectedIndex",
        type: "readonly",
        onChangeProp: "onIndexSelected",
      },
    ],
    props
  );
  return (
    <ul>
      {props.data.map((datum, index) => (
        <li
          style={{
            fontWeight: index === $state.selectedIndex ? "bold" : "normal",
          }}
          key={index}
          onClick={() => ($state.selectedIndex = index)}
          data-testid={`people_${index}`}
        >
          {datum.firstName} {datum.lastName}
        </li>
      ))}
    </ul>
  );
}

const _ResetInput: Story<{
  peopleList: { firstName: string; lastName: string }[];
}> = (args) => {
  const $state = useDollarState(
    [
      {
        path: "peopleList",
        type: "private",
        initFunc: ($props) => $props.peopleList,
      },
      {
        path: "list.selectedIndex",
        type: "private",
      },
      {
        path: "textInputFirstName.value",
        initFunc: (_$props, $state) =>
          // user-defined
          $state.list.selectedIndex == null
            ? undefined
            : $state.peopleList[$state.list.selectedIndex].firstName,
        type: "private",
      },
      {
        path: "textInputLastName.value",
        initFunc: (_$props, $state) =>
          $state.list.selectedIndex == null
            ? undefined
            : $state.peopleList[$state.list.selectedIndex].lastName,
        type: "private",
      },
      {
        path: "textInputUpper.value",
        initFunc: (_$props, $state) =>
          $state.textInputFirstName.value?.toUpperCase(),
        type: "private",
      },
    ],
    args
  );

  return (
    <div>
      <PeopleList
        data={$state.peopleList ?? []}
        onIndexSelected={(x) => ($state.list.selectedIndex = x)}
      />
      <div>
        <TextInput
          value={$state.textInputFirstName.value}
          onChange={(val) => ($state.textInputFirstName.value = val)}
          data-testid={"textInputFirstName"}
        />
        <TextInput
          value={$state.textInputLastName.value}
          onChange={(val) => ($state.textInputLastName.value = val)}
          data-testid={"textInputLastName"}
        />
        <TextInput
          value={$state.textInputUpper.value}
          onChange={(val) => ($state.textInputUpper.value = val)}
          data-testid={"textInputUpper"}
        />
      </div>
      <button
        onClick={() => {
          $state.peopleList[$state.list.selectedIndex] = {
            firstName: $state.textInputFirstName.value,
            lastName: $state.textInputLastName.value,
          };
          $state.peopleList = [...$state.peopleList];
        }}
      >
        Submit
      </button>
    </div>
  );
};

const peopleList = [
  {
    firstName: "Jonny",
    lastName: "Greenwood",
  },
  {
    firstName: "Thom",
    lastName: "Yorke",
  },
  {
    firstName: "Colin",
    lastName: "Greenwood",
  },
];
export const ResetInput = _ResetInput.bind({});
ResetInput.args = { peopleList: [...peopleList] };
ResetInput.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByTestId("people_0"));
  await userEvent.type(canvas.getByTestId("textInputFirstName"), "abc");
  await expect(
    (canvas.getByTestId("textInputUpper") as HTMLInputElement).value
  ).toEqual(`${peopleList[0].firstName}ABC`.toUpperCase());

  await userEvent.click(canvas.getByTestId("people_0"));
  await expect(
    (canvas.getByTestId("textInputUpper") as HTMLInputElement).value
  ).toEqual(`${peopleList[0].firstName}ABC`.toUpperCase());

  await userEvent.click(canvas.getByTestId("people_1"));
  await expect(
    (canvas.getByTestId("textInputFirstName") as HTMLInputElement).value
  ).toEqual(peopleList[1].firstName);

  await userEvent.type(canvas.getByTestId("textInputFirstName"), "abc");
  await userEvent.type(canvas.getByTestId("textInputLastName"), "def");
  await userEvent.click(canvas.getByRole("button"));
  await expect(
    (canvas.getByTestId("people_1") as HTMLLinkElement).textContent
  ).toEqual(`${peopleList[1].firstName}abc ${peopleList[1].lastName}def`);
};
