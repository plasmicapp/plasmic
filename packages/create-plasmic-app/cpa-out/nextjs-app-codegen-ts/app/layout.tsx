import "../components/plasmic/create_plasmic_app/plasmic.css"; // plasmic-import: 47tFXWjN2C4NyHFGGpaYQ3/projectcss
import '@/app/globals.css'
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
