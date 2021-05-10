import { mount } from "@cypress/react";
import { cy, expect } from "local-cypress";
import * as React from "react";
import Select from "./Select";

const select = () => cy.findByTestId("select");
const listbox = () => cy.findByRole("listbox");
const option = (name: string) =>
  listbox().findByText(name, { ignore: "option" }).parents("[role='option']");
const header = (name: string) =>
  listbox().findByText(name).parents("[role='presentation']");

describe("Select with options", () => {
  let value: string | null = null;
  let isOpen = false;

  beforeEach(() => {
    value = null;
    isOpen = false;
    mount(
      <Select
        placeholder="Select something"
        data-testid="select"
        onOpenChange={(open) => (isOpen = open)}
        onChange={(val) => {
          value = val;
        }}
      >
        <Select.Option value="blue">Blue</Select.Option>
        <Select.Option value="green">Green</Select.Option>
        <Select.Option value="red">Red</Select.Option>
        <Select.Option value="yellow" isDisabled>
          Yellow
        </Select.Option>
      </Select>
    );
  });

  it("Works with mouse", () => {
    select().should("include.text", "Select something");
    select()
      .click()
      .then(() => expect(isOpen).to.equal(true));
    listbox().should("exist");
    ["Blue", "Green", "Red", "Yellow"].forEach((color) =>
      option(color).should("have.attr", "aria-selected", "false")
    );

    option("Blue").realHover().should("have.focus");

    option("Green").realHover().should("have.focus");
    option("Blue").should("not.have.focus");

    option("Green").click();

    listbox().should("not.exist");
    select()
      .should("include.text", "Green")
      .then(() => {
        expect(isOpen).to.equal(false);
        expect(value).to.equal("green");
      });
  });

  it("Works with keyboard", () => {
    select().focus();

    // Down arrow opens
    cy.focused()
      .type("{downarrow}")
      .then(() => expect(isOpen).to.equal(true));

    listbox().should("exist");
    option("Blue").should("have.focus");

    // Enter selects
    cy.focused().type("{enter}");
    listbox().should("not.exist");
    select()
      .should("include.text", "Blue")
      .then(() => {
        expect(value).to.equal("blue");
        expect(isOpen).to.equal(false);
      });

    // Enter also opens
    cy.focused()
      .type("{enter}")
      .then(() => expect(isOpen).to.equal);
    listbox().should("exist");

    option("Blue")
      .should("have.attr", "aria-selected", "true")
      .and("have.focus");

    cy.focused().type("{downarrow}");
    option("Blue")
      .should("have.attr", "aria-selected", "true")
      .and("not.have.focus");
    option("Green").should("have.focus");

    cy.focused().type("{downarrow}");
    option("Blue")
      .should("have.attr", "aria-selected", "true")
      .and("not.have.focus");
    option("Green").should("not.have.focus");
    option("Red").should("have.focus");

    // down again still does not focus yellow; focus stays on red
    cy.focused().type("{downarrow}");
    option("Blue")
      .should("have.attr", "aria-selected", "true")
      .and("not.have.focus");
    option("Green").should("not.have.focus");
    option("Red").should("have.focus");
    option("Yellow").should("not.have.focus");

    cy.focused().type("{enter}");

    listbox().should("not.exist");
    select()
      .should("include.text", "Red")
      .then(() => {
        expect(value).to.equal("red");
        expect(isOpen).to.equal(false);
      });

    // Red automatically focused on open again
    cy.focused()
      .type(" ")
      .then(() => expect(isOpen).to.equal);
    listbox().should("exist");
    option("Red")
      .should("have.attr", "aria-selected", "true")
      .and("have.focus");

    // Close by escape, keeps selection
    cy.focused().type("{esc}");
    listbox().should("not.exist");
    select()
      .should("include.text", "Red")
      .then(() => {
        expect(value).to.equal("red");
        expect(isOpen).to.equal(false);
      });
  });
});

describe("Select with groups", () => {
  let value: string | null = null;

  beforeEach(() => {
    mount(
      <Select
        placeholder="Pick a country"
        data-testid="select"
        onChange={(val) => {
          value = val;
        }}
      >
        <Select.OptionGroup title="Asia">
          <Select.Option value="twn">Taiwan</Select.Option>
          <Select.Option value="chn">China</Select.Option>
          <Select.Option value="ind">India</Select.Option>
        </Select.OptionGroup>
        <Select.OptionGroup title="Europe">
          <Select.Option value="fra">France</Select.Option>
          <Select.Option value="deu">Germany</Select.Option>
        </Select.OptionGroup>
        <Select.OptionGroup title="Americas">
          <Select.Option value="usa">United States of America</Select.Option>
          <Select.Option value="bra">Brazil</Select.Option>
          <Select.Option value="dom">Dominican Republic</Select.Option>
        </Select.OptionGroup>
      </Select>
    );
  });

  it("works with mouse", () => {
    select().should("include.text", "Pick a country");
    select().click();
    listbox().should("exist");
    option("Taiwan").realHover().should("have.focus");

    // Interacting with header doesn't do anything
    header("Europe").realHover();
    option("Taiwan").should("have.focus");
    header("Europe").click();
    option("Taiwan").should("have.focus");

    option("Germany").click();
    listbox().should("not.exist");
    select()
      .should("include.text", "Germany")
      .then(() => expect(value).to.equal("deu"));
  });

  it("works with keyboard", () => {
    select().focus();
    cy.focused().type("{downarrow}");
    option("Taiwan").should("have.focus");

    cy.focused().type("{downarrow}");
    option("China").should("have.focus");

    cy.focused().type("{downarrow}");
    option("India").should("have.focus");

    cy.focused().type("{downarrow}");
    option("France").should("have.focus");
  });
});
