import { User } from "@supabase/gotrue-js";
import React, { MouseEvent, useContext } from "react";
import { Control } from "react-hook-form";

export const SupabaseUserSessionContext = React.createContext<
  Partial<User> | undefined
>(undefined);
export const SupabaseQueryContext = React.createContext<any>(undefined);
export const RowContext = React.createContext<any>(undefined);
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
export const DeleteButtonContext = React.createContext<
  | {
      id: string;
      count: number;
      onCancel: (e: MouseEvent) => void;
      onOk: (e: MouseEvent) => void;
    }
  | undefined
>(undefined);

export const contextTable: { [key: string]: React.Context<any> } = {
  mutation: SupabaseMutationContext,
  query: SupabaseQueryContext,
  session: SupabaseUserSessionContext,
  form: FormContext,
  row: RowContext,
  logIn: LogInContext,
  delete: DeleteButtonContext,
};

export const useAllContexts = () => {
  const table = contextTable;
  const useContextTable = {
    mutation: useContext(table["mutation"]),
    query: useContext(table["query"]),
    session: useContext(table["session"]),
    form: useContext(table["form"]),
    row: useContext(table["row"]),
    logIn: useContext(table["logIn"]),
    delete: useContext(table["delete"]),
  };
  return useContextTable as any;
};
