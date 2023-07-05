import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/router";
import { useState } from "react";
import { mutate } from "swr";

export function AuthForm(): JSX.Element {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const router = useRouter();
  return (
    <PlasmicComponent
      forceOriginal
      component="AuthForm"
      componentProps={{
        handleSubmit: async (
          mode: "signIn" | "signUp",
          credentials: {
            email: string;
            password: string;
          }
        ) => {
          if (mode === "signIn") {
            await supabaseClient.auth.signInWithPassword(credentials);
          } else {
            await supabaseClient.auth.signUp(credentials);
          }
          await mutate("plasmic-auth-data");
          router.push("/");
        },
      }}
    />
  );
}
