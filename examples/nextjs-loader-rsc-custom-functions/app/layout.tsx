import "@/styles/globals.css";

export const metadata = {
  title: "Plasmic Next.js App Router RSC example",
  description: "Plasmic loader example with custom functions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
