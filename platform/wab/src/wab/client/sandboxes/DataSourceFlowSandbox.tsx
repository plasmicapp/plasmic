/**
 * Import and call this main instead of Shell's from main.tsx.
 */

import { DataSourceFlow } from "@/wab/client/components/DataSourceFlow";
import React from "react";
import ReactDOM from "react-dom";

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
