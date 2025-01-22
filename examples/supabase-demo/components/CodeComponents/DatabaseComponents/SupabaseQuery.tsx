
import React, { ReactNode } from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import {
  useAllContexts,
} from "../Contexts";

import { DataProvider } from '@plasmicapp/host';
import {
  Filter,
  applyFilter,
  isValidFilter,
} from '@/util/supabase/helpers';

export interface SupabaseQueryProps {
    children?: ReactNode;
    tableName?: string;
    columns?: string;
    className?: string;
    filters?: any;
    single?: boolean;
  }
  
  export function SupabaseQuery(props: SupabaseQueryProps) {
    const supabase = createSupabaseClient();
  
    // These props are set in the Plasmic Studio
    const { children, tableName, columns, className, filters, single } = props;
    const [result, setResult] = React.useState<any[] | any>(undefined);
    const [loading, setLoading] = React.useState<boolean>(false);
    const contexts = useAllContexts();
    const validFilters = filters?.filter((f: any) => isValidFilter(f)) as
      | Filter[]
      | undefined;
  
    // Only query if the user is logged in
    React.useEffect(() => {
        // TO DO: replace this with a static call from the global auth context, not implemented yet!!
        // Otherwise this would trigger a network call within every query component
        //   const user = supabase.auth.user();
        const user = true;
      if (user || true) {
        // Bypass the user check for now
        makeQuery();
      } else {
        setResult(undefined);
      }
    }, [columns, tableName, filters, single]);
  
    // Error messages are currently rendered in the component
    if (!tableName) {
      return <p>You need to set the tableName prop</p>;
    } else if (!columns) {
      return <p>You need to set the columns prop</p>;
    }
  
    // Performs the Supabase query
    async function makeQuery() {
      try {
        setLoading(true);
        let query = supabase.from(tableName!).select(columns + ",id");
        query = applyFilter(query, validFilters, contexts);
        const { data, error, status } = await (single
          ? query.single()
          : query.order("id", { ascending: false }));
  
        if (error && status !== 406) {
          throw error;
        } else if (data) {
          setResult(data);
        }
      } catch (error) {
        // Just log query errors at the moment
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
  
    return (
      <div className={className}>
        <DataProvider name={tableName} data={result}>
          {children}
        </DataProvider>
      </div>
    );
  }