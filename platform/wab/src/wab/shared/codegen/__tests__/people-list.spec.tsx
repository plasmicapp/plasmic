import "@testing-library/jest-dom/extend-expect";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// polyfill some js features like String.matchAll()
import { Bundle, Bundler } from "@/wab/shared/bundler";
import _explicitStatesBundle from "@/wab/shared/codegen/__tests__/bundles/people-list-explicit-states.json";
import _implicitStatesBundle from "@/wab/shared/codegen/__tests__/bundles/people-list-implicit-states.json";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "core-js";
import * as React from "react";
import { last } from "@/wab/shared/common";
import tmp from "tmp";

describe("todo app codegen", () => {
  let dir: tmp.DirResult;
  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });
  afterEach(() => {
    dir.removeCallback();
  });

  // The same test should work for both approaches: building a people list
  // builder with implicit states and with explicit states (manually creating value/onChange)."
  const peopleBuilderTest = async (projectBundle: Bundle) => {
    const site = new Bundler().unbundle(projectBundle, "") as Site;
    const importFromProject = await codegen(dir.name, site);

    const Homepage = (await importFromProject("Homepage.js")).default;

    // Render the component using @testing-library
    render(React.createElement(Homepage));

    const expectedPeople = [
      {
        firstName: "Novak",
        lastName: "Djokovic",
        nicknames: ["Djoker", "GOAT"],
      },
      {
        firstName: "Roger",
        lastName: "Fededer",
        nicknames: [],
      },
      {
        firstName: "Neymar",
        lastName: "Silva",
        nicknames: ["Ney"],
      },
    ];

    const rootElement = document.querySelector(
      `[data-testid="root"]`
    ) as HTMLElement;
    const root = within(rootElement);

    const getPerson = (index: number) =>
      within(root.getAllByTestId("person-container")[index] as HTMLElement);

    const checkPeopleList = async () => {
      expect(root.getByTestId("stringified-state")).toHaveTextContent(
        JSON.stringify(expectedPeople)
      );
      expect(root.getAllByTestId("person-container")).toHaveLength(
        expectedPeople.length
      );
      expectedPeople.forEach((expectedPerson, i) => {
        const person = getPerson(i);
        expect(person.getByTestId("firstName-input")).toHaveValue(
          expectedPerson.firstName
        );
        expect(person.getByTestId("lastName-input")).toHaveValue(
          expectedPerson.lastName
        );
        if (!expectedPerson.nicknames.length) {
          expect(person.queryByTestId("nickname-input")).toBeNil();
        } else {
          expect(person.getAllByTestId("nickname-input")).toHaveLength(
            expectedPerson.nicknames.length
          );
        }
        expectedPerson.nicknames.forEach((expectedNickname, j) => {
          expect(person.getAllByTestId("nickname-input")[j]).toHaveValue(
            expectedNickname
          );
        });
      });
    };

    const changeFirstName = async (
      personIndex: number,
      newFirstName: string
    ) => {
      const person = getPerson(personIndex);
      const input = person.getByTestId("firstName-input") as HTMLInputElement;
      await userEvent.clear(input);
      await userEvent.type(input, newFirstName);
      expectedPeople[personIndex].firstName = newFirstName;
    };

    const changeLastName = async (personIndex: number, newLastName: string) => {
      const person = getPerson(personIndex);
      const input = person.getByTestId("lastName-input") as HTMLInputElement;
      await userEvent.clear(input);
      await userEvent.type(input, newLastName);
      expectedPeople[personIndex].lastName = newLastName;
    };

    const changeNickname = async (
      personIndex: number,
      nicknameIndex: number,
      newNickname: string
    ) => {
      const person = getPerson(personIndex);
      const input = person.getAllByTestId("nickname-input")[
        nicknameIndex
      ] as HTMLInputElement;
      await userEvent.clear(input);
      await userEvent.type(input, newNickname);
      expectedPeople[personIndex].nicknames[nicknameIndex] = newNickname;
    };

    const addNickname = async (personIndex: number, nickname: string) => {
      const person = getPerson(personIndex);
      await userEvent.click(person.getByTestId("add-nickname"));
      await userEvent.type(
        last(person.getAllByTestId("nickname-input")),
        nickname
      );
      expectedPeople[personIndex].nicknames.push(nickname);
    };

    const addPerson = async (newPerson: (typeof expectedPeople)[0]) => {
      await userEvent.click(root.getByTestId("add-person"));
      const newPersonIndex = expectedPeople.length;
      expectedPeople.push({ firstName: "", lastName: "", nicknames: [] });
      await changeFirstName(newPersonIndex, newPerson.firstName);
      await changeLastName(newPersonIndex, newPerson.lastName);
      for (const nickname of newPerson.nicknames) {
        await addNickname(newPersonIndex, nickname);
      }
    };

    const removeNickname = async (
      personIndex: number,
      nicknameIndex: number
    ) => {
      const person = getPerson(personIndex);
      await userEvent.click(
        person.getAllByTestId("remove-nickname")[nicknameIndex]
      );
      expectedPeople[personIndex].nicknames.splice(nicknameIndex, 1);
    };

    const removePerson = async (personIndex: number) => {
      await userEvent.click(root.getAllByTestId("remove-person")[personIndex]);
      expectedPeople.splice(personIndex, 1);
    };

    await checkPeopleList();

    await addNickname(0, "nickname1");
    await addNickname(1, "nickname2");
    await addNickname(1, "nickname3");
    await addNickname(2, "nickname4");
    await checkPeopleList();

    await changeFirstName(0, "foo");
    await changeLastName(0, "bar");
    await changeFirstName(2, "baz");
    await checkPeopleList();

    await changeNickname(0, 0, "qux");
    await changeNickname(1, 1, "quz");
    await checkPeopleList();

    await removeNickname(0, 1);
    await removeNickname(2, 2);
    await checkPeopleList();

    await addPerson({
      firstName: "John",
      lastName: "Doe",
      nicknames: ["little john", "big john"],
    });
    await checkPeopleList();

    await removePerson(1);
    await removePerson(1);
    await checkPeopleList();
  };

  it("can create people list using implicit states", async () => {
    const projectBundle = _implicitStatesBundle[0][1] as Bundle;
    await peopleBuilderTest(projectBundle);
  }, 300000);

  it("can create people list using explicit states", async () => {
    const projectBundle = _explicitStatesBundle[0][1] as Bundle;
    await peopleBuilderTest(projectBundle);
  }, 300000);
});
