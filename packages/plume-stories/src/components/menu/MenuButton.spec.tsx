import { mount } from "@cypress/react";
import { MenuButtonRefValue, MenuRefValue } from "@plasmicapp/react-web";
import { cy, expect } from "local-cypress";
import * as React from "react";
import Menu from "./Menu";
import MenuButton from "./MenuButton";

const button = () => cy.findByTestId("menu-button");
const menu = () => cy.findByRole("menu");
const item = (name: string) =>
  menu().findByText(name).parents("[role='menuitem']");
const group = (name: string) =>
  menu().findByText(name).parents("[role='presentation']");

describe("MenuButton", () => {
  let value: string | null = null;
  let isOpen: boolean = false;

  beforeEach(() => {
    value = null;
    isOpen = false;
    mount(
      <MenuButton
        data-testid="menu-button"
        onOpenChange={(x) => (isOpen = x)}
        menu={
          <Menu onAction={(x) => (value = x)}>
            <Menu.Item value="shower">Shower</Menu.Item>
            <Menu.Item value="dishes">Dishes</Menu.Item>
            <Menu.Group title="Clean up">
              <Menu.Item value="kitchen">Kitchen</Menu.Item>
              <Menu.Item value="bedroom">Bedroom</Menu.Item>
            </Menu.Group>
          </Menu>
        }
      >
        Do chore
      </MenuButton>
    );
  });

  it("works with mouse", () => {
    button().should("include.text", "Do chore");
    button()
      .click()
      .then(() => expect(isOpen).to.equal(true));
    item("Shower").realHover().should("have.focus");
    item("Kitchen").realHover().should("have.focus");
    item("Kitchen")
      .click()
      .then(() => {
        expect(isOpen).to.equal(false);
        expect(value).to.equal("kitchen");
      });
  });

  it("works with keyboard", () => {
    button().focus();

    cy.focused().type("{downarrow}");
    item("Shower").should("have.focus");

    cy.focused().type("{downarrow}");
    item("Dishes").should("have.focus");

    cy.focused().type("{downarrow}");
    item("Kitchen").should("have.focus");

    cy.focused().type("{downarrow}");
    item("Bedroom").should("have.focus");

    cy.focused()
      .type("{enter}")
      .then(() => {
        expect(isOpen).to.equal(false);
        expect(value).to.equal("bedroom");
      });
  });
});

describe("MenuButton Item.onAction", () => {
  let value: string | null = null;
  let isOpen: boolean = false;

  beforeEach(() => {
    value = null;
    isOpen = false;
    mount(
      <MenuButton
        data-testid="menu-button"
        onOpenChange={(x) => (isOpen = x)}
        menu={
          <Menu>
            <Menu.Item onAction={() => (value = "shower")}>Shower</Menu.Item>
            <Menu.Item onAction={() => (value = "dishes")}>Dishes</Menu.Item>
            <Menu.Group title="Clean up">
              <Menu.Item onAction={() => (value = "kitchen")}>
                Kitchen
              </Menu.Item>
              <Menu.Item onAction={() => (value = "bedroom")}>
                Bedroom
              </Menu.Item>
            </Menu.Group>
          </Menu>
        }
      >
        Do chore
      </MenuButton>
    );
  });

  it("works with mouse", () => {
    button().should("include.text", "Do chore");
    button()
      .click()
      .then(() => expect(isOpen).to.equal(true));
    item("Kitchen")
      .click()
      .then(() => {
        expect(isOpen).to.equal(false);
        expect(value).to.equal("kitchen");
      });
  });

  it("works with keyboard", () => {
    button().focus();

    cy.focused().type("{downarrow}");
    cy.focused().type("{downarrow}");
    cy.focused().type("{downarrow}");
    cy.focused().type("{downarrow}");
    item("Bedroom").should("have.focus");

    cy.focused()
      .type("{enter}")
      .then(() => {
        expect(isOpen).to.equal(false);
        expect(value).to.equal("bedroom");
      });
  });
});

describe("MenuButton ref", () => {
  it("works with ref", () => {
    let value: string | null = null;
    let isOpen: boolean = false;
    let buttonRef: MenuButtonRefValue | null = null;
    let menuRef: MenuRefValue | null = null;

    mount(
      <MenuButton
        data-testid="menu-button"
        onOpenChange={(x) => (isOpen = x)}
        ref={(x) => (buttonRef = x)}
        menu={
          <Menu onAction={(x) => (value = x)} ref={(x) => (menuRef = x)}>
            <Menu.Item value="shower">Shower</Menu.Item>
            <Menu.Item value="dishes">Dishes</Menu.Item>
            <Menu.Group title="Clean up">
              <Menu.Item value="kitchen">Kitchen</Menu.Item>
              <Menu.Item value="bedroom">Bedroom</Menu.Item>
            </Menu.Group>
          </Menu>
        }
      >
        Do chore
      </MenuButton>
    );

    button().then(() => {
      buttonRef?.focus();
      button()
        .should("have.focus")
        .then(() => {
          buttonRef?.open();
          menu()
            .should("exist")
            .then(() => {
              expect(menuRef?.getFocusedValue()).to.be.null;
              menuRef?.setFocusedValue("kitchen");
              item("Kitchen")
                .should("have.focus")
                .then(() => {
                  buttonRef?.close();
                  menu().should("not.exist");
                });
            });
        });
    });
  });
});
