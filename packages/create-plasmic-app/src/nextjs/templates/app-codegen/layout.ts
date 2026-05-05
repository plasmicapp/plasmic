import { ifTs } from "../../../utils/file-utils";
import { JsOrTs } from "../../../utils/types";

export function makeLayout_app_codegen(jsOrTs: JsOrTs): string {
  return `import '@/app/globals.css'
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
