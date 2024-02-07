import { CodeDisplay } from "@/wab/client/components/coding/CodeDisplay";
import { PlasmicDocsCodeSnippet } from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicDocsCodeSnippet";
import { Language } from "prism-react-renderer";
import * as React from "react";

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
