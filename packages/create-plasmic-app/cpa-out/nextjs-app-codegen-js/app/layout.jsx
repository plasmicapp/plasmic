import '@/app/globals.css'
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";

export default function RootLayout({
  children,
}) {
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
