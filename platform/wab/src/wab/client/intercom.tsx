import { ENV } from "@/wab/client/env";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { DEVFLAGS } from "@/wab/shared/devflags";
import React from "react";
import { IntercomProvider } from "react-use-intercom";

export function isIntercomEnabled(studioCtx: StudioCtx): boolean {
  const user = studioCtx.appCtx.selfInfo;
  const isFreeTier =
    studioCtx.siteInfo?.featureTier?.id === DEVFLAGS.freeTier.id;
  return !!ENV.INTERCOM_APP_ID && !!user && !isFreeTier;
}

export function IntercomProviderWrapper({ children }: React.PropsWithChildren) {
  const studioCtx = useStudioCtx();

  const user = studioCtx.appCtx.selfInfo;

  const autoBootProps = {
    userId: user?.id,
    email: user?.email,
    name: user ? fullName(user) : undefined,
    createdAt: user?.createdAt.toString(),
    hideDefaultLauncher: true,
    alignment: "left",
  };

  return (
    <IntercomProvider
      appId={ENV.INTERCOM_APP_ID ?? ""}
      autoBoot={isIntercomEnabled(studioCtx)}
      autoBootProps={autoBootProps}
    >
      {children}
    </IntercomProvider>
  );
}
