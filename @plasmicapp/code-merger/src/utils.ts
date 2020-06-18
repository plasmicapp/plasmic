import { assert } from "./common";
import generate, { GeneratorOptions } from "@babel/generator";
import parserTypeScript from "prettier/parser-typescript";
import * as Prettier from "prettier/standalone";
import { Node } from "@babel/traverse";
import * as parser from "@babel/parser";
import { JSXElement } from "@babel/types";

export const code = (
  n: Node | undefined,
  opts?: GeneratorOptions,
  unformatted?: boolean
) => {
  assert(n);
  const c = generate(n, opts).code;
  return unformatted ? c : formatted(c);
};

export const formatted = (c: string) => {
  return Prettier.format(c, {
    parser: "typescript",
    plugins: [parserTypeScript]
  });
};

export function parseExpr(input: string) {
  return parser.parseExpression(input, {
    strictMode: false,
    plugins: ["jsx", "typescript"]
  });
}

export const nodesDeepEqualIgnoreComments = (n1: Node, n2: Node) => {
  return (
    code(n1, { comments: false, compact: true }, true) ===
    code(n2, { comments: false, compact: true }, true)
  );
};

export const tagName = (jsxElement: JSXElement) => {
  // babel generator append ";" to the name. stirp it.
  return code(jsxElement.openingElement.name)
    .replace(";", "")
    .trim();
};
