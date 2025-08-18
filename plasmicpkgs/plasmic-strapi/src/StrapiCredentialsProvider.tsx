import { GlobalContextMeta } from "@plasmicapp/host";
import React, { useContext } from "react";
import { modulePath } from "./utils";

interface StrapiCredentials {
  host?: string;
  token?: string;
}

const StrapiCredentialsContext = React.createContext<
  StrapiCredentials | undefined
>(undefined);

export function useStrapiCredentials() {
  const creds = useContext(StrapiCredentialsContext);
  if (!creds) {
    throw new Error("Missing StrapiCredentials");
  }

  return creds;
}

export const strapiCredentialsProviderMeta: GlobalContextMeta<StrapiCredentials> =
  {
    name: "StrapiCredentialsProvider",
    displayName: "Strapi Credentials Provider",
    description: `[See tutorial video](https://www.youtube.com/watch?v=1SLoVY3hkQ4).

API token is needed only if data is not publicly readable.

Learn how to [get your API token](https://docs.strapi.io/user-docs/latest/settings/managing-global-settings.html#managing-api-tokens).`,
    importName: "StrapiCredentialsProvider",
    importPath: modulePath,
    props: {
      host: {
        type: "string",
        displayName: "Host",
        defaultValueHint: "https://your_project_id.strapiapp.com/",
        defaultValue: "https://graceful-belief-d395c347a3.strapiapp.com/",
        description: "Server where you application is hosted.",
      },
      token: {
        type: "string",
        displayName: "API Token",
        description:
          "API Token (generated in http://yourhost/admin/settings/api-tokens) (or leave blank for unauthenticated usage).",
      },
    },
  };

export function StrapiCredentialsProvider({
  host,
  token,
  children,
}: React.PropsWithChildren<StrapiCredentials>) {
  host = host?.replace(/\/+$/, "");
  return (
    <StrapiCredentialsContext.Provider value={{ host, token }}>
      {children}
    </StrapiCredentialsContext.Provider>
  );
}
