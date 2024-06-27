import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { spawn } from "@/wab/shared/common";
import { TeamId } from "@/wab/shared/ApiSchema";
import { useEffect } from "react";

export function TeamSupportRedirect(props: { teamId: TeamId }) {
  const appCtx = useAppCtx();
  useEffect(() => {
    spawn(
      (async () => {
        const { publicSupportUrl, privateSupportUrl } =
          await appCtx.api.prepareTeamSupportUrls(props.teamId);
        if (privateSupportUrl) {
          location.replace(privateSupportUrl);
        } else {
          location.replace(publicSupportUrl);
        }
      })()
    );
  }, []);
  return null;
}
