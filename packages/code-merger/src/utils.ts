import generate, { GeneratorOptions } from "@babel/generator";
import * as parser from "@babel/parser";
import { Node } from "@babel/traverse";
import { JSXAttribute, JSXElement, JSXSpreadAttribute } from "@babel/types";
import parserTypeScript from "prettier/parser-typescript";
import * as Prettier from "prettier/standalone";
import { assert } from "./common";

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
    plugins: [parserTypeScript],
    trailingComma: "none",
  });
};

export function parseExpr(input: string) {
  return parser.parseExpression(input, {
    strictMode: false,
    plugins: ["jsx", "typescript"],
  });
}

export const compactCode = (n: Node) => {
  return code(n, { comments: false, compact: true }, true);
};

export const nodesDeepEqualIgnoreComments = (n1: Node, n2: Node) => {
  return compactCode(n1) === compactCode(n2);
};

export const tagName = (jsxElement: JSXElement) => {
  // babel generator append ";" to the name. stirp it.
  return code(jsxElement.openingElement.name).replace(";", "").trim();
};

export const getAttrName = (attr: JSXAttribute) => {
  const name = attr.name;
  return name.type === "JSXIdentifier"
    ? name.name
    : `${name.namespace.name}.${name.name.name}`;
};

export const isAttribute = (
  attr: JSXAttribute | JSXSpreadAttribute,
  expectedName: string
) => {
  return attr.type === "JSXAttribute" && getAttrName(attr) === expectedName;
};
