import { DataProvider, PlasmicCanvasContext } from "@plasmicapp/host";
import { User } from "@supabase/supabase-js";
import React, { useContext } from "react";
import { createSupabaseClient } from "@/util/supabase/component";

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

    const inEditor = useContext(PlasmicCanvasContext);
    
    React.useEffect(() => {
        if (inEditor && staticToken) {
          supabase.auth.getUser(staticToken).then((res) => setCurrentUser(res.data.user));
          return;
        }
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event == "SIGNED_OUT") setCurrentUser(null);
          else if (event === "SIGNED_IN" && session) setCurrentUser(session.user);
        });

        return subscription.unsubscribe;
    }, []);
  
    return (
      <DataProvider name="auth" data={currentUser || {}}>
          {children}
      </DataProvider>
    );
  }
  