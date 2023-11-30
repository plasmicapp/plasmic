import { Mark, Node } from "@tiptap/core";
import type { BoldOptions } from "@tiptap/extension-bold";
import type { CodeOptions } from "@tiptap/extension-code";
import type { ItalicOptions } from "@tiptap/extension-italic";
import type { LinkOptions } from "@tiptap/extension-link";
import type { MentionOptions } from "@tiptap/extension-mention";
import type { StrikeOptions } from "@tiptap/extension-strike";
import type { UnderlineOptions } from "@tiptap/extension-underline";
import React, { useState } from "react";

export const RESET_TIMEOUT_MS = 500;
export interface TiptapContextProps {
  bold?: Mark<BoldOptions>;
  setBold: (boldOptions?: Mark<BoldOptions>) => void;
  code?: Mark<CodeOptions>;
  setCode: (codeOptions?: Mark<CodeOptions>) => void;
  italic?: Mark<ItalicOptions>;
  setItalic: (italicOptions?: Mark<ItalicOptions>) => void;
  link?: Mark<LinkOptions>;
  setLink: (linkOptions?: Mark<LinkOptions>) => void;
  mention?: Node<MentionOptions>;
  setMention: (mentionOptions?: Node<MentionOptions>) => void;
  strike?: Mark<StrikeOptions>;
  setStrike: (strikeOptions?: Mark<StrikeOptions>) => void;
  underline?: Mark<UnderlineOptions>;
  setUnderline: (underlineOptions?: Mark<UnderlineOptions>) => void;
}

export const allExtensions: Extract<keyof TiptapContextProps, string>[] = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
  "mention",
];

export const TiptapContext = React.createContext<
  TiptapContextProps | undefined
>(undefined);

export const useTiptapContext = () => {
  const context = React.useContext(TiptapContext);
  if (!context) {
    throw new Error(
      "useTiptapContext must be used within a TiptapContextProvider"
    );
  }
  return context;
};

export const TiptapContextProvider = ({ children }: any) => {
  const [bold, setBold] = useState<Mark<BoldOptions> | undefined>(undefined);
  const [code, setCode] = useState<Mark<CodeOptions> | undefined>(undefined);
  const [italic, setItalic] = useState<Mark<ItalicOptions> | undefined>(
    undefined
  );
  const [link, setLink] = useState<Mark<LinkOptions> | undefined>(undefined);
  const [mention, setMention] = useState<Node<MentionOptions> | undefined>(
    undefined
  );
  const [strike, setStrike] = useState<Mark<StrikeOptions> | undefined>(
    undefined
  );
  const [underline, setUnderline] = useState<
    Mark<UnderlineOptions> | undefined
  >(undefined);

  return (
    <TiptapContext.Provider
      value={{
        bold,
        setBold,
        code,
        setCode,
        italic,
        setItalic,
        link,
        setLink,
        mention,
        /**
         * In situations where I want to remove an extension and add it again with new options (e.g. within a useEffect - see registerMention)
         * the options are not updated.
         * So after removing the extension, I want to wait a few seconds before I add it again,
         * so the Tiptap editor acknowledges the removal before it adds the extension back with new updated options.
         * @param mentionOptions
         * @returns
         */
        setMention: (mentionOptions?: Node<MentionOptions>) => {
          if (!mentionOptions) {
            setMention(mentionOptions);
            return;
          }
          setTimeout(() => {
            setMention(mentionOptions);
          }, RESET_TIMEOUT_MS);
        },
        strike,
        setStrike,
        underline,
        setUnderline,
      }}
    >
      {children}
    </TiptapContext.Provider>
  );
};
