import "css-tree";

// @types/css-tree does not describe the public tokenizer API.
declare module "css-tree" {
  export const tokenTypes: {
    Function: number;
    LeftParenthesis: number;
    RightParenthesis: number;
    LeftSquareBracket: number;
    RightSquareBracket: number;
    LeftCurlyBracket: number;
    RightCurlyBracket: number;
    WhiteSpace: number;
    Comma: number;
  };
  export function tokenize(
    source: string,
    onToken: (type: number, start: number, end: number) => void,
  ): void;
}
