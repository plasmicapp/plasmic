import React from "react";
import { createSupabaseClient } from "@/util/supabase/component";

export function SupabaseUserLogOut({
    className,
    children,
    redirectOnSuccess,
  }: {
    className?: string;
    children?: React.ReactElement;
    redirectOnSuccess?: string;
  }) {
    const supabase = createSupabaseClient();
    const ref = React.createRef<any>();
  
    const onLogOut = async () => {
      await supabase.auth.signOut();
      if (redirectOnSuccess) {
        ref.current.click();
      }
    };
    return (
      <div className={className}>
        {children &&
          React.cloneElement(children, { ...children.props, onClick: onLogOut })}
        {redirectOnSuccess && (
          <a href={redirectOnSuccess} hidden={true} ref={ref} />
        )}
      </div>
    );
  }
  