import { expect } from "@storybook/jest";
import { Story } from "@storybook/react";
import { userEvent, within } from "@storybook/testing-library";
import React from "react";
import { generateStateOnChangeProp, get, set, useDollarState } from "../states";
import { CyclicStatesReferencesError } from "../states/errors";
import { $StateSpec } from "../states/types";

const deepClone = function <T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  title: "UseDollarState",
};

interface CounterArgs {
  stateType?: "private" | "readonly" | "writable";
  showCount?: boolean;
  onChange?: (val: number) => void;
  initCount?: number;
  useInitalFunction?: boolean;
  "data-testid"?: string;
  title?: React.ReactNode;
}
const Counter: Story<CounterArgs> = (args) => {
  const {
    stateType = "private" as const,
    showCount = true,
    useInitalFunction,
    title,
  } = args;

  const $state = useDollarState(
    [
      {
        path: "count",
        type: stateType,
        ...(stateType !== "writable"
          ? {
              ...(useInitalFunction
                ? { initFunc: ({ $props }) => $props.initCount ?? 0 }
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
        variableType: "number",
      },
    ],
    {
      $props: args,
    }
  );
  return (
    <div>
      {title}
      <button
        onClick={() => ($state.count = $state.count + 1)}
        data-testid={
          "data-testid" in args ? `${args["data-testid"]}-btn` : "counter-btn"
        }
      >
        Counter Increment
      </button>
      {showCount && (
        <p
          data-testid={
            "data-testid" in args ? `${args["data-testid"]}-label` : "label-btn"
          }
        >
          Counter: {$state.count}
        </p>
      )}
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
        variableType: "number",
      },
    ],
    {
      $props: args,
    }
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
  await sleep(1);
  await expect(canvas.getByText("Counter: 1")).toBeInTheDocument();
};

export const ReadonlyCounter = ParentCounter.bind({});
ReadonlyCounter.args = {
  counterStateType: "readonly",
};
ReadonlyCounter.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await sleep(1);
  await userEvent.click(canvas.getByTestId("counter-btn"));
  await sleep(1);
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
  await sleep(1);
  await userEvent.click(canvas.getByTestId("counter-btn"));
  await sleep(1);
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
        variableType: "number",
      },
      {
        path: "counter.count",
        type: "private",
        initVal: 0,
        variableType: "number",
      },
    ],
    {
      $props: args,
    }
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
  await sleep(1);
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
  onBlur?: () => void;
  "data-testid"?: string;
}) {
  const $state = useDollarState(
    [
      {
        path: "value",
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
      },
    ],
    {
      $props: props,
    }
  );
  return (
    <input
      value={$state.value}
      onChange={(event) => ($state.value = event.target.value)}
      // onChange={props.onChange}
      onBlur={() => props.onBlur?.()}
      data-testid={props["data-testid"] ?? "text-input"}
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
        variableType: "number",
      },
    ],
    {
      $props: props,
    }
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
}> = (props) => {
  const $state = useDollarState(
    [
      {
        path: "peopleList",
        type: "private",
        initFunc: ({ $props }) => $props.peopleList,
        variableType: "array",
      },
      {
        path: "list.selectedIndex",
        type: "private",
        variableType: "number",
      },
      {
        path: "textInputFirstName.value",
        initFunc: ({ $state }) =>
          $state.list.selectedIndex == null
            ? ""
            : $state.peopleList[$state.list.selectedIndex].firstName,
        type: "private",
        variableType: "text",
      },
      {
        path: "textInputLastName.value",
        initFunc: ({ $state }) =>
          $state.list.selectedIndex == null
            ? ""
            : $state.peopleList[$state.list.selectedIndex].lastName,
        type: "private",
        variableType: "text",
      },
      {
        path: "textInputUpper.value",
        initFunc: ({ $state }) =>
          $state.textInputFirstName.value?.toUpperCase(),
        type: "private",
        variableType: "text",
      },
    ],
    {
      $props: props,
    }
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
          $state.peopleList[$state.list.selectedIndex].firstName =
            $state.textInputFirstName.value;
          $state.peopleList[$state.list.selectedIndex].lastName =
            $state.textInputLastName.value;
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
    nicknames: [],
  },
  {
    firstName: "Thom",
    lastName: "Yorke",
    nicknames: ["thomthom"],
  },
  {
    firstName: "Colin",
    lastName: "Greenwood",
    nicknames: ["lin", "rgb"],
  },
];
export const ResetInput = _ResetInput.bind({});
ResetInput.args = { peopleList: deepClone(peopleList) };
ResetInput.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByTestId("people_0"));
  await sleep(1);
  await userEvent.type(canvas.getByTestId("textInputFirstName"), "abc");
  await expect(
    (canvas.getByTestId("textInputUpper") as HTMLInputElement).value
  ).toEqual(`${peopleList[0].firstName}ABC`.toUpperCase());

  // text input isn't updated after clicking on the same item
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

const getAllSubsets = (set: number[]) =>
  set.reduce(
    (subsets, value) => [...subsets, ...subsets.map((set) => [...set, value])],
    [[]] as number[][]
  );

const _RepeatedStates: Story<{
  size: number;
}> = (args) => {
  const set = [...Array(args.size).keys()];
  const subsets = getAllSubsets(set)
    .sort((a, b) => a.length - b.length)
    .filter((set) => set.length);
  const $state = useDollarState(
    [
      {
        path: "counter[].count",
        type: "private",
        initVal: 0,
        variableType: "number",
      },
      ...subsets.map(
        (set, i) =>
          ({
            path: `test${i}.count`,
            type: "private",
            initFunc: ({ $state }) =>
              set.reduce((acc, el) => acc + $state.counter[el].count, 0),
            variableType: "number",
          } as $StateSpec<any>)
      ),
    ],
    {
      $props: args,
    }
  );

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridColumnGap: "10px",
          gridRowGap: "30px",
        }}
      >
        {set.map((idx) => (
          <Counter
            key={idx}
            title={<p>{`counter[${idx}]`}</p>}
            stateType="readonly"
            onChange={(val) => ($state.counter[idx].count = val)}
            data-testid={`counter[${idx}]`}
          />
        ))}
        {subsets.map((set, i) => (
          <Counter
            key={i}
            title={<p>= {set.map((el) => `counter[${el}]`).join(" + ")}</p>}
            stateType="writable"
            initCount={$state[`test${i}`].count}
            onChange={(val) => ($state[`test${i}`].count = val)}
            data-testid={`test${i}`}
          />
        ))}
      </div>
    </div>
  );
};

const click = async (el: HTMLElement, count: number = 1) => {
  while (count--) {
    await userEvent.click(el);
  }
};

export const RepeatedStates = _RepeatedStates.bind({});
RepeatedStates.args = { size: 3 };
RepeatedStates.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await sleep(1);
  const expectedCount = [1, 2, 4];
  for (let i = 0; i < expectedCount.length; i++) {
    await click(canvas.getByTestId(`counter[${i}]-btn`), expectedCount[i]);
  }

  for (let i = 0; i < expectedCount.length; i++) {
    await expect(
      (canvas.getByTestId(`counter[${i}]-label`) as HTMLParagraphElement)
        .textContent
    ).toEqual(`Counter: ${expectedCount[i]}`);
  }

  const subsets = getAllSubsets([0, 1, 2])
    .sort((a, b) => a.length - b.length)
    .filter((set) => set.length);
  for (let i = 0; i < subsets.length; i++) {
    await expect(
      (canvas.getByTestId(`test${i}-label`) as HTMLParagraphElement).textContent
    ).toEqual(
      `Counter: ${subsets[i].reduce((acc, el) => acc + expectedCount[el], 0)}`
    );
  }
};

