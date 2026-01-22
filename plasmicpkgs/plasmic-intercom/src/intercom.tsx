import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";

import React from "react";
import { IntercomProvider as Provider } from "react-use-intercom";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-intercom";

interface IntercomProviderProps {
  workSpaceId?: string;
  autoBoot?: boolean;
  buttonText?: string;
  shouldInitialize?: boolean;
  apiBase?: string;
  initializeDelay?: number;
  className?: string;
}
export const IntercomProviderMeta: CodeComponentMeta<IntercomProviderProps> = {
  name: "hostless-intercom",
  displayName: "Intercom Provider",
  importName: "IntercomProvider",
  importPath: modulePath,
  providesData: true,
  props: {
    workSpaceId: {
      type: "string",
      displayName: "Workspace ID",
      description: "ID of your workspace",
      helpText:
        "The easiest way to find your workspace ID is to check the URL of any page you have open in Intercom. It's the code that comes after apps/ in the URL.",
    },
    shouldInitialize: {
      type: "boolean",
      displayName: "Intercom Initialize",
      description:
        "indicates if the Intercom should be initialized. Can be used in multistaged environment",
    },
    initializeDelay: {
      type: "number",
      displayName: "Delay",
      description:
        "Indicates if the intercom initialization should be delayed, delay is in ms, defaults to 0",
    },
    apiBase: {
      type: "string",
      displayName: "Api Base",
      description:
        "If you need to route your Messenger requests through a different endpoint than the default. Generally speaking, this is not need",
    },
  },
};

export function IntercomProvider({
  apiBase,
  shouldInitialize,
  initializeDelay,
  workSpaceId,
}: IntercomProviderProps) {
  if (!workSpaceId) {
    return <div>Please enter your Workspace ID</div>;
  }

  return (
    <Provider
      appId={workSpaceId}
      autoBoot
      apiBase={apiBase}
      shouldInitialize={shouldInitialize}
      initializeDelay={initializeDelay}
    ></Provider>
  );
}
