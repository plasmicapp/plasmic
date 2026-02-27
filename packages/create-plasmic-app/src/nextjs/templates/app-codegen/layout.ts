import { ifTs } from "../../../utils/file-utils";
import { JsOrTs } from "../../../utils/types";

export function makeLayout_app_codegen(jsOrTs: JsOrTs): string {
  return `import '@/app/globals.css'
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Link from "next/link";

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
        <PlasmicRootProvider Link={Link}>
          {children}
        </PlasmicRootProvider>
      </body>
    </html>
  );
}
`;
}