const _NestedRepeatedCounter: Story<{}> = () => {
  const Parent = React.useCallback(
    (args: {
      grandParentIndex: number;
      onChange: (newVal: number[]) => void;
      initCount: any;
    }) => {
      const { grandParentIndex } = args;
      const $state = useDollarState(
        [
          {
            path: "counter[].count",
            type: "private",
            variableType: "number",
          },
        ],
        {
          $props: args,
        }
      );
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gridColumnGap: "10px",
            gridRowGap: "30px",
          }}
        >
          {[0, 1, 2].map((index) => {
            $state.registerInitFunc?.(
              "counter[].count",
              () => args.initCount[index],
              [index]
            );
            return (
              <div key={index}>
                <Counter
                  data-testid={`counter[${grandParentIndex}][${index}]`}
                  title={<p>{`counter[${grandParentIndex}][${index}]`}</p>}
                  stateType="writable"
                  onChange={(val) => {
                    $state.counter[index].count = val;
                    args.onChange($state.counter.map((c: any) => c.count));
                  }}
                  initCount={$state.counter[index].count}
                />
                <span
                  data-testid={`parentLabel[${grandParentIndex}][${index}]`}
                >{`parentCounter: ${$state.counter[index].count}`}</span>
              </div>
            );
          })}
        </div>
      );
    },
    []
  );
  const GrandParent = React.useCallback((args: {}) => {
    const $state = useDollarState(
      [
        {
          path: "counters",
          type: "private",
          initFunc: () => [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          variableType: "array",
        },
      ],
      {
        $props: args,
      }
    );
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          rowGap: "25px",
        }}
      >
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <Parent
              grandParentIndex={index}
              onChange={(val) => ($state.counters[index] = val)}
              initCount={$state.counters[index]}
            />
          </div>
        ))}
        <div>
          {[0, 1].map((idx) => (
            <select
              key={idx}
              id={`select_${idx}`}
              data-testid={`select_${idx}`}
            >
              {[0, 1, 2].map((idx2) => (
                <option key={idx2} value={idx2}>
                  {idx2}
                </option>
              ))}
            </select>
          ))}
          <button
            onClick={() => {
              const selector = [
                +(document.getElementById("select_0") as HTMLSelectElement)!
                  .value,
                +(document.getElementById("select_1") as HTMLSelectElement)!
                  .value,
              ];
              $state.counters[selector[0]][selector[1]]++;
            }}
            data-testid="increment-btn"
          >
            Increment
          </button>
          <br />
          <button
            data-testid="clear-btn"
            onClick={() =>
              [0, 1, 2].map((i: any) =>
                [0, 1, 2].map((j: any) => ($state.counters[i][j] = 0))
              )
            }
          >
            Clear all
          </button>
        </div>
      </div>
    );
  }, []);

  return <GrandParent />;
};
export const NestedRepeatedCounter = _NestedRepeatedCounter.bind({});
NestedRepeatedCounter.args = {};
NestedRepeatedCounter.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await sleep(1);

  const expected = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      expected.push(i * 3 + j + 1);
      await click(
        canvas.getByTestId(`counter[${i}][${j}]-btn`),
        expected.slice(-1)[0]
      );
      await expect(
        (
          canvas.getByTestId(
            `counter[${i}][${j}]-label`
          ) as HTMLParagraphElement
        ).textContent
      ).toEqual(`Counter: ${expected.slice(-1)[0]}`);
      await expect(
        (canvas.getByTestId(`parentLabel[${i}][${j}]`) as HTMLParagraphElement)
          .textContent
      ).toEqual(`parentCounter: ${expected.slice(-1)[0]}`);
    }
  }

  await userEvent.click(canvas.getByTestId("clear-btn"));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      await expect(
        (
          canvas.getByTestId(
            `counter[${i}][${j}]-label`
          ) as HTMLParagraphElement
        ).textContent
      ).toEqual(`Counter: 0`);
      await expect(
        (canvas.getByTestId(`parentLabel[${i}][${j}]`) as HTMLParagraphElement)
          .textContent
      ).toEqual(`parentCounter: 0`);
    }
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      await userEvent.selectOptions(canvas.getByTestId("select_0"), [`${i}`]);
      await userEvent.selectOptions(canvas.getByTestId("select_1"), [`${j}`]);
      await click(canvas.getByTestId(`increment-btn`), expected[i * 3 + j]);
      await expect(
        (
          canvas.getByTestId(
            `counter[${i}][${j}]-label`
          ) as HTMLParagraphElement
        ).textContent
      ).toEqual(`Counter: ${expected[i * 3 + j]}`);
      await expect(
        (canvas.getByTestId(`parentLabel[${i}][${j}]`) as HTMLParagraphElement)
          .textContent
      ).toEqual(`parentCounter: ${expected[i * 3 + j]}`);
    }
  }
};

const _MatrixRepeatedCounter: Story<{}> = () => {
  const $state = useDollarState(
    [
      {
        path: "counter[][].count",
        type: "private",
        initFunc: () => 0,
        variableType: "number",
      },
    ],
    {
      $props: {},
    }
  );
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridRowGap: "20px",
        gridColumnGap: "20px",
      }}
    >
      {[0, 1, 2].flatMap((i) =>
        [0, 1, 2].map((j, _, arr) => (
          <Counter
            key={i * arr.length + j}
            stateType="writable"
            initCount={$state.counter[i][j].count}
            onChange={(val) => ($state.counter[i][j].count = val)}
            data-testid={`counter[${i}][${j}]`}
          />
        ))
      )}
      <div>
        {[0, 1].map((idx) => (
          <select key={idx} id={`select_${idx}`} data-testid={`select_${idx}`}>
            {[0, 1, 2].map((idx2) => (
              <option key={idx2} value={idx2}>
                {idx2}
              </option>
            ))}
          </select>
        ))}
        <button
          onClick={() => {
            const selector = [
              +(document.getElementById("select_0") as HTMLSelectElement)!
                .value,
              +(document.getElementById("select_1") as HTMLSelectElement)!
                .value,
            ];
            $state.counter[selector[0]][selector[1]].count += 1;
          }}
          data-testid="increment-btn"
        >
          Increment
        </button>
        <br />
        <button
          data-testid="clear-btn"
          onClick={() =>
            [0, 1, 2].map((i: any) =>
              [0, 1, 2].map((j: any) => ($state.counter[i][j].count = 0))
            )
          }
        >
          Clear all
        </button>
      </div>
    </div>
  );
};
export const MatrixRepeatedCounter = _MatrixRepeatedCounter.bind({});
MatrixRepeatedCounter.args = {};
MatrixRepeatedCounter.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await sleep(1);

  const expected = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      expected.push(i * 3 + j + 1);
      await click(
        canvas.getByTestId(`counter[${i}][${j}]-btn`),
        expected.slice(-1)[0]
      );
      await expect(
        (
          canvas.getByTestId(
            `counter[${i}][${j}]-label`
          ) as HTMLParagraphElement
        ).textContent
      ).toEqual(`Counter: ${expected.slice(-1)[0]}`);
    }
  }

  await userEvent.click(canvas.getByTestId("clear-btn"));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      await expect(
        (
          canvas.getByTestId(
            `counter[${i}][${j}]-label`
          ) as HTMLParagraphElement
        ).textContent
      ).toEqual(`Counter: 0`);
    }
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      await userEvent.selectOptions(canvas.getByTestId("select_0"), [`${i}`]);
      await userEvent.selectOptions(canvas.getByTestId("select_1"), [`${j}`]);
      await click(canvas.getByTestId(`increment-btn`), expected[i * 3 + j]);
      await expect(
        (
          canvas.getByTestId(
            `counter[${i}][${j}]-label`
          ) as HTMLParagraphElement
        ).textContent
      ).toEqual(`Counter: ${expected[i * 3 + j]}`);
    }
  }
};

const _InitFuncFromInternalContextData: Story<{
  products: { price: number; name: string }[];
}> = (args) => {
  const ProductContext = React.useMemo(
    () =>
      React.createContext<
        | {
            price: number;
            name: string;
          }
        | undefined
      >(undefined),
    []
  );
  const InternalComponent = React.useCallback(
    (props: { quantity: number; onProductChange: (product: any) => void }) => {
      const $state = useDollarState(
        [
          {
            path: "price",
            type: "private",
            initFunc: ({ $state, $props }) =>
              $props.quantity * ($state.product?.price ?? 0),
            variableType: "number",
          },
          {
            path: "product",
            type: "readonly",
            onChangeProp: "onProductChange",
            variableType: "object",
          },
        ],
        {
          $props: props,
        }
      );
      return (
        <>
          <ProductContext.Consumer>
            {($ctx) => {
              $state.registerInitFunc?.("product", () => $ctx);
              return (
                <>
                  <p data-testid="product_price">Price: {$state.price}</p>
                </>
              );
            }}
          </ProductContext.Consumer>
        </>
      );
    },
    []
  );

  const $state = useDollarState(
    [
      {
        path: "selectedIndex",
        type: "private",
        initVal: undefined,
        variableType: "number",
      },
      {
        path: "quantity",
        type: "private",
        initVal: 1,
        variableType: "number",
      },
      {
        path: "ctx.product",
        type: "private",
        variableType: "object",
      },
    ],
    {
      $props: args,
    }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ul>
        {args.products?.map((product, index) => (
          <li
            data-testid={`product_${index}`}
            key={index}
            onClick={() => ($state.selectedIndex = index)}
          >
            {product.name}
          </li>
        ))}
      </ul>
      <h1 data-testid="product_name">{$state.ctx.product?.name}</h1>
      <ProductContext.Provider
        value={
          $state.selectedIndex !== undefined
            ? args.products[$state.selectedIndex]
            : undefined
        }
      >
        <InternalComponent
          quantity={$state.quantity}
          onProductChange={(val) => ($state.ctx.product = val)}
        />
      </ProductContext.Provider>
      <input
        data-testid="product_quantity-input"
        type="text"
        onChange={(e) => ($state.quantity = +e.target.value)}
        value={$state.quantity}
      />
    </div>
  );
};

