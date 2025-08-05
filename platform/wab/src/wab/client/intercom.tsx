import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { DEVFLAGS } from "@/wab/shared/devflags";
import React from "react";
import { IntercomProvider } from "react-use-intercom";

// TO DO: move to the .env variables with the rest of the analytics variables
const INTERCOM_APP_ID = "wy0ngfce";

export function IntercomProviderWrapper({ children }: React.PropsWithChildren) {
  const studioCtx = useStudioCtx();

  const user = studioCtx.appCtx.selfInfo;
  const isFreeTier =
    studioCtx.siteInfo?.featureTier?.id === DEVFLAGS.freeTier.id;

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
      appId={INTERCOM_APP_ID}
      autoBoot={!!user && !isFreeTier}
      autoBootProps={autoBootProps}
    >
      {children}
    </IntercomProvider>
  );
}
