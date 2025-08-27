import {
  choicePrompt,
  Command,
  stringPrompt,
} from "@/wab/client/commands/types";
import {
  StyleTokenType,
  tokenTypeLabel,
  tokenTypes,
} from "@/wab/commons/StyleToken";
import { StyleToken } from "@/wab/shared/model/classes";

export const addTokenCommand: Command<
  {
    name?: string;
    tokenType: StyleTokenType;
    value?: string;
  },
  {},
  StyleToken
> = {
  meta: () => ({
    id: "token.addToken",
    name: "token.addToken",
    title: "Add token",
    description: "Add a new stoken to the project",
    args: {
      name: stringPrompt({}),
      value: stringPrompt({}),
      tokenType: choicePrompt({
        options: tokenTypes.map((tokenType) => ({
          id: tokenType,
          value: tokenType,
          label: tokenTypeLabel(tokenType),
        })),
      }),
    },
  }),
  context: () => {
    return [{}];
  },
  execute: async (studioCtx, { name, tokenType, value }) => {
    return await studioCtx.change(({ success }) => {
      const token = studioCtx.tplMgr().addToken({
        name,
        tokenType,
        value,
      });
      return success(token);
    });
  },
};