const products = [
  { name: "Shirt 1", price: 10 },
  { name: "Shirt 2", price: 20 },
  { name: "Shirt 3", price: 30 },
];
export const InitFuncFromInternalContextData =
  _InitFuncFromInternalContextData.bind({});
InitFuncFromInternalContextData.args = { products };
InitFuncFromInternalContextData.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await sleep(1);

  for (let i = 0; i < products.length; i++) {
    await click(canvas.getByTestId(`product_${i}`));
    await expect(
      (canvas.getByTestId("product_name") as HTMLHeadingElement).textContent
    ).toEqual(products[i].name);
  }

  await userEvent.type(
    canvas.getByTestId("product_quantity-input"),
    "{backspace}10"
  );

  for (let i = 0; i < products.length; i++) {
    await click(canvas.getByTestId(`product_${i}`));
    expect(
      (canvas.getByTestId("product_price") as HTMLHeadingElement).textContent
    ).toEqual(`Price: ${products[i].price * 10}`);
  }
};

const _InitFuncFromRootContextData: Story<{
  products: { price: number; name: string }[];
}> = (args) => {
  const ProductContext = React.createContext<
    | {
        price: number;
        name: string;
      }
    | undefined
  >(undefined);
  const InternalComponent = (props: {
    quantity: number;
    onProductChange: (product: any) => void;
  }) => {
    const $ctx = React.useContext(ProductContext);
    const $state = useDollarState(
      [
        {
          path: "price",
          type: "private",
          initFunc: ({ $props, $ctx }) => $props.quantity * ($ctx.price ?? 0),
          variableType: "number",
        },
      ],
      {
        $props: props,
        $ctx: $ctx ?? {},
      }
    );
    return <p data-testid="product_price">Price: {$state.price}</p>;
  };

  const $state = useDollarState(
    [
      {
        path: "selectedIndex",
        type: "private",
        initVal: undefined,
        variableType: "number",
      },
      {
        path: "quantity",
        type: "private",
        initVal: 1,
        variableType: "number",
      },
      {
        path: "ctx.product",
        type: "private",
        variableType: "object",
      },
    ],
    {
      $props: args,
    }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ul>
        {args.products?.map((product, index) => (
          <li
            data-testid={`product_${index}`}
            key={index}
            onClick={() => ($state.selectedIndex = index)}
          >
            {product.name}
          </li>
        ))}
      </ul>
      <h1 data-testid="product_name">
        {args.products?.[$state.selectedIndex]?.name}
      </h1>
      <ProductContext.Provider
        value={
          $state.selectedIndex !== undefined
            ? args.products[$state.selectedIndex]
            : undefined
        }
      >
        <InternalComponent
          quantity={$state.quantity}
          onProductChange={(val) => ($state.ctx.product = val)}
        />
      </ProductContext.Provider>
      <input
        data-testid="product_quantity-input"
        type="text"
        onChange={(e) => ($state.quantity = +e.target.value)}
        value={$state.quantity}
      />
    </div>
  );
};

export const InitFuncFromRootContextData = _InitFuncFromRootContextData.bind(
  {}
);
InitFuncFromRootContextData.args = { products };
InitFuncFromRootContextData.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await sleep(1);

  for (let i = 0; i < products.length; i++) {
    await click(canvas.getByTestId(`product_${i}`));
    await expect(
      (canvas.getByTestId("product_name") as HTMLHeadingElement).textContent
    ).toEqual(products[i].name);
  }

  await userEvent.type(
    canvas.getByTestId("product_quantity-input"),
    "{backspace}10"
  );

  for (let i = 0; i < products.length; i++) {
    await click(canvas.getByTestId(`product_${i}`));
    await expect(
      (canvas.getByTestId("product_price") as HTMLHeadingElement).textContent
    ).toEqual(`Price: ${products[i].price * 10}`);
  }
};

const _InitFuncFromInternalContextDataWithDelay: Story<{
  products: { price: number; name: string }[];
}> = (args) => {
  const ProductContext = React.useMemo(
    () =>
      React.createContext<
        | {
            price: number;
            name: string;
          }
        | undefined
      >(undefined),
    []
  );
  const ProductBox = React.useCallback((props: any) => {
    const [data, setData] = React.useState<any>(undefined);
    React.useEffect(() => {
      setTimeout(() => {
        setData(products[0]);
      }, 1000);
    }, []);
    return (
      <div>
        <h1 data-testid="product-name">{data ? data.name : "Loading..."}</h1>
        <ProductContext.Provider value={data}>
          {props.children}
        </ProductContext.Provider>
      </div>
    );
  }, []);
  const $state = useDollarState(
    [
      {
        path: "counter.count",
        type: "private",
        variableType: "number",
      },
    ],
    {
      $props: args,
    }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ProductBox>
        <ProductContext.Consumer>
          {($ctx) => {
            $state.registerInitFunc?.("counter.count", () => $ctx?.price);
            return (
              <div>
                {(() => {
                  return (
                    <Counter
                      initCount={$state.counter.count}
                      onChange={(val) => ($state.counter.count = val)}
                      stateType={"writable"}
                    />
                  );
                })()}
              </div>
            );
          }}
        </ProductContext.Consumer>
      </ProductBox>
      <button onClick={() => ($state.counter.count = 0)}>Zero</button>
    </div>
  );
};
export const InitFuncFromInternalContextDataWithDelay =
  _InitFuncFromInternalContextDataWithDelay.bind({});
InitFuncFromInternalContextDataWithDelay.args = { products };
InitFuncFromInternalContextDataWithDelay.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  expect(
    (canvas.getByTestId("product-name") as HTMLHeadingElement).textContent
  ).toEqual("Loading...");
  expect(
    (canvas.getByTestId("label-btn") as HTMLHeadingElement).textContent
  ).toEqual("Counter: ");
  await new Promise((r) => setTimeout(r, 1500));
  expect(
    (canvas.getByTestId("product-name") as HTMLHeadingElement).textContent
  ).toEqual("Shirt 1");
  expect(
    (canvas.getByTestId("label-btn") as HTMLHeadingElement).textContent
  ).toEqual("Counter: 10");
};

const _RepeatedImplicitState: Story<{}> = (args) => {
  const $state = useDollarState(
    [
      {
        path: "counter[].count",
        type: "private",
        variableType: "number",
      },
      {
        path: "removeIndex",
        type: "private",
        initVal: 0,
        variableType: "number",
      },
      {
        path: "usedValuesCount",
        type: "private",
        initVal: 0,
        variableType: "number",
      },
    ],
    {
      $props: args,
    }
  );
  return (
    <div>
      <ul data-testid={"list"}>
        {$state.counter.map((currentItem: any, currentIndex: number) => (
          <li key={currentIndex} data-testid={`list-item-${currentItem.count}`}>
            {currentItem.count}
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          $state.counter.push({ count: $state.usedValuesCount });
          $state.usedValuesCount++;
        }}
        data-testid={"push-btn"}
      >
        AddItem using push
      </button>
      <button
        onClick={() => {
          $state.counter = [
            ...$state.counter,
            { count: $state.usedValuesCount },
          ];
          $state.usedValuesCount++;
        }}
        data-testid={"spread-btn"}
      >
        AddItem using spread operator
      </button>
      <input
        type="text"
        value={$state.removeIndex}
        onChange={(e) => ($state.removeIndex = +e.target.value)}
        data-testid={"remove-input"}
      />
      <button
        onClick={() => $state.counter.splice($state.removeIndex, 1)}
        data-testid={"remove-btn"}
      >
        Remove
      </button>
    </div>
  );
};
export const RepeatedImplicitState = _RepeatedImplicitState.bind({});
RepeatedImplicitState.args = {};
RepeatedImplicitState.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await click(canvas.getByTestId(`push-btn`), 3);
  await click(canvas.getByTestId(`spread-btn`), 3);

  const expected = [0, 1, 2, 3, 4, 5];
  await sleep(1);
  await expect(
    (canvas.getByTestId("list") as HTMLUListElement).children.length
  ).toEqual(expected.length);
  expected.forEach((val) =>
    expect(
      (canvas.getByTestId(`list-item-${val}`) as HTMLLIElement).textContent
    ).toEqual(`${val}`)
  );

  await click(canvas.getByTestId("remove-btn"));
  await userEvent.type(canvas.getByTestId("remove-input"), "2");
  await click(canvas.getByTestId("remove-btn"));

  expected.splice(0, 1);
  expected.splice(2, 1);
  await expect(
    (canvas.getByTestId("list") as HTMLUListElement).children.length
  ).toEqual(expected.length);
  expected.forEach((val) =>
    expect(
      (canvas.getByTestId(`list-item-${val}`) as HTMLLIElement).textContent
    ).toEqual(`${val}`)
  );

  await userEvent.type(canvas.getByTestId("remove-input"), "{backspace}3");
  await click(canvas.getByTestId("remove-btn"), 3);
  expected.splice(3, 1);
  expected.splice(3, 1);
  expected.splice(3, 1);
  expect(
    (canvas.getByTestId("list") as HTMLUListElement).children.length
  ).toEqual(expected.length);
  expected.forEach((val) =>
    expect(
      (canvas.getByTestId(`list-item-${val}`) as HTMLLIElement).textContent
    ).toEqual(`${val}`)
  );
};

