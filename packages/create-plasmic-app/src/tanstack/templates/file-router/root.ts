import { JsOrTs } from "../../../utils/types";

export function makeCustomRoot_file_router_codegen(_jsOrTs: JsOrTs): string {
  return `import { createRootRoute, HeadContent, Outlet, Scripts, Link } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { PlasmicRootProvider } from "@plasmicapp/react-web"
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: () => (
    <RootDocument>
      <PlasmicRootProvider Link={Link}>
        <Outlet />
        <TanStackRouterDevtools />
      </PlasmicRootProvider>
    </RootDocument>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
`;
}
