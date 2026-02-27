import '@/app/globals.css'
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Link from "next/link";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
