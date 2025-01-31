import { Database } from "@/types/supabase";
import { createSupabaseClient } from "@/util/supabase/component";
import { Filter, applyFilter, isValidFilter } from "@/util/supabase/helpers";
import React, { ReactNode } from "react";

export interface SupabaseFormProps {
  children?: ReactNode;
  tableName?: keyof Database["public"]["Tables"];
  method?: "upsert" | "insert" | "update" | "delete";
  filters?: any;
  data?: any;
  onSuccess?: () => void;
  className?: string;
}
export function SupabaseForm(props: SupabaseFormProps) {
  const { children, tableName, method, filters, data, className, onSuccess } =
    props;
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
      switch (method) {
        case "update": {
          query = table.update(data);
          break;
        }
        case "upsert": {
          query = table.upsert(data);
        }
        case "insert": {
          query = table.insert(data);
        }
        case "delete": {
          query = table.delete();
        }
        default: {
          throw new Error("Invalid method");
        }
      }

      query = applyFilter(query, validFilters);
      const { error } = await query;

      if (error) {
        console.error(error);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
}
