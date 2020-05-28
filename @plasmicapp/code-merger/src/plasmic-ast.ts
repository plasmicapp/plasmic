import * as parser from "@babel/parser";
import traverse, { Node, NodePath } from "@babel/traverse";
import {
  JSXElement,
  JSXAttribute,
  JSXSpreadAttribute,
  Comment,
  Expression,
  JSXEmptyExpression,
  StringLiteral,
  JSXText,
  TSNonNullExpression,
  MemberExpression,
  JSXSpreadChild,
  JSXFragment,
  JSXExpressionContainer,
} from "@babel/types";
import * as babel from "@babel/core";
import * as L from "lodash";
import generate from "@babel/generator";
import { cloneDeepWithHook } from "./cloneDeepWithHook";
import { assert, withoutNils, ensure } from "./common";

export interface PlasmicNodeBase {
  rawNode: Node;
}

export interface PlasmicOpaqueExpr extends PlasmicNodeBase {
  type: "opaque";
  value: string;
}

export interface PlasmicArgRef extends PlasmicNodeBase {
  type: "arg";
  argName: string;
  // For TplSlot, there will be multiple mainNodes, one for each defaultNode.
  // For text TplSlot, there will be one or zero mainNodes, depending if there
  // is style wrapper or not.
  jsxNodes: PlasmicTagOrComponent[];
  rawNode: Expression | JSXExpressionContainer;
}

export interface PlasmicCondStringCall extends PlasmicNodeBase {
  type: "cond-str-call";
  plasmicId: string;
  rawNode: Expression | JSXExpressionContainer;
}

// A quoted string expression {""}
export interface PlasmicStringLiteralExpr extends PlasmicNodeBase {
  type: "string-lit";
  // The value of the string, i.e. Abc for node {"Abc"}
  value: string;
  rawNode: StringLiteral | JSXExpressionContainer;
}

// A HTML text node.
export interface PlasmicJsxText extends PlasmicNodeBase {
  type: "text";
  value: string;
  rawNode: JSXText;
}

export interface PlasmicJsxElement extends PlasmicNodeBase {
  nameInId: string;
  // A list of JSX attribute or JSX spread operator
  attrs: Array<[string, PlasmicASTNode|null] | string>;
  children: Array<PlasmicASTNode>;
  rawNode: JSXElement;
}

// This is a blob of expression that returns a JSX element. Unlike
// PlasmicJsxElement, it may have chrome such as
// "rh.showButton() && <Button...>...</Button>"
export interface PlasmicTagOrComponent extends PlasmicNodeBase {
  type: "tag-or-component";
  jsxElement: PlasmicJsxElement;
  rawNode: Expression | JSXExpressionContainer;
}

export type PlasmicASTNode =
  | PlasmicTagOrComponent
  | PlasmicOpaqueExpr
  | PlasmicArgRef
  | PlasmicStringLiteralExpr
  | PlasmicJsxText
  | PlasmicCondStringCall;

export const makeCallExpression = (
  objectName: string,
  memberFuncName: string
) => {
  return babel.types.callExpression(
    babel.types.memberExpression(
      babel.types.identifier(objectName),
      babel.types.identifier(memberFuncName)
    ),
    []
  );
};

export const wrapInJsxExprContainer = (expr: Expression) => {
  return babel.types.jsxExpressionContainer(expr);
};
