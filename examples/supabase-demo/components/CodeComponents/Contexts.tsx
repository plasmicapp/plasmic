import React, { MouseEvent, useContext } from "react";
import { Control } from "react-hook-form";

export const SupabaseQueryContext = React.createContext<any>(undefined);
export const SupabaseMutationContext = React.createContext<
  | {
      onSubmit: (formData: any) => Promise<void>;
    }
  | undefined
>(undefined);
export const FormContext = React.createContext<
  | {
      control: Control;
    }
  | undefined
>(undefined);
export const LogInContext = React.createContext<
  | {
      onSubmit: (data: any) => void;
      errorMessage?: string;
    }
  | undefined
>(undefined);

export const contextTable: { [key: string]: React.Context<any> } = {
  mutation: SupabaseMutationContext,
  query: SupabaseQueryContext,
  form: FormContext,
  logIn: LogInContext,
};

export const useAllContexts = () => {
  const table = contextTable;
  const useContextTable = {
    mutation: useContext(table["mutation"]),
    query: useContext(table["query"]),
    form: useContext(table["form"]),
    logIn: useContext(table["logIn"]),
  };
  return useContextTable as any;
};
