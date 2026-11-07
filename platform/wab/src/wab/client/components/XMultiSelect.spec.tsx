import { MultiSelectEnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/MultiSelectEnumPropEditor";
import { XMultiSelect } from "@/wab/client/components/XMultiSelect";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/wab/client/dom-utils", () => ({
  useFocusOnDisplayed: vi.fn(),
}));

describe("XMultiSelect", () => {
  it("renders its styled popup without an external popup container", async () => {
    expect(document.querySelector(".xselect")).toBeNull();

    render(
      <XMultiSelect<string>
        filterOptions={(options) => options}
        options={["Option"]}
      />,
    );

    fireEvent.focus(screen.getByRole("textbox"));

    expect(
      (await screen.findByText("Option")).closest(".xselect"),
    ).toBeTruthy();
  });
});

it("keeps a multi-choice menu open when its change handler saves asynchronously", async () => {
  const save = vi.fn();
  function Harness() {
    const [value, setValue] = React.useState<string[]>([]);
    return (
      <MultiSelectEnumPropEditor
        value={value}
        options={[
          { label: "First", value: "first" },
          { label: "Second", value: "second" },
        ]}
        onChange={async (next) => {
          setValue(next);
          save(next);
        }}
      />
    );
  }
  render(<Harness />);
  fireEvent.focus(screen.getByRole("textbox"));
  fireEvent.click(await screen.findByRole("option", { name: "First" }));
  expect(await screen.findByRole("option", { name: "Second" })).toBeTruthy();
  fireEvent.click(screen.getByRole("option", { name: "Second" }));
  expect(save).toHaveBeenLastCalledWith(["first", "second"]);
});
