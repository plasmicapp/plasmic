/**
 * Import and call this main instead of Shell's from main.tsx.
 */

import React from "react";
import ReactDOM from "react-dom";
import { LiveCodeEditor } from "../components/coding/LiveCodeEditor";

export function main() {
  ReactDOM.render(<Sandbox />, document.querySelector(".app-container"));
}

function _Sandbox() {
  const env = {
    mydata: {
      found: 2,
      posts: [
        { id: 0, content: "Hello" },
        { id: 1, content: "Goodbye" },
      ],
    },
  };
  return (
    <div>
      <LiveCodeEditor
        env={env}
        defaultCode={'"hello"'}
        onSubmit={(v) => console.log("submit", v)}
        onChange={(v) => console.log("change", v)}
        onCancel={() => console.log("cancel")}
      />
    </div>
  );
}

export const Sandbox = _Sandbox;
