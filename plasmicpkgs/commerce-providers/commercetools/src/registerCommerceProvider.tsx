import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import React from "react";
import { Registerable } from "./registerable";
import { getCommerceProvider } from "./commercetools";
import { CommercetoolsCredentials } from "./provider";
import { usePlasmicQueryData } from "@plasmicapp/query"
import { getFetcher } from "./fetcher";
import {
  ClientResponse,
  Project
} from '@commercetools/platform-sdk'

interface CommerceProviderProps extends CommercetoolsCredentials {
  children?: React.ReactNode;
}

export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-commercetools-provider",
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
      options: ["us-central1.gcp", "us-east-2.aws", "europe-west1.gcp", "eu-central-1.aws", "australia-southeast1.gcp"],
      defaultValue: "us-central1.gcp",
    },
  },
  importPath: "@plasmicpkgs/commercetools",
  importName: "CommerceProviderComponent",
};

export function CommerceProviderComponent(props: CommerceProviderProps) {
  const { children, projectKey, clientId, clientSecret, region } = props;

  const creds = { projectKey, clientId, clientSecret, region };

  const { data: locale, error, isLoading } = usePlasmicQueryData(JSON.stringify({creds}) + "locale", async () => {
    const fetcher = getFetcher(creds);
    const project: ClientResponse<Project> = await fetcher({ method: "get"});
    return project.body ? project.body.languages[0] : undefined;
  });
  
  const CommerceProvider = getCommerceProvider(creds, locale ?? "");

  if (isLoading) {
    return null;
  } else if (error || !locale) {
    throw new Error(
      error ? error.message : "Project language not found"
    )
  }
  return <CommerceProvider>{children}</CommerceProvider>;
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
