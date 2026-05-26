import { ifTs } from "../../../utils/file-utils";
import { JsOrTs, PlasmicCssImport } from "../../../utils/types";

export function makeLayout_app_codegen(
  jsOrTs: JsOrTs,
  cssImports: PlasmicCssImport[] = []
): string {
  const plasmicCssImportLines = cssImports
    .map(
      (i) =>
        `import "${i.importPath}"; // plasmic-import: ${i.projectId}/projectcss`
    )
    .join("\n");
  const plasmicCssImportsBlock = plasmicCssImportLines
    ? `${plasmicCssImportLines}\n`
    : "";

  return `${plasmicCssImportsBlock}import '@/app/globals.css'
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";

export default function RootLayout({
  children,
}${ifTs(
    jsOrTs,
    `: Readonly<{
  children: React.ReactNode;
}>`
  )}) {
  return (
    <html lang="en">
      <body>
        <ClientPlasmicRootProvider>
          {children}
        </ClientPlasmicRootProvider>
      </body>
    </html>
  );
}
`;
}
