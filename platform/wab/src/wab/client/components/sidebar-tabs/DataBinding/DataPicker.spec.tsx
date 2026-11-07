import DataPicker from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { DataPickerColumnProps } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumn";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { noop } from "lodash";
import React from "react";

// Exercise real environment/selection/search lifecycle without generated markup or Studio drag
// state.
vi.mock(
  "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPicker",
  () => ({
    PlasmicDataPicker: (props: any) => (
      <>
        <input aria-label="Search" {...props.searchbox} />
        <button onClick={props.saveButton?.onClick}>Save</button>
        {props.children}
        <div data-testid="results">{props.searchResults?.children}</div>
      </>
    ),
  }),
);
vi.mock(
  "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumn",
  () => ({
    default: (props: DataPickerColumnProps) => (
      <div>
        {props.columnItems.map((item, index) => (
          <button
            key={item.name}
            aria-pressed={index === props.selectedItem}
            onClick={() => props.onItemSelected(props.columnIndex, index)}
          >
            {item.label ?? item.name}
          </button>
        ))}
      </div>
    ),
  }),
);
vi.mock(
  "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerGlobalSearchResultsItem",
  () => ({
    default: (props: { itemPath: string[]; previewValue: string }) => (
      <span>
        {props.itemPath.join(".")}: {props.previewValue}
      </span>
    ),
  }),
);
function picker(data: Record<string, any>, browseOnly = true) {
  return (
    <DataPicker
      value={null}
      data={data}
      onChange={noop}
      onCancel={noop}
      browseOnly={browseOnly}
    />
  );
}
const row = (name: string) => screen.getByRole("button", { name });
function selectName() {
  fireEvent.click(row("person"));
  fireEvent.click(row("name"));
}

describe("standalone data browser environment updates", () => {
  it("adds and removes queries while preserving a nested selection", () => {
    const { rerender } = render(picker({ person: { name: "Ada" } }));
    selectName();
    rerender(
      picker({
        person: { name: "Grace", age: 37 },
        $q: { freshQuery: { data: [1, 2] } },
      }),
    );
    expect(row("freshQuery")).toBeTruthy();
    expect(row("person").getAttribute("aria-pressed")).toBe("true");
    expect(row("name").getAttribute("aria-pressed")).toBe("true");
    expect(row("age")).toBeTruthy();
    rerender(picker({ person: { name: "Grace" } }));
    expect(screen.queryByRole("button", { name: "freshQuery" })).toBeNull();
    expect(row("name").getAttribute("aria-pressed")).toBe("true");
  });
  it("refreshes active search results after an environment update", () => {
    const { rerender } = render(picker({ first: "Ada" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "fresh" },
    });
    expect(screen.getByTestId("results").textContent).toBe("");
    rerender(picker({ first: "Ada", fresh: "Grace" }));
    expect(screen.getByTestId("results").textContent).toContain("fresh");
    expect(screen.getByTestId("results").textContent).toContain("Grace");
    rerender(picker({ first: "Ada" }));
    expect(screen.getByTestId("results").textContent).toBe("");
  });
  it("keeps the surviving parent when a selected field disappears", () => {
    const { rerender } = render(picker({ person: { name: "Ada" } }));
    selectName();
    rerender(picker({ person: { age: 37 } }));
    expect(row("person").getAttribute("aria-pressed")).toBe("true");
    expect(row("age").getAttribute("aria-pressed")).toBe("false");
  });
  it("refreshes search previews without replacing editing draft columns", () => {
    const { rerender } = render(picker({ first: "Ada" }, false));
    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "first" },
    });
    expect(screen.getByTestId("results").textContent).toContain("Ada");
    rerender(picker({ first: "Grace" }, false));
    expect(screen.getByTestId("results").textContent).toContain("Grace");
  });
  it("refreshes editing columns while preserving the selected draft path", () => {
    const { rerender } = render(picker({ person: { name: "Ada" } }, false));
    selectName();
    rerender(picker({ other: 1 }, false));
    expect(row("other")).toBeTruthy();
    rerender(picker({ person: { name: "Grace" } }, false));
    expect(row("name").getAttribute("aria-pressed")).toBe("true");
  });
});

it("saves a popover chip after its initial model write using the current callback", async () => {
  let storedValue = "before opening";
  const originalChange = vi.fn();
  const currentChange = vi.fn();
  const target = { exists: () => true, read: () => storedValue };
  const props = {
    value: null,
    data: { person: { name: "Ada" } },
    target,
    onCancel: noop,
  };
  const { rerender } = render(
    <DataPicker {...props} onChange={originalChange} />,
  );
  storedValue = "new chip";
  rerender(<DataPicker {...props} onChange={currentChange} />);
  selectName();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(currentChange).toHaveBeenCalledWith(["person", "name"]),
  );
  expect(originalChange).not.toHaveBeenCalled();
});
