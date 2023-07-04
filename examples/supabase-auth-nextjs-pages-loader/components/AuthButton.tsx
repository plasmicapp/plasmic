import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/router";
import { useState } from "react";
import { mutate } from "swr";

export function AuthButton(): JSX.Element {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const router = useRouter();
  return (
    <PlasmicComponent
      forceOriginal
      component="AuthButton"
      componentProps={{
        loginBtn: {
          onClick: () => {
            router.push("/");
          },
        },
        logoutBtn: {
          onClick: async () => {
            await supabaseClient.auth.signOut();
            await mutate("plasmic-auth-data");
            router.reload();
          },
        },
      }}
    />
  );
}