interface Person {
  firstName: string;
  lastName: string;
  nicknames: string[];
}

const _FormBuilder: Story<{ people: Person[] }> = (props) => {
  const Nickname = React.useCallback(
    (props: {
      nickname: string;
      onChangeNickname: (nickname: string) => void;
      onDeleteNickname: () => void;
      "data-test-index": string;
    }) => {
      const $state = useDollarState(
        [
          {
            path: "nickname",
            type: "private",
            initFunc: ({ $props }) => $props.nickname,
            variableType: "text",
          },
        ],
        {
          $props: props,
        }
      );
      return (
        <div>
          <input
            type="text"
            value={$state.nickname}
            onChange={(e) => {
              $state.nickname = e.target.value;
              props.onChangeNickname($state.nickname);
            }}
            data-testid={`nickname-input${props["data-test-index"]}`}
          />
          <button
            onClick={() => props.onDeleteNickname()}
            data-testid={`remove-nickname-btn${props["data-test-index"]}`}
          >
            X
          </button>
        </div>
      );
    },
    []
  );

  const Person = React.useCallback(
    (props: {
      person: Person;
      onChangePerson: (person: Person) => void;
      onDeletePerson: () => void;
      "data-test-index": string;
    }) => {
      const $state = useDollarState(
        [
          {
            path: "nicknames",
            type: "private",
            initFunc: ({ $props }) => $props.person.nicknames,
            variableType: "array",
          },
          {
            path: "firstName",
            type: "private",
            initFunc: ({ $props }) => $props.person.firstName,
            variableType: "text",
          },
          {
            path: "lastName",
            type: "private",
            initFunc: ({ $props }) => $props.person.lastName,
            variableType: "text",
          },
        ],
        {
          $props: props,
        }
      );

      const onChangePersonHandler = (
        field: "firstName" | "lastName" | "nicknames"
      ) => {
        props.onChangePerson({
          ...props.person,
          [field]: $state[field],
        });
      };

      const mkDataTestIdAttr = (label: string) => ({
        "data-testid": `${label}${props["data-test-index"]}`,
      });

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderBottom: "1px solid #000",
          }}
        >
          <div>
            <label>First Name</label>
            <input
              type="text"
              value={$state.firstName}
              onChange={(e) => {
                $state.firstName = e.target.value;
                onChangePersonHandler("firstName");
              }}
              {...mkDataTestIdAttr("firstName-input")}
            />
          </div>
          <div>
            <label>Last Name</label>
            <input
              type="text"
              value={$state.lastName}
              onChange={(e) => {
                $state.lastName = e.target.value;
                onChangePersonHandler("lastName");
              }}
              {...mkDataTestIdAttr("lastName-input")}
            />
          </div>
          <div
            style={{
              display: "flex",
            }}
          >
            <label>Nicknames</label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              {$state.nicknames.map((nickname: any, i: number) => (
                <Nickname
                  key={i}
                  nickname={nickname}
                  onChangeNickname={(newNickname) => {
                    $state.nicknames[i] = newNickname;
                    onChangePersonHandler("nicknames");
                  }}
                  onDeleteNickname={() => {
                    $state.nicknames.splice(i, 1);
                    $state.nicknames = [...$state.nicknames];
                    onChangePersonHandler("nicknames");
                  }}
                  data-test-index={`${props["data-test-index"]}[${i}]`}
                />
              ))}
              <button
                onClick={() => ($state.nicknames = [...$state.nicknames, ""])}
                {...mkDataTestIdAttr("add-nickname-btn")}
              >
                Add nickname
              </button>
            </div>
          </div>
          <button
            data-testid={`remove-person-btn${props["data-test-index"]}`}
            onClick={() => props.onDeletePerson()}
          >
            Remove person
          </button>
        </div>
      );
    },
    []
  );

  const $state = useDollarState(
    [
      {
        path: "people",
        type: "private",
        initFunc: ({ $props }) => $props.people,
        variableType: "array",
      },
    ],
    {
      $props: deepClone(props),
    }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {$state.people.map((person: any, i: number) => (
        <Person
          person={person}
          key={i}
          onChangePerson={(person) => ($state.people[i] = person)}
          onDeletePerson={() => $state.people.splice(i, 1)}
          data-test-index={`[${i}]`}
        />
      ))}
      <button
        data-testid={"add-person-btn"}
        onClick={() =>
          $state.people.push({
            firstName: "",
            lastName: "",
            nicknames: [],
          })
        }
      >
        Add person
      </button>
      <br />
      <p data-testid={"stringified-people"}>{JSON.stringify($state.people)}</p>
    </div>
  );
};

// It's used by the FormBuilder and ImplicitFormBuilder stories
const sharedFormBuilderInteractionsTest = async (
  canvasElement: HTMLElement
) => {
  const canvas = within(canvasElement);
  await sleep(1);

  const testPeopleList = async (expectedPeople: Person[]) => {
    await sleep(1);
    await expect(canvas.getByTestId("stringified-people").textContent).toEqual(
      JSON.stringify(expectedPeople)
    );
    for (let i = 0; i < expectedPeople.length; i++) {
      await expect(
        (canvas.getByTestId(`firstName-input[${i}]`) as HTMLInputElement).value
      ).toEqual(expectedPeople[i].firstName);
      await expect(
        (canvas.getByTestId(`lastName-input[${i}]`) as HTMLInputElement).value
      ).toEqual(expectedPeople[i].lastName);
      for (let j = 0; j < expectedPeople[i].nicknames.length; j++) {
        await expect(
          (canvas.getByTestId(`nickname-input[${i}][${j}]`) as HTMLInputElement)
            .value
        ).toEqual(expectedPeople[i].nicknames[j]);
      }
    }
  };
  const expectedPeople = deepClone(peopleList);
  await testPeopleList(expectedPeople);

  expectedPeople[0].firstName += "abc";
  expectedPeople[2].lastName += "xyz";
  expectedPeople[0].nicknames.push("nickname1");
  expectedPeople[1].nicknames.push("nickname2");
  expectedPeople[1].nicknames.push("nickname3");
  expectedPeople[2].nicknames.push("nickname4");
  await userEvent.type(canvas.getByTestId("firstName-input[0]"), "abc");
  await userEvent.type(canvas.getByTestId("lastName-input[2]"), "xyz");
  await click(canvas.getByTestId("add-nickname-btn[0]"));
  await userEvent.type(canvas.getByTestId("nickname-input[0][0]"), "nickname1");
  await click(canvas.getByTestId("add-nickname-btn[1]"));
  await userEvent.type(canvas.getByTestId("nickname-input[1][1]"), "nickname2");
  await click(canvas.getByTestId("add-nickname-btn[1]"));
  await userEvent.type(canvas.getByTestId("nickname-input[1][2]"), "nickname3");
  await click(canvas.getByTestId("add-nickname-btn[2]"));
  await userEvent.type(canvas.getByTestId("nickname-input[2][2]"), "nickname4");
  await testPeopleList(expectedPeople);

  const newPerson = {
    firstName: "John",
    lastName: "Doe",
    nicknames: ["little john", "big john"],
  };
  expectedPeople.push(newPerson);
  await click(canvas.getByTestId("add-person-btn"));
  await userEvent.type(
    canvas.getByTestId("firstName-input[3]"),
    newPerson.firstName
  );
  await userEvent.type(
    canvas.getByTestId("lastName-input[3]"),
    newPerson.lastName
  );
  await click(
    canvas.getByTestId("add-nickname-btn[3]"),
    newPerson.nicknames.length
  );
  await userEvent.type(
    canvas.getByTestId("nickname-input[3][0]"),
    newPerson.nicknames[0]
  );
  await userEvent.type(
    canvas.getByTestId("nickname-input[3][1]"),
    newPerson.nicknames[1]
  );
  await testPeopleList(expectedPeople);

  expectedPeople.splice(2, 1);
  await click(canvas.getByTestId("remove-person-btn[2]"));
  await testPeopleList(expectedPeople);

  expectedPeople[0].nicknames.splice(0, 1);
  expectedPeople[1].nicknames.splice(1, 1);
  expectedPeople[2].nicknames.splice(0, 2);
  await click(canvas.getByTestId("remove-nickname-btn[0][0]"));
  await click(canvas.getByTestId("remove-nickname-btn[1][1]"));
  await click(canvas.getByTestId("remove-nickname-btn[2][1]"));
  await click(canvas.getByTestId("remove-nickname-btn[2][0]"));
  await testPeopleList(expectedPeople);

  expectedPeople[1].firstName += "abc";
  expectedPeople[2].lastName += "xyz";
  expectedPeople[0].nicknames.push("nickname11");
  expectedPeople[1].nicknames.push("nickname12");
  expectedPeople[1].nicknames.push("nickname13");
  expectedPeople[2].nicknames.push("nickname14");
  await userEvent.type(canvas.getByTestId("firstName-input[1]"), "abc");
  await userEvent.type(canvas.getByTestId("lastName-input[2]"), "xyz");
  await click(canvas.getByTestId("add-nickname-btn[0]"));
  await userEvent.type(
    canvas.getByTestId("nickname-input[0][0]"),
    "nickname11"
  );
  await click(canvas.getByTestId("add-nickname-btn[1]"));
  await userEvent.type(
    canvas.getByTestId("nickname-input[1][2]"),
    "nickname12"
  );
  await click(canvas.getByTestId("add-nickname-btn[1]"));
  await userEvent.type(
    canvas.getByTestId("nickname-input[1][3]"),
    "nickname13"
  );
  await click(canvas.getByTestId("add-nickname-btn[2]"));
  await userEvent.type(
    canvas.getByTestId("nickname-input[2][0]"),
    "nickname14"
  );
  await testPeopleList(expectedPeople);
};

