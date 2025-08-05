import "@testing-library/jest-dom/extend-expect";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// polyfill some js features like String.matchAll()
import { Bundle, Bundler } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/form-with-reset-input.json";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "core-js";
import * as React from "react";
import tmp from "tmp";

describe("todo app codegen", () => {
  const projectBundle = _bundle[0][1] as Bundle;
  const site = new Bundler().unbundle(projectBundle, "") as Site;

  const dir = tmp.dirSync({ unsafeCleanup: true });
  afterEach(() => {
    dir.removeCallback();
  });
  it("dependent states should work", async () => {
    const { importFromProject } = await codegen(dir.name, site);

    const Homepage = (await importFromProject("Homepage.js")).default;

    // Render the component using @testing-library
    render(React.createElement(Homepage));

    const expectedData = [
      {
        firstName: "Novak",
        lastName: "Djokovic",
        sport: "Tennis",
      },
      {
        firstName: "Roger",
        lastName: "Federer",
        sport: "Tennis",
      },
      {
        firstName: "Serena",
        lastName: "Williams",
        sport: "Tennis",
      },
      {
        firstName: "Neymar",
        lastName: "Santos",
        sport: "Futebol",
      },
    ];

    const rootElement = document.querySelector(
      `[data-testid="root"]`
    ) as HTMLElement;
    const root = within(rootElement);

    const getRowElt = (index: number) =>
      root.getByTestId("tbody").children.item(index) as HTMLElement;

    const getRow = (index: number) => within(getRowElt(index));

    const checkTable = async () => {
      expect(root.getByTestId("tbody").children.length).toBe(
        expectedData.length
      );
      expectedData.forEach((rowData, index) => {
        const row = getRow(index);
        expect(row.getByTestId("firstName-cell").innerHTML).toBe(
          rowData.firstName
        );
        expect(row.getByTestId("lastName-cell").innerHTML).toBe(
          rowData.lastName
        );
        expect(row.getByTestId("sport-cell").innerHTML).toBe(rowData.sport);
      });
    };

    const checkTextInputs = async (expected: {
      firstName: string;
      lastName: string;
      sport: string;
    }) => {
      expect(
        (root.getAllByTestId("textInput")[0] as HTMLInputElement).value
      ).toBe(expected.firstName);
      expect(
        (root.getAllByTestId("textInput")[1] as HTMLInputElement).value
      ).toBe(expected.lastName);
      expect(
        (root.getAllByTestId("textInput")[2] as HTMLInputElement).value
      ).toBe(expected.sport);
    };

    const editTextInputs = async (
      selectedRow: number,
      changes: {
        firstName?: string;
        lastName?: string;
        sport?: string;
      }
    ) => {
      if (changes.firstName) {
        await userEvent.type(
          root.getAllByTestId("textInput")[0],
          changes.firstName
        );
        expectedData[selectedRow].firstName += changes.firstName;
      }
      if (changes.lastName) {
        await userEvent.type(
          root.getAllByTestId("textInput")[1],
          changes.lastName
        );
        expectedData[selectedRow].lastName += changes.lastName;
      }
      if (changes.sport) {
        await userEvent.type(
          root.getAllByTestId("textInput")[2],
          changes.sport
        );
        expectedData[selectedRow].sport += changes.sport;
      }
      await userEvent.click(root.getByRole("button"));
    };

    const selectRow = async (index: number) => {
      await userEvent.click(getRowElt(index));
    };

    await checkTable();

    await selectRow(2);
    await checkTextInputs(expectedData[2]);
    await editTextInputs(2, { firstName: "foo", lastName: "bar" });

    await checkTable();

    await selectRow(1);
    await checkTextInputs(expectedData[1]);
    await editTextInputs(1, { sport: "baz" });
    await selectRow(2);
    await checkTextInputs(expectedData[2]);
    await selectRow(1);
    await checkTextInputs(expectedData[1]);
  }, 300000);
});
