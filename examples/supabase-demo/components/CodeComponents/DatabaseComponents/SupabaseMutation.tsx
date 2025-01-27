import React, { ReactNode } from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import {
  Filter,
  applyFilter,
  isValidFilter,
} from '@/util/supabase/helpers';
import { Database } from "@/types/supabase";

export interface SupabaseMutationProps {
    children?: ReactNode;
    tableName?: keyof Database["public"]["Tables"];
    method?: "upsert" | "insert" | "update" | "delete";
    filters?: any;
    data?: any;
    onSuccess?: () => void;
    className?: string;
  }
  export function SupabaseMutation(props: SupabaseMutationProps) {
    const {
      children,
      tableName,
      method,
      filters,
      data,
      className,
      onSuccess
    } = props;
    const supabase = createSupabaseClient();
  
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
  
    async function onSubmit(e: React.FormEvent) {
      e?.preventDefault();
      try {
        const table = supabase.from(tableName!);
        let query: any;
        if (method === "update") {
          query = table.update(data);
        } else if (method === "upsert") {
          query = table.upsert(data);
        } else if (method === "insert") {
          query = table.insert(data);
        } else if (method === "delete") {
          query = table.delete();
        }
        
        query = applyFilter(query, validFilters);
        const { error } = await query;

        if (error) {
          console.log(error);
        } else if (onSuccess) {
          console.log(onSuccess);
          onSuccess();
        }
      } catch (error) {
        console.log(error);
      }
    }
  
    return (
      <form onSubmit={onSubmit} className={className}>
          {children}
      </form>
    );
  }
  