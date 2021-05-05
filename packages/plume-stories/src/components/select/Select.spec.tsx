import { mount } from "@cypress/react";
import * as React from "react";
import Select from "./Select";

it("Works", () => {
  mount(
    <Select placeholder="Select something">
      <Select.Option value="blue">Blue</Select.Option>
      <Select.Option value="green">Green</Select.Option>
      <Select.Option value="red">Red</Select.Option>
    </Select>
  );

  cy.get("button").click();
});

function Whatevs(props: any) {
  return <div>{props.children}</div>;
}