export const FormBuilder = _FormBuilder.bind({});
FormBuilder.args = {
  people: deepClone(peopleList),
};
FormBuilder.play = async ({ canvasElement }) => {
  await sharedFormBuilderInteractionsTest(canvasElement);
};

const _FormBuilderImplicitStates: Story<{ people: Person[] }> = (props: {
  people: Person[];
}) => {
  const Nicknames = React.useCallback(
    (props: {
      nicknames: string;
      onNicknamesChange: (nickname: string) => void;
      "data-test-index": string;
    }) => {
      const $state = useDollarState(
        [
          {
            path: "nicknames",
            type: "writable",
            variableType: "array",
            onChangeProp: "onNicknamesChange",
            valueProp: "nicknames",
          },
          {
            path: "textInput[].value",
            type: "private",
            variableType: "text",
          },
        ],
        {
          $props: props,
        }
      );
      return (
        <div
          style={{
            display: "flex",
          }}
        >
          <label>Nicknames</label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            {$state.nicknames.map((nickname: any, i: number) => {
              $state.registerInitFunc?.("textInput[].value", () => nickname, [
                i,
              ]);
              return (
                <div>
                  <TextInput
                    value={$state.textInput[i].value}
                    onChange={(val) => {
                      $state.textInput[i].value = val;
                      $state.nicknames[i] = val;
                    }}
                    data-testid={`nickname-input${props["data-test-index"]}[${i}]`}
                  />
                  <button
                    onClick={() => {
                      $state.nicknames.splice(i, 1);
                    }}
                    data-testid={`remove-nickname-btn${props["data-test-index"]}[${i}]`}
                  >
                    X
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => {
                $state.nicknames.push("");
              }}
              data-testid={`add-nickname-btn${props["data-test-index"]}`}
            >
              Add nickname
            </button>
          </div>
        </div>
      );
    },
    []
  );

  const Person = React.useCallback(
    (props: {
      initialPerson: Person;
      onPersonChange: (value: Person) => void;
      onDeletePerson: () => void;
      "data-test-index": string;
    }) => {
      const $state = useDollarState(
        [
          {
            path: "person",
            type: "writable",
            variableType: "object",
            valueProp: "initialPerson",
            onChangeProp: "onPersonChange",
          },
          {
            path: "firstName.value",
            type: "private",
            variableType: "text",
            initFunc: ({ $state }) => $state.person.firstName,
          },
          {
            path: "lastName.value",
            type: "private",
            variableType: "text",
            initFunc: ({ $state }) => $state.person.lastName,
          },
          {
            path: "nicknames.value",
            type: "private",
            variableType: "text",
            initFunc: ({ $state }) => $state.person.nicknames,
          },
        ],
        {
          $props: props,
        }
      );
      const mkDataTestIdAttr = (label: string) => ({
        "data-testid": `${label}${props["data-test-index"]}`,
      });
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderBottom: "1px solid #000",
          }}
        >
          <div>
            <label>First Name</label>
            <TextInput
              value={$state.firstName.value}
              onChange={(val) => {
                $state.firstName.value = val;
                $state.person.firstName = val;
              }}
              {...mkDataTestIdAttr("firstName-input")}
            />
          </div>
          <div>
            <label>Last Name</label>
            <TextInput
              value={$state.lastName.value}
              onChange={(val) => {
                generateStateOnChangeProp($state, ["lastName", "value"])(val);
                $state.person.lastName = val;
              }}
              {...mkDataTestIdAttr("lastName-input")}
            />
          </div>
          <Nicknames
            nicknames={$state.nicknames.value}
            onNicknamesChange={(val) => {
              generateStateOnChangeProp($state, ["nicknames", "value"])(val);
              $state.person.nicknames = val;
            }}
            data-test-index={props["data-test-index"]}
          />
          <button
            data-testid={`remove-person-btn${props["data-test-index"]}`}
            onClick={() => props.onDeletePerson()}
          >
            Remove person
          </button>
        </div>
      );
    },
    []
  );

  const $state = useDollarState(
    [
      {
        path: "people",
        type: "private",
        variableType: "array",
        initFunc: ({ $props }) => $props.people,
      },
      {
        path: "person[].value",
        type: "private",
        variableType: "object",
      },
    ],
    {
      $props: deepClone(props),
    }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {$state.people.map((person: any, i: number) => {
        $state.registerInitFunc?.("person[].value", () => person, [i]);
        return (
          $state.person[i].value && (
            <Person
              key={i}
              initialPerson={$state.person[i].value}
              onPersonChange={(val) => {
                $state.person[i].value = val;
                $state.people[i] = val;
              }}
              onDeletePerson={() => $state.people.splice(i, 1)}
              data-test-index={`[${i}]`}
            />
          )
        );
      })}
      <button
        data-testid={"add-person-btn"}
        onClick={() =>
          ($state.people = [
            ...$state.people,
            {
              firstName: "",
              lastName: "",
              nicknames: [],
            },
          ])
        }
      >
        Add person
      </button>
      <br />
      <p data-testid={"stringified-people"}>{JSON.stringify($state.people)}</p>
    </div>
  );
};

export const FormBuilderImplicitStates = _FormBuilderImplicitStates.bind({});
FormBuilderImplicitStates.args = {
  people: peopleList,
};
FormBuilderImplicitStates.play = async ({ canvasElement }) => {
  await sharedFormBuilderInteractionsTest(canvasElement);
};

const _StateCellIsArray: Story<{ people: Person[] }> = (props: {
  people: Person[];
}) => {
  const $state = useDollarState(
    [
      {
        path: "people",
        type: "private",
        initFunc: ({ $props }) => $props.people,
        variableType: "array",
      },
      {
        path: "firstName",
        type: "private",
        variableType: "text",
      },
      {
        path: "lastName",
        type: "private",
        variableType: "text",
      },
    ],
    {
      $props: props,
    }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <ul data-testid={"people-list"}>
        {$state.people.map((person: any, i: number) => (
          <li key={i}>
            <span>
              {person.firstName} {person.lastName}
            </span>
            <button
              onClick={() => $state.people.splice(i, 1)}
              data-testid={`remove-${person.firstName}-${person.lastName}`}
            >
              X
            </button>
          </li>
        ))}
      </ul>
      <div>
        <input
          value={$state.firstName}
          onChange={(e) => ($state.firstName = e.target.value)}
          data-testid={"first-name-input"}
        />
        <input
          value={$state.lastName}
          onChange={(e) => ($state.lastName = e.target.value)}
          data-testid={"last-name-input"}
        />
        <button
          data-testid={"add-person-btn"}
          onClick={() => {
            $state.people.push({
              firstName: $state.firstName,
              lastName: $state.lastName,
            });
          }}
        >
          Add person
        </button>
        <br />
      </div>
    </div>
  );
};

