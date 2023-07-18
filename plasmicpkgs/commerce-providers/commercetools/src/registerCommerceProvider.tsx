import { ClientResponse, Project } from "@commercetools/platform-sdk";
import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import React from "react";
import { getCommerceProvider } from "./commercetools";
import { getFetcher } from "./fetcher";
import { CommercetoolsCredentials } from "./provider";
import { Registerable } from "./registerable";
import {
  globalActionsRegistrations,
  CartActionsProvider,
} from "@plasmicpkgs/commerce";

interface CommerceProviderProps extends CommercetoolsCredentials {
  children?: React.ReactNode;
}

const globalContextName = "plasmic-commerce-commercetools-provider";

export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: globalContextName,
  displayName: "Commercetools Provider",
  props: {
    projectKey: {
      type: "string",
      defaultValue: "plasmic-demo",
    },
    clientId: {
      type: "string",
      defaultValue: "B4hmK61xvz5LvdSDtsFmcflM",
    },
    clientSecret: {
      type: "string",
      defaultValue: "KhzjcjSu1Oul4aomSmOsLZOCZKbvfHqx",
    },
    region: {
      type: "choice",
      options: [
        "us-central1.gcp",
        "us-east-2.aws",
        "europe-west1.gcp",
        "eu-central-1.aws",
        "australia-southeast1.gcp",
      ],
      defaultValue: "us-central1.gcp",
    },
  },
  unstable__globalActions: globalActionsRegistrations as any,
  importPath: "@plasmicpkgs/commercetools",
  importName: "CommerceProviderComponent",
};

export function CommerceProviderComponent(props: CommerceProviderProps) {
  const { children, projectKey, clientId, clientSecret, region } = props;

  const creds = React.useMemo(
    () => ({ projectKey, clientId, clientSecret, region }),
    [projectKey, clientId, clientSecret, region]
  );

  const {
    data: locale,
    error,
    isLoading,
  } = usePlasmicQueryData(JSON.stringify({ creds }) + "locale", async () => {
    const fetcher = getFetcher(creds);
    const project: ClientResponse<Project> = await fetcher({ method: "get" });
    return project.body ? project.body.languages[0] : undefined;
  });

  const CommerceProvider = React.useMemo(
    () => getCommerceProvider(creds, locale ?? ""),
    [creds, locale]
  );

  if (isLoading) {
    return null;
  } else if (error || !locale) {
    throw new Error(error ? error.message : "Project language not found");
  }

  return (
    <CommerceProvider>
      <CartActionsProvider globalContextName={globalContextName}>
        {children}
      </CartActionsProvider>
    </CommerceProvider>
  );
}

export function registerCommerceProvider(
  loader?: Registerable,
  customCommerceProviderMeta?: GlobalContextMeta<CommerceProviderProps>
) {
  const doRegisterComponent: typeof registerGlobalContext = (...args) =>
    loader
      ? loader.registerGlobalContext(...args)
      : registerGlobalContext(...args);
  doRegisterComponent(
    CommerceProviderComponent,
    customCommerceProviderMeta ?? commerceProviderMeta
  );
}
