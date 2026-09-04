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
      />
    );

    fireEvent.focus(screen.getByRole("textbox"));

    expect(
      (await screen.findByText("Option")).closest(".xselect")
    ).toBeTruthy();
  });
});
