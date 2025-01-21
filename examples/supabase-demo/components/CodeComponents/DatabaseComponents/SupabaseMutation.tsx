import React, { ReactNode } from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import {
  SupabaseMutationContext,
  useAllContexts,
} from "../Contexts";

import {
  Filter,
  applyFilter,
  getContextAndField,
  isContextValueRef,
  isValidFilter,
} from '@/util/supabase/helpers';



export interface SupabaseMutationProps {
    children?: ReactNode;
    tableName?: string;
    method?: "upsert" | "insert" | "update" | "delete";
    redirectOnSuccess?: string;
    filters?: any;
    data?: any;
    className?: string;
  }
  export function SupabaseMutation(props: SupabaseMutationProps) {
    const {
      children,
      tableName,
      method,
      redirectOnSuccess,
      filters,
      data,
      className,
    } = props;
    const supabase = createSupabaseClient();
    const ref = React.createRef<HTMLAnchorElement>();
  
    const contexts = useAllContexts();
  
    if (!tableName) {
      return <p>You need to set the tableName prop</p>;
    }
    if (!method) {
      return <p>You need to choose a method</p>;
    }
  
    if (method !== "delete" && !data) {
      return <p>You need to set the data prop</p>;
    }
  
    const validFilters = filters?.filter((f: any) => isValidFilter(f)) as
      | Filter[]
      | undefined;
  
    async function onSubmit(formData: any) {
      const { data: { user }} = await supabase.auth.getUser();
      const parsedData: any = { user_id: user!.id };
      for (const column in data) {
        if (!isContextValueRef(data[column])) {
          parsedData[column] = data[column];
        } else {
          const { contextName, field } = getContextAndField(data[column]);
          if (contextName === "form") {
            parsedData[column] = formData[field];
          } else {
            parsedData[column] = contexts[contextName];
          }
        }
      }
      try {
        const table = supabase.from(tableName!);
        let query: any;
        if (method === "update") {
          query = table.update(parsedData);
        } else if (method === "upsert") {
          query = table.upsert(parsedData);
        } else if (method === "insert") {
          query = table.insert(parsedData);
        } else if (method === "delete") {
          query = table.delete();
        }
  
        query = applyFilter(query, validFilters, contexts);
        const { data, error } = await query;
  
        if (error) {
          console.log(error);
        } else if (data) {
          if (redirectOnSuccess) {
            ref.current?.click();
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  
    return (
      <div className={className}>
        <SupabaseMutationContext.Provider
          value={{
            onSubmit,
          }}
        >
          {children}
        </SupabaseMutationContext.Provider>
        {redirectOnSuccess && (
          <a href={redirectOnSuccess} ref={ref} hidden={true} />
        )}
      </div>
    );
  }
  