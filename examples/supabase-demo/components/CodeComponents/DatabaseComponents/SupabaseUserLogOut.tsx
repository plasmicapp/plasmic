import { createSupabaseClient } from "@/util/supabase/component";
import React from "react";

export function SupabaseUserLogOut({
  className,
  children,
  onSuccess,
}: {
  className?: string;
  children?: React.ReactElement;
  onSuccess: () => void;
}) {
  const supabase = createSupabaseClient();

  const onLogOut = async (e: React.FormEvent) => {
    e?.preventDefault();
    await supabase.auth.signOut();
    if (onSuccess) {
      onSuccess();
    }
  };
  return (
    <form onSubmit={onLogOut} className={className}>
      {children}
    </form>
  );
}
