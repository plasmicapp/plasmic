import type { Pattern } from "regex/types/pattern";

// Allow patterns to be substituted into other patterns.
// See discussion here: https://github.com/slevithan/regex/pull/20
declare module "regex" {
  export function pattern(
    template: TemplateStringsArray,
    ...substitutions: (string | Pattern)[]
  ): Pattern;
}
