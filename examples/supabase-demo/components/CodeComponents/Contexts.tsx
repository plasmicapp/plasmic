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


export const contextTable: { [key: string]: React.Context<any> } = {
  mutation: SupabaseMutationContext,
  query: SupabaseQueryContext,
  form: FormContext,
};

export const useAllContexts = () => {
  const table = contextTable;
  const useContextTable = {
    mutation: useContext(table["mutation"]),
    query: useContext(table["query"]),
    form: useContext(table["form"]),
  };
  return useContextTable as any;
};
