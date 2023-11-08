/**
 * Import and call this main instead of Shell's from main.tsx.
 */

import { explorerPlugin } from "@graphiql/plugin-explorer";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { GraphiQLProvider } from "graphiql";
import React from "react";
import ReactDOM from "react-dom";
import GraphiqlWithExplorer from "../data/GraphqlBuilder";

import "@graphiql/plugin-explorer/dist/style.css";
import { QueryEditor } from "@graphiql/react";
import { Fetcher } from "@graphiql/toolkit/src/create-fetcher/types";
import "graphiql/graphiql.css";
import { useState } from "react";

const defaultQuery = `
# Welcome to GraphiQL
#
# GraphiQL is an in-browser tool for writing, validating, and
# testing GraphQL queries.
#
# Type queries into this side of the screen, and you will see intelligent
# typeaheads aware of the current GraphQL type schema and live syntax and
# validation errors highlighted within the text.
#
# GraphQL queries typically start with a "{" character. Lines that start
# with a # are ignored.
#
# An example GraphQL query might look like:
#
    query Q($name:Int) {
      allFilms(first:$name){
        films{
          title
        }
      }
    }
#
# Keyboard shortcuts:
#
#   Prettify query:  Shift-Ctrl-P (or press the prettify button)
#
#  Merge fragments:  Shift-Ctrl-M (or press the merge button)
#
#        Run Query:  Ctrl-Enter (or press the play button)
#
#    Auto Complete:  Ctrl-Space (or just start typing)
#

`;

const fetcher = createGraphiQLFetcher({
  url: "https://swapi-graphql.netlify.app/.netlify/functions/index",
});

const customFetcher: Fetcher = (graphQLParams, opts) => {
  console.log("!!fetch", graphQLParams, opts);
  return fetcher(graphQLParams, opts);
};

function MyGraphQLIDE() {
  return (
    <GraphiQLProvider fetcher={fetcher} query={"# hello world\n#hello world"}>
      <div className="graphiql-container">
        <QueryEditor />
      </div>
    </GraphiQLProvider>
  );
}

export default function Page() {
  // pass the explorer props here if you want
  const explorer = explorerPlugin({
    showAttribution: false,
    explorerIsOpen: true,
  });

  const [query, setQuery] = useState(defaultQuery);

  return (
    <div
      style={{
        height: "100vh",
      }}
    >
      <MyGraphQLIDE />

      {/*<OrigGraphiQL*/}
      {/*  fetcher={fetcher}*/}
      {/*  defaultQuery={defaultQuery}*/}
      {/*  // query={query}*/}
      {/*  // onEditQuery={setQuery}*/}
      {/*  plugins={[explorer]}*/}
      {/*/>*/}
    </div>
  );
}

export function main() {
  ReactDOM.render(<Sandbox />, document.querySelector(".app-container"));
}

function _Sandbox() {
  return (
    <GraphiqlWithExplorer
      url={"https://swapi-graphql.netlify.app/.netlify/functions/index"}
      defaultQuery={`    query Q($name:Int) {
        allFilms(first:$name){
          films{
            title
          }
        }
      }
  `}
      defaultVariables={JSON.stringify({ name: 1 })}
      headers={{ aoeu: "123" }}
      onCancel={() => console.log("cancel")}
      onSave={(query, variables) => {
        console.log(query, variables);
      }}
    />
  );
  return <Page />;
}

export const Sandbox = _Sandbox;
