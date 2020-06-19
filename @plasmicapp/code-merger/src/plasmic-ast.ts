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
  JSXExpressionContainer
} from "@babel/types";
import * as babel from "@babel/core";
import * as L from "lodash";
import generate from "@babel/generator";
import { cloneDeepWithHook } from "./cloneDeepWithHook";
import { assert, withoutNils, ensure } from "./common";

export interface PlasmicNodeBase {
  rawNode:
    | Expression
    | JSXEmptyExpression
    | JSXExpressionContainer
    | JSXSpreadChild
    | JSXFragment
    | JSXText;
}

export interface PlasmicOpaqueExpr extends PlasmicNodeBase {
  type: "opaque";
}

export interface PlasmicChildStringCall extends PlasmicNodeBase {
  type: "child-str-call";
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
  // This is the effective value, which is trimmed.
  value: string;
  rawNode: JSXText;
}

// Plasmic can merge two expressions both are sound. An expression is sound if
// it is a fragment, or if it is a single sound PlasmicTagOrComponent.
export interface PlasmicJSXFragment extends PlasmicNodeBase {
  type: "jsx-fragment";
  children: PlasmicASTNode[];
  rawNode: JSXFragment;
}

export interface PlasmicJsxElement extends PlasmicNodeBase {
  nameInId: string;
  // A list of JSXAttribute or JSXSpreadAttribute. The value of a JSXAttribute
  // could be null (such as disabled in <div disabled/>).
  // For JSXSpreadAttribute, the value is a single PlasmicASTNode, which
  // represents the value of the spread argument.
  attrs: Array<[string, PlasmicASTNode | null] | PlasmicASTNode>;
  children: PlasmicASTNode[];
  rawNode: JSXElement;
}

// This is a blob of expression that returns a JSX element. Unlike
// PlasmicJsxElement, it may have chrome such as
// "rh.showButton() && <Button...>...</Button>"
//
// A PlasmicTagOrComponent is sound if the expression it represents contains
// only one PlasmicJSXElement.
//
// For example, these are sound
//   <><div></div><>
//   show2() && <div/>
//   <div></div>
//   () => {
//     return <div/>;
//   }()
//
// These are not sound expression
//   () => {
//     return <><div/><div/></>;
//   }()
//
//   showFirst ? <div/> : <div/>
export interface PlasmicTagOrComponent extends PlasmicNodeBase {
  type: "tag-or-component";
  jsxElement: PlasmicJsxElement;
  rawNode: Expression | JSXExpressionContainer;
  sound: boolean;
}

export type PlasmicASTNode =
  | PlasmicTagOrComponent
  | PlasmicOpaqueExpr
  | PlasmicStringLiteralExpr
  | PlasmicJsxText
  | PlasmicChildStringCall
  | PlasmicJSXFragment;

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
