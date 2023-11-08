/**
 * Import and call this main instead of Shell's from main.tsx.
 */

import React from "react";
import ReactDOM from "react-dom";

export function main() {
  ReactDOM.render(<Sandbox />, document.querySelector(".app-container"));
}

function _Sandbox() {
  return (
    <div style={{ height: 500 }}>
      {/*<SimplePathBuilder
        env={new Env().plusBindings([
          new Binding({
            variable: mkVar("result"),
            type: null,
            val: {
              blogPosts: [
                {
                  id: 0,
                  author: "Yang Zhang",
                  body: "Hello world! Hello world! Hello world! Hello world! Hello world! ",
                },

                {
                  id: 0,
                  author: "Yang Zhang",
                  body: "Hello world! Hello world! Hello world! Hello world! Hello world! ",
                },
              ],
            },
          }),
        ])}
        onSubmit={(path) => {
          alert(path);
          console.log(path);
        }}
      />*/}
    </div>
  );
}

export const Sandbox = _Sandbox;
