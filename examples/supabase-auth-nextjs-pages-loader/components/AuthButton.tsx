import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/router";
import { useState } from "react";
import { mutate } from "swr";
import { PLASMIC_AUTH_DATA_KEY } from "../utils/cache-keys";

export function AuthButton(): JSX.Element {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const router = useRouter();
  return (
    <PlasmicComponent
      forceOriginal
      component="AuthButton"
      componentProps={{
        logoutBtn: {
          onClick: async () => {
            await supabaseClient.auth.signOut();
            await mutate(PLASMIC_AUTH_DATA_KEY);
            router.reload();
          },
        },
      }}
    />
  );
}
