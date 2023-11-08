import { observer } from "mobx-react-lite";
import React from "react";
import { exportReactPlainTypical } from "../../../../shared/codegen/react-p/plain";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { CodeDisplay } from "../../coding/CodeDisplay";
import { ObserverLoadable } from "../../widgets";
import sty from "./CodePreviewPanel.module.css";

export const CodePreviewPanel = observer(function CodePreviewPanel(props: {
  studioCtx: StudioCtx;
}) {
  const { studioCtx } = props;
  const vc = studioCtx.focusedViewCtx();
  if (!vc) {
    return null;
  }
  const module = exportReactPlainTypical(
    studioCtx.site,
    studioCtx.siteInfo.name,
    studioCtx.siteInfo.id,
    vc.component
  );

  const loader = () =>
    import("prettier").then((Prettier) =>
      import("prettier/parser-typescript").then(
        ({ default: parserTypeScript }) => {
          const formatted = Prettier.format(module, {
            parser: "typescript",
            plugins: [parserTypeScript],
            trailingComma: "none",
          });
          return formatted;
        }
      )
    );

  const contents = (formatted: string) => {
    return (
      <div className={sty.root}>
        <CodeDisplay language="tsx" className={sty.codeDisplay}>
          {formatted}
        </CodeDisplay>
      </div>
    );
  };

  return <ObserverLoadable<string> loader={loader} contents={contents} />;
});
