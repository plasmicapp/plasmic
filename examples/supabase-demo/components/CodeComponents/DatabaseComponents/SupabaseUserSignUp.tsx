import Alert from "antd/lib/alert";
import React from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import {
  LogInContext,
} from "../Contexts";

export function SupabaseUserSignUp({
    className,
    children,
    redirectOnSuccess,
  }: {
    className?: string;
    children?: React.ReactElement;
    redirectOnSuccess?: string;
  }) {
    const supabase = createSupabaseClient();
    const ref = React.createRef<HTMLAnchorElement>();
  
    const [errorMessage, setErrorMessage] = React.useState<string | undefined>(
      undefined
    );
    const onSubmit = async (formData: any) => {
      const {error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      console.log(error);
      if (error) {
        setErrorMessage(error.message);
      } else if (redirectOnSuccess) {
        ref.current?.click();
      }
    };
    return (
      <div className={className}>
        <LogInContext.Provider
          value={{
            onSubmit,
            errorMessage,
          }}
        >
          {children}
        </LogInContext.Provider>
        {errorMessage && <Alert message={errorMessage}></Alert>}
        {redirectOnSuccess && (
          <a href={redirectOnSuccess} ref={ref} hidden={true} />
        )}
      </div>
    );
  }
  