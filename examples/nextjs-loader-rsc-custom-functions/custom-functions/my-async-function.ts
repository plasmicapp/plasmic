import type { CustomFunctionMeta } from "@plasmicapp/loader-nextjs";

const options = ["foo", "bar", "baz"] as const;
type Option = (typeof options)[number];

export async function myAsyncFunction(name: string, option: Option) {
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(`${name} says ${option}.`), 3000);
  });
}

const makeOption = (value: Option) => ({ label: value, value });

export const myAsyncFunctionParams: CustomFunctionMeta<typeof myAsyncFunction> =
  {
    name: "myAsyncFunction",
    params: [
      {
        name: "name",
        type: "string",
      },
      {
        name: "option",
        type: "choice",
        options: options.map(makeOption),
      },
    ],
  };
