import { PlasmicCanvasContext } from "@plasmicapp/host";
import { User } from "@supabase/supabase-js";
import React, { useContext } from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import {
  SupabaseUserSessionContext,
} from "../Contexts";

export function SupabaseUserSession({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) {
    const supabase = createSupabaseClient();
    const [user, setUser] = React.useState<User | null>(null);
  
    const inEditor = useContext(PlasmicCanvasContext);
    React.useEffect(() => {
      if (inEditor) {
        supabase.auth.onAuthStateChange((event, session) => {
          if (event == "SIGNED_OUT") setUser(null);
          else if (event === "SIGNED_IN" && session) setUser(session.user);
        });
      }
    }, [user]);
  
    return (
      <div className={className}>
        <SupabaseUserSessionContext.Provider value={{ ...user }}>
          {children}
        </SupabaseUserSessionContext.Provider>
      </div>
    );
  }
  