export const StateCellIsArray = _StateCellIsArray.bind({});
StateCellIsArray.args = {
  people: deepClone(peopleList),
};
StateCellIsArray.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const expectedPeople = deepClone(peopleList);
  await sleep(1);

  const removePerson = async (i: number) => {
    await userEvent.click(
      canvas.getByTestId(
        `remove-${expectedPeople[i].firstName}-${expectedPeople[i].lastName}`
      )
    );
    expectedPeople.splice(i, 1);
  };

  const addPerson = async (firstName: string, lastName: string) => {
    await userEvent.clear(canvas.getByTestId("first-name-input"));
    await userEvent.clear(canvas.getByTestId("last-name-input"));

    await userEvent.type(canvas.getByTestId("first-name-input"), firstName);
    await userEvent.type(canvas.getByTestId("last-name-input"), lastName);
    await userEvent.click(canvas.getByTestId("add-person-btn"));
    expectedPeople.push({ firstName, lastName, nicknames: [] });
  };

  const testPeopleList = async () => {
    const peopleList = (canvas.getByTestId("people-list") as HTMLUListElement)
      .children;
    expect(peopleList.length).toEqual(expectedPeople.length);
    for (let i = 0; i < peopleList.length; i++) {
      const person = peopleList[i] as HTMLLIElement;
      const personName = (person.children[0] as HTMLSpanElement).textContent;
      expect(personName).toEqual(
        `${expectedPeople[i].firstName} ${expectedPeople[i].lastName}`
      );
    }
  };
  await testPeopleList();

  // add a person
  await addPerson("Roger", "Federer");
  await testPeopleList();

  // remove first and third person
  await removePerson(2);
  await removePerson(0);

  // add two more
  await addPerson("Serena", "Williams");
  await addPerson("Novak", "Djokovic");
  await testPeopleList();

  //remove all
  for (let i = expectedPeople.length - 1; i >= 0; i--) {
    await removePerson(i);
  }
  await testPeopleList();

  // add a person
  await addPerson("Rafael", "Nadal");
  await testPeopleList();
};

const _StateCellIsAMatrix: Story<{ board: number[][] }> = (props) => {
  const $state = useDollarState(
    [
      {
        path: "board",
        type: "private",
        initFunc: ({ $props }) => $props.board,
        variableType: "array",
      },
      {
        path: "selectedRow",
        type: "private",
        variableType: "number",
      },
      {
        path: "selectedCol",
        type: "private",
        variableType: "number",
      },
    ],
    {
      $props: props,
    }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {$state.board.map((item: number[], row: number) => (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "20px",
          }}
        >
          {item.map((item, col) => (
            <div
              onClick={() => {
                if (
                  $state.selectedRow !== undefined &&
                  $state.selectedCol !== undefined
                ) {
                  [
                    $state.board[row][col],
                    $state.board[$state.selectedRow][$state.selectedCol],
                  ] = [
                    $state.board[$state.selectedRow][$state.selectedCol],
                    $state.board[row][col],
                  ];
                  $state.selectedRow = $state.selectedCol = undefined;
                } else {
                  $state.selectedRow = row;
                  $state.selectedCol = col;
                }
              }}
              data-testid={`board-${row}-${col}`}
            >
              {item}
            </div>
          ))}
        </div>
      ))}
      <div data-testid={"stringified-state"}></div>
      {JSON.stringify($state)}
    </div>
  );
};
const initialBoard = [
  [0, 1],
  [2, 3],
];
export const StateCellIsMatrix = _StateCellIsAMatrix.bind({});
StateCellIsMatrix.args = {
  board: initialBoard,
};
StateCellIsMatrix.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await sleep(1);

  const expectedState = deepClone<{
    board: number[][];
    selectedRow?: number;
    selectedCol?: number;
  }>({ board: initialBoard });

  const testBoard = async () => {
    await expect(
      canvas.getByText(JSON.stringify(expectedState))
    ).toBeInTheDocument();
  };
  const selectCell = async (row: number, col: number) => {
    await userEvent.click(canvas.getByTestId(`board-${row}-${col}`));
    if (
      expectedState.selectedRow !== undefined &&
      expectedState.selectedCol !== undefined
    ) {
      [
        expectedState.board[row][col],
        expectedState.board[expectedState.selectedRow][
          expectedState.selectedCol
        ],
      ] = [
        expectedState.board[expectedState.selectedRow][
          expectedState.selectedCol
        ],
        expectedState.board[row][col],
      ];
      delete expectedState.selectedRow;
      delete expectedState.selectedCol;
    } else {
      expectedState.selectedRow = row;
      expectedState.selectedCol = col;
    }
  };
  await testBoard();

  await selectCell(0, 0);
  await selectCell(0, 1);
  await testBoard();

  await selectCell(1, 0);
  await selectCell(1, 1);
  await testBoard();

  await selectCell(0, 0);
  await testBoard();
  await selectCell(1, 1);
  await testBoard();
};

const _IsOnChangePropImmediatelyFired: Story<{}> = (props) => {
  const Counter = React.useCallback(
    (props: {
      onCountChange: (val: number) => void;
      onIsOddChange: (val: boolean) => void;
    }) => {
      const $state = useDollarState(
        [
          {
            path: "count",
            type: "readonly",
            onChangeProp: "onCountChange",
            initVal: 5,
            variableType: "number",
          },
          {
            path: "isOdd",
            type: "readonly",
            onChangeProp: "onIsOddChange",
            initFunc: ({ $state }) => !!($state.count % 2),
            variableType: "boolean",
          },
        ],
        {
          $props: props,
        },
        { inCanvas: true }
      );
      return (
        <div>
          <button
            onClick={() => ($state.count = $state.count + 1)}
            data-testid={"counter-btn"}
          >
            Counter Increment
          </button>
        </div>
      );
    },
    []
  );

  const $state = useDollarState(
    [
      {
        path: "counter.count",
        type: "private",
        variableType: "number",
      },
      {
        path: "counter.isOdd",
        type: "private",
        variableType: "boolean",
      },
      {
        path: "invocations",
        type: "writable",
        variableType: "array",
        initVal: [],
      },
    ],
    {
      $props: props,
    }
  );

  if ($state.invocations.length > 1) {
    throw new Error(
      `onIsOddChange should only be invoked once, it was invoked ${$state.invocations.length} times`
    );
  }

  return (
    <div>
      <Counter
        onCountChange={generateStateOnChangeProp($state, ["counter", "count"])}
        onIsOddChange={(...args: any) => {
          generateStateOnChangeProp($state, ["counter", "isOdd"]).apply(
            null,
            args
          );
          $state.invocations.push(args);
        }}
      />
      <br />
      <span data-testid="counter-span">{$state.counter.count}</span>
      <br />
      <span data-testid="isOdd-span">
        {$state.counter.isOdd ? "true" : "false"}
      </span>
    </div>
  );
};

export const IsOnChangePropImmediatelyFired =
  _IsOnChangePropImmediatelyFired.bind({});
IsOnChangePropImmediatelyFired.args = {};
IsOnChangePropImmediatelyFired.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await sleep(1);
  await expect(
    (canvas.getByTestId(`counter-span`) as HTMLSpanElement).textContent
  ).toEqual(`5`);
  await expect(
    (canvas.getByTestId(`isOdd-span`) as HTMLSpanElement).textContent
  ).toEqual(`true`);
};

const _ImmutableStateCells: Story<{ people: Person[] }> = (props) => {
  const $state = useDollarState(
    [
      {
        path: "peopleList",
        type: "private",
        initFunc: ({ $props }) => $props.people,
        isImmutable: true,
        variableType: "array",
      },
      {
        path: "list.selectedIndex",
        type: "private",
        variableType: "number",
      },
      {
        path: "textInputFirstName.value",
        initFunc: ({ $state }) =>
          $state.list.selectedIndex == null
            ? ""
            : $state.peopleList[$state.list.selectedIndex].firstName,
        type: "private",
        variableType: "text",
      },
      {
        path: "textInputLastName.value",
        initFunc: ({ $state }) =>
          $state.list.selectedIndex == null
            ? ""
            : $state.peopleList[$state.list.selectedIndex].lastName,
        type: "private",
        variableType: "text",
      },
      {
        path: "textInputUpper.value",
        initFunc: ({ $state }) =>
          $state.textInputFirstName.value?.toUpperCase(),
        type: "private",
        variableType: "text",
      },
    ],
    {
      $props: deepClone(props),
    }
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
          $state.peopleList[$state.list.selectedIndex].firstName =
            $state.textInputFirstName.value;
          $state.peopleList[$state.list.selectedIndex].lastName =
            $state.textInputLastName.value;
        }}
        data-testid={"submit"}
      >
        Submit
      </button>
      <button
        onClick={() => {
          $state.peopleList[$state.list.selectedIndex].firstName =
            $state.textInputFirstName.value;
          $state.peopleList[$state.list.selectedIndex].lastName =
            $state.textInputLastName.value;
          $state.peopleList = [...$state.peopleList];
        }}
        data-testid={"submit-assignment"}
      >
        Submit -- New assignment
      </button>
    </div>
  );
};

