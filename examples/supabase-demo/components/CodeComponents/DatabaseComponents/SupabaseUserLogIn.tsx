import { createSupabaseClient } from "@/util/supabase/component";
import { DataProvider } from "@plasmicapp/loader-nextjs";
import React from "react";

interface SupabaseUserLogInProps extends React.PropsWithChildren {
  className: string;
}

interface SupabaseUserLogInRef {
  login: (email: string, password: string) => Promise<{ success: boolean }>;
}

function SupabaseUserLogInBase(
  props: SupabaseUserLogInProps,
  outterRef: React.Ref<SupabaseUserLogInRef>
) {
  const { className, children } = props;
  const supabase = createSupabaseClient();
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const interactions = React.useMemo(
    () => ({
      async login(email: string, password: string) {
        setIsLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        setIsLoading(false);

        if (error) {
          setErrorMessage(error.message);
          return { success: false };
        }

        return { success: true };
      },
    }),
    []
  );

  React.useImperativeHandle(outterRef, () => interactions);

  return (
    <div className={className}>
      <DataProvider
        name="loginContext"
        data={{
          isLoading,
          loginError: errorMessage,
        }}
      >
        {children}
      </DataProvider>
    </div>
  );
}

export const SupabaseUserLogIn = React.forwardRef<
  SupabaseUserLogInRef,
  SupabaseUserLogInProps
>(SupabaseUserLogInBase);
