/**
 * Import and call this main instead of Shell's from main.tsx.
 */

import React from "react";
import ReactDOM from "react-dom";
import { DataSourceFlow } from "../components/DataSourceFlow";

export function main() {
  ReactDOM.render(<Sandbox />, document.querySelector(".app-container"));
}

function _Sandbox() {
  return (
    <div>
      <DataSourceFlow onDone={(x) => console.log(x)} />
    </div>
  );
}

export const Sandbox = _Sandbox;
