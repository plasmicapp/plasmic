import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { spawn } from "@/wab/shared/common";
import { BASE_URL } from "@/wab/shared/discourse/config";
import { useEffect } from "react";

export function DiscourseConnectClient() {
  const appCtx = useAppCtx();
  useEffect(() => {
    spawn(
      (async () => {
        const params = await appCtx.api.discourseConnect(location.search);

        const url = new URL(`${BASE_URL}/session/sso_login`);
        url.search = new URLSearchParams(params).toString();

        location.replace(url.toString());
      })()
    );
  }, []);
  return null;
}
