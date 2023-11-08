import { Language } from "prism-react-renderer";
import * as React from "react";
import { PlasmicDocsCodeSnippet } from "../../plasmic/plasmic_kit_docs_portal/PlasmicDocsCodeSnippet";
import { CodeDisplay } from "../coding/CodeDisplay";

interface DocsCodeSnippetProps {
  language: Language;
  children: string;
  className?: string;
}

function DocsCodeSnippet(props: DocsCodeSnippetProps) {
  const { language, children, className } = props;
  return (
    <PlasmicDocsCodeSnippet
      root={{ className }}
      children={<CodeDisplay language={language} children={children} />}
    />
  );
}

export default DocsCodeSnippet;