export const ImmutableStateCells = _ImmutableStateCells.bind({});
ImmutableStateCells.args = {
  people: peopleList,
};
ImmutableStateCells.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByTestId("people_0"));
  await sleep(1);
  await userEvent.type(canvas.getByTestId("textInputFirstName"), "abc");
  await expect(
    (canvas.getByTestId("textInputUpper") as HTMLInputElement).value
  ).toEqual(`${peopleList[0].firstName}ABC`.toUpperCase());

  // text input isn't updated after clicking on the same item
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

  // shouldn't mutate state cell
  await userEvent.click(canvas.getByTestId("submit"));
  await expect(
    (canvas.getByTestId("people_1") as HTMLLinkElement).textContent
  ).toEqual(`${peopleList[1].firstName} ${peopleList[1].lastName}`);

  // should mutate state cell
  await userEvent.click(canvas.getByTestId("submit-assignment"));
  await expect(
    (canvas.getByTestId("people_1") as HTMLLinkElement).textContent
  ).toEqual(`${peopleList[1].firstName}abc ${peopleList[1].lastName}def`);
};

const sorted$StateKeys = ($state: any) =>
  Object.fromEntries(
    Object.keys($state)
      .sort()
      .map((key) => [key, $state[key]])
  );

const _InCanvasDollarState: Story<{}> = (props) => {
  type ActiveVariables = {
    type: "single" | "repeated";
    id: number;
  };
  const [activeVariables, setActiveVariables] = React.useState<
    ActiveVariables[]
  >([]);

  const specs = activeVariables.map(
    ({ type, id }) =>
      ({
        path:
          type === "single" ? `textInput${id}.value` : `textInput${id}[].value`,
        type: "private",
        initFunc: type === "single" ? () => `${id}` : undefined,
        variableType: "text",
        initFuncHash: type === "single" ? `${id}` : undefined,
      } as $StateSpec<string>)
  );
  const $state = useDollarState(specs, { $props: props }, { inCanvas: true });
  return (
    <div>
      <p data-testid={"$state"}>{JSON.stringify(sorted$StateKeys($state))}</p>
      {activeVariables.map(({ id, type }) => {
        if (type === "single") {
          return (
            <div key={id}>
              <h1>
                {id} {type}
              </h1>
              <TextInput
                value={get($state, `textInput${id}.value`)}
                onChange={(val) => set($state, `textInput${id}.value`, val)}
                data-testid={`textInput${id}`}
              />
            </div>
          );
        } else {
          return (
            <div key={id}>
              <h1>
                {id} {type}
              </h1>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "10px",
                }}
              >
                {[0, 1, 2].map((currItem, currIndex) => {
                  $state.registerInitFunc?.(
                    `textInput${id}[].value`,
                    () => `hello ${id} ${currItem}`,
                    [currIndex]
                  );
                  return (
                    <div key={currItem}>
                      <h2>{currItem}</h2>
                      <TextInput
                        value={get($state, `textInput${id}.${currIndex}.value`)}
                        onChange={(val) =>
                          set($state, `textInput${id}.${currIndex}.value`, val)
                        }
                        data-testid={`textInput${id}${currIndex}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
      })}
      <button
        onClick={() => {
          setActiveVariables((curr) => [
            ...curr,
            {
              type: "single",
              id: (activeVariables.slice(-1)[0]?.id ?? 0) + 1,
            },
          ]);
        }}
        data-testid="add-variable"
      >
        Add variable
      </button>
      <div>
        <select id={"repeatable-select"} data-testid={"repeatable-select"}>
          {activeVariables.map(
            ({ id, type }) =>
              type === "single" && (
                <option key={id} value={id}>
                  {id}
                </option>
              )
          )}
        </select>
        <button
          onClick={() => {
            setActiveVariables((curr) =>
              curr.map((currItem) =>
                currItem.id ===
                +(
                  document.getElementById(
                    "repeatable-select"
                  ) as HTMLSelectElement
                ).value
                  ? {
                      id: currItem.id,
                      type: "repeated",
                    }
                  : currItem
              )
            );
          }}
          data-testid={"repeatable"}
        >
          Make repeatable
        </button>
      </div>
      <div>
        <select data-testid="single-select" id="single-select">
          {activeVariables.map(
            ({ id, type }) =>
              type === "repeated" && (
                <option key={id} value={id}>
                  {id}
                </option>
              )
          )}
        </select>
        <button
          onClick={() => {
            setActiveVariables((curr) =>
              curr.map((currItem) =>
                currItem.id ===
                +(document.getElementById("single-select") as HTMLSelectElement)
                  .value
                  ? {
                      id: currItem.id,
                      type: "single",
                    }
                  : currItem
              )
            );
          }}
          data-testid="single"
        >
          Make single
        </button>
      </div>
      <div>
        <select data-testid="delete-select" id="delete-select">
          {activeVariables.map(({ id }) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setActiveVariables((activeVars) =>
              activeVars.filter(
                ({ id }) =>
                  id !==
                  +(
                    document.getElementById(
                      "delete-select"
                    ) as HTMLSelectElement
                  ).value
              )
            );
          }}
          data-testid="delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export const InCanvasDollarState = _InCanvasDollarState.bind({});
InCanvasDollarState.args = {
  people: deepClone(peopleList),
};
InCanvasDollarState.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await sleep(1);

  const $state: Record<string, any> = {};
  const usedIds: number[] = [];
  const addVariable = async () => {
    const id = usedIds.slice(-1)[0] ?? 0;
    usedIds.push(id + 1);
    set($state, [`textInput${id + 1}`, "value"], `${id + 1}`);

    await userEvent.click(canvas.getByTestId("add-variable"));
    await expect(canvas.getByTestId("$state").textContent).toEqual(
      JSON.stringify($state)
    );
  };
  const changeTextForSingle = async (id: number, addText: string) => {
    const oldText = get($state, [`textInput${id}`, "value"]);
    set($state, [`textInput${id}`, "value"], oldText + addText);

    await userEvent.type(canvas.getByTestId(`textInput${id}`), addText);
    await expect(canvas.getByTestId("$state").textContent).toEqual(
      JSON.stringify($state)
    );
  };
  const changeTextForRepeated = async (
    id: number,
    index: number,
    addText: string
  ) => {
    const oldText = get($state, [`textInput${id}`, index, "value"]);
    set($state, [`textInput${id}`, index, "value"], oldText + addText);

    await userEvent.type(canvas.getByTestId(`textInput${id}${index}`), addText);
    await expect(canvas.getByTestId("$state").textContent).toEqual(
      JSON.stringify($state)
    );
  };
  const makeRepeatable = async (id: number) => {
    $state[`textInput${id}`] = [0, 1, 2].map((item) => ({
      value: `hello ${id} ${item}`,
    }));
    await userEvent.selectOptions(
      canvas.getByTestId("repeatable-select"),
      `${id}`
    );
    await userEvent.click(canvas.getByTestId("repeatable"));
    await expect(canvas.getByTestId("$state").textContent).toEqual(
      JSON.stringify($state)
    );
  };
  const makeSingle = async (id: number) => {
    $state[`textInput${id}`] = { value: `${id}` };
    await userEvent.selectOptions(canvas.getByTestId("single-select"), `${id}`);
    await userEvent.click(canvas.getByTestId("single"));
    await expect(canvas.getByTestId("$state").textContent).toEqual(
      JSON.stringify($state)
    );
  };
  const makeDelete = async (id: number) => {
    usedIds.splice(
      usedIds.findIndex((id2) => id2 === id),
      1
    );
    delete $state[`textInput${id}`];
    await userEvent.selectOptions(canvas.getByTestId("delete-select"), `${id}`);
    await userEvent.click(canvas.getByTestId("delete"));
    await expect(canvas.getByTestId("$state").textContent).toEqual(
      JSON.stringify($state)
    );
  };

  await addVariable();
  await addVariable();
  await addVariable();

  await changeTextForSingle(1, "hello");
  await makeRepeatable(1);
  await makeSingle(1);

  await addVariable();
  await makeRepeatable(2);
  await addVariable();
  await changeTextForRepeated(2, 0, "goodbye");
  await makeSingle(2);

  await makeRepeatable(3);
  await makeRepeatable(1);
  await changeTextForRepeated(3, 1, "foo");
  await makeSingle(1);

  await makeDelete(1);
  await makeDelete(2);

  await changeTextForSingle(5, "abc");
  await makeDelete(5);
  await addVariable();

  await makeRepeatable(5);
  await changeTextForRepeated(5, 0, "bar");
  await makeDelete(5);
  await addVariable();
  await makeRepeatable(5);
};

const _AddDeleteSpecsInCanvas: Story<{}> = () => {
  const [toggle, setToggle] = React.useState(false);
  const specs = [
    {
      type: "private" as const,
      path: "counter.count",
      variableType: "number" as const,
      initFunc: () => 0,
    },
    {
      type: "private" as const,
      path: "text",
      variableType: "text" as const,
      initFunc: () => "hello",
    },
    ...(toggle
      ? [
          {
            type: "private",
            path: "count2",
            variableType: "number",
            initFunc: () => 0,
          } as const,
        ]
      : []),
  ];
  const $state = useDollarState(specs, { $props: {} }, { inCanvas: true });
  return (
    <div>
      <Counter
        stateType="readonly"
        onChange={generateStateOnChangeProp($state, ["counter", "count"])}
      />
      <p>
        <strong>{JSON.stringify($state)}</strong>
      </p>
      <button onClick={() => setToggle((tg) => !tg)} data-testid={"toggle-btn"}>
        Toggle
      </button>
      {toggle ? (
        <Counter
          stateType="readonly"
          onChange={generateStateOnChangeProp($state, ["count2"])}
          data-testid={"counter2"}
        />
      ) : null}
    </div>
  );
};

export const AddDeleteSpecsInCanvas = _AddDeleteSpecsInCanvas.bind({});
AddDeleteSpecsInCanvas.args = {};
AddDeleteSpecsInCanvas.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  const expected: any = {
    counter: { count: 0 },
    text: "hello",
  };
  await sleep(1);
  await expect(canvas.getByText(JSON.stringify(expected))).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("counter-btn"));
  await userEvent.click(canvas.getByTestId("counter-btn"));
  await userEvent.click(canvas.getByTestId("counter-btn"));
  expected.counter.count = 3;
  await expect(canvas.getByText(JSON.stringify(expected))).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("toggle-btn"));
  expected.count2 = 0;
  await expect(canvas.getByText(JSON.stringify(expected))).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("counter2-btn"));
  await userEvent.click(canvas.getByTestId("counter2-btn"));
  expected.count2 = 2;
  await expect(canvas.getByText(JSON.stringify(expected))).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("toggle-btn"));
  delete expected.count2;
  await expect(canvas.getByText(JSON.stringify(expected))).toBeInTheDocument();

  await userEvent.click(canvas.getByTestId("counter-btn"));
  await userEvent.click(canvas.getByTestId("counter-btn"));
  await userEvent.click(canvas.getByTestId("counter-btn"));
  expected.counter.count = 6;
  await expect(canvas.getByText(JSON.stringify(expected))).toBeInTheDocument();
};

const _TodoApp: Story<{}> = (props) => {
  const specs: $StateSpec<any>[] = [
    {
      path: "tasks",
      initFunc: () => ["Task 1", "Task 2"],
      variableType: "array",
      type: "private",
    },
    {
      path: "textInput[].value",
      variableType: "text",
      type: "private",
    },
  ];
  const $state = useDollarState(specs, { $props: props });
  return (
    <div data-testid="root">
      <h1>To Do App</h1>
      <div data-testid="tasksWrapper">
        {$state.tasks.map((currentItem: string, currentIndex: number) => {
          $state.registerInitFunc?.(
            "textInput[].value",
            ({ $state }) => $state.tasks[currentIndex],
            [currentIndex]
          );
          return (
            <div key={currentIndex}>
              <div>
                <span data-testid={`span${currentIndex}`}>{currentItem}</span>
                <TextInput
                  onChange={(val) =>
                    ($state.textInput[currentIndex].value = val)
                  }
                  value={$state.textInput[currentIndex].value}
                  onBlur={() =>
                    ($state.tasks[currentIndex] =
                      $state.textInput[currentIndex].value)
                  }
                  data-testid={`textInput${currentIndex}`}
                />
                <button
                  onClick={() => {
                    $state.tasks.splice(currentIndex, 1);
                  }}
                  data-testid={`delete${currentIndex}`}
                >
                  X
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          $state.tasks.push("new task");
        }}
        data-testid={"add"}
      >
        Add
      </button>
    </div>
  );
};

export const TodoApp = _TodoApp.bind({});
TodoApp.args = {};
TodoApp.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await sleep(1);

  const tasks = ["Task 1", "Task 2"];

  const checkTasks = async () => {
    await expect(canvas.getByTestId(`tasksWrapper`).children.length).toEqual(
      tasks.length
    );
    for (let i = 0; i < tasks.length; i++) {
      await expect(canvas.getByTestId(`span${i}`).textContent).toEqual(
        tasks[i]
      );
      await expect(
        (canvas.getByTestId(`textInput${i}`) as HTMLInputElement).value
      ).toEqual(tasks[i]);
    }
  };
  const changeTaskName = async (id: number, addText: string) => {
    await userEvent.type(canvas.getByTestId(`textInput${id}`), addText);
    await expect(canvas.getByTestId(`span${id}`).textContent).toEqual(
      tasks[id]
    );
    // only change after onBlur
    await userEvent.click(canvas.getByTestId("root"));
    tasks[id] += addText;
    await expect(canvas.getByTestId(`span${id}`).textContent).toEqual(
      tasks[id]
    );

    await checkTasks();
  };
  const addTask = async () => {
    tasks.push("new task");
    await userEvent.click(canvas.getByTestId("add"));
    await checkTasks();
  };
  const deleteTask = async (id: number) => {
    tasks.splice(id, 1);
    await userEvent.click(canvas.getByTestId(`delete${id}`));
    await checkTasks();
  };

  await checkTasks();
  await changeTaskName(0, "foo");
  await addTask();
  await addTask();
  await changeTaskName(3, "bar");
  await deleteTask(0);
  await deleteTask(2);
  await changeTaskName(1, "hello");
  await addTask();
  await deleteTask(2);
  await deleteTask(1);
  await deleteTask(0);
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | undefined }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: undefined };
  }

  componentDidCatch(error: Error) {
    this.setState({ error: `${error.name}: ${error.message}` });
  }

  render() {
    const { error } = this.state;
    if (error) {
      return <div data-testid="error-message">{error}</div>;
    } else {
      return <>{this.props.children}</>;
    }
  }
}

const _CycleInStateInitialization: Story<{}> = (props) => {
  const [selfCycle, setSelfCycle] = React.useState(true);
  const InnerComponent = React.useCallback(
    ({ selfCycle }: { selfCycle: boolean }) => {
      const $state = useDollarState(
        [
          {
            path: "self",
            type: "private",
            variableType: "text",
            initFunc: ({ $state }) => $state.self,
          },
          {
            path: "a",
            type: "private",
            variableType: "text",
            initFunc: ({ $state }) => $state.b,
          },
          {
            path: "b",
            type: "private",
            variableType: "text",
            initFunc: ({ $state }) => $state.a,
          },
        ],
        {
          $props: props,
        }
      );
      return (
        <div>
          <span>{selfCycle ? $state.self : $state.a}</span>
        </div>
      );
    },
    []
  );
  return (
    <>
      <ErrorBoundary key={JSON.stringify(selfCycle)}>
        <InnerComponent selfCycle={selfCycle} />
      </ErrorBoundary>
      <button
        onClick={() => setSelfCycle((state) => !state)}
        data-testid="toggle"
      >
        Toggle
      </button>
    </>
  );
};

export const CycleInStateInitialization = _CycleInStateInitialization.bind({});
CycleInStateInitialization.args = {};
CycleInStateInitialization.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const errorMessages = [
    new CyclicStatesReferencesError(["self", "self"]).message,
    new CyclicStatesReferencesError(["a", "b", "a"]).message,
  ];
  expect(canvas.getByTestId("error-message")).toHaveTextContent(
    `Error: ${errorMessages[0]}`
  );
  await userEvent.click(canvas.getByTestId("toggle"));
  expect(canvas.getByTestId("error-message")).toHaveTextContent(
    `Error: ${errorMessages[1]}`
  );
};
