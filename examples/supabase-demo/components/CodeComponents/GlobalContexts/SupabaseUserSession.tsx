import { createSupabaseClient } from "@/util/supabase/component";
import {
  DataProvider,
  usePlasmicCanvasContext,
} from "@plasmicapp/loader-nextjs";
import { User } from "@supabase/supabase-js";
import React from "react";

export function SupabaseUserSession({
  children,
  staticToken,
}: {
  className?: string;
  staticToken?: string;
  children?: React.ReactNode;
}) {
  const supabase = createSupabaseClient();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  const inEditor = usePlasmicCanvasContext();

  React.useEffect(() => {
    if (inEditor) {
      if (staticToken) {
        supabase.auth
          .getUser(staticToken)
          .then((res) => setCurrentUser(res.data.user));
      }
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event == "SIGNED_OUT") setCurrentUser(null);
      else if (["SIGNED_IN", "INITIAL_SESSION"].includes(event) && session)
        setCurrentUser(session.user);
    });

    return subscription.unsubscribe;
  }, []);

  return (
    <DataProvider name="auth" data={currentUser || {}}>
      {children}
    </DataProvider>
  );
}
