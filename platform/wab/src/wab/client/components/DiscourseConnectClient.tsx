import { useEffect } from "react";
import { spawn } from "../../common";
import { useAppCtx } from "../contexts/AppContexts";

export function DiscourseConnectClient() {
  const appCtx = useAppCtx();
  useEffect(() => {
    spawn(
      (async () => {
        const params = await appCtx.api.discourseConnect(location.search);

        const url = new URL("https://forum.plasmic.app/session/sso_login");
        url.search = new URLSearchParams(params).toString();

        location.replace(url.toString());
      })()
    );
  }, []);
  return null;
}
