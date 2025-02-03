import { createSupabaseClient } from "@/util/supabase/component";
import { DataProvider } from "@plasmicapp/loader-nextjs";
import React from "react";

interface SupabaseUserSignUpProps extends React.PropsWithChildren {
  className: string;
}

interface SupabaseUserSignUpRef {
  signup: (email: string, password: string) => Promise<{ success: boolean }>;
}

function SupabaseUserSignUpBase(
  props: SupabaseUserSignUpProps,
  outterRef: React.Ref<SupabaseUserSignUpRef>
) {
  const { className, children } = props;
  const supabase = createSupabaseClient();
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const interactions = React.useMemo(
    () => ({
      async signup(email: string, password: string) {
        setIsLoading(true);

        const { error } = await supabase.auth.signUp({
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
        name="signupContext"
        data={{
          isLoading,
          signupError: errorMessage,
        }}
      >
        {children}
      </DataProvider>
    </div>
  );
}

export const SupabaseUserSignUp = React.forwardRef<
  SupabaseUserSignUpRef,
  SupabaseUserSignUpProps
>(SupabaseUserSignUpBase);
