
import React, { ReactNode } from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import { useMutablePlasmicQueryData } from '@plasmicapp/react-web/lib/query';

import { DataProvider, useSelector } from '@plasmicapp/loader-nextjs';
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
    const currentUser = useSelector('auth');
    const validFilters = filters?.filter((f: any) => isValidFilter(f)) as
      | Filter[]
      | undefined;
  
    React.useEffect(() => {
      makeQuery();
    }, [columns, tableName, filters, single]);
  
    // Error messages are currently rendered in the component
    if (!tableName) {
      return <p>You need to set the tableName prop</p>;
    } else if (!columns) {
      return <p>You need to set the columns prop</p>;
    }
  
    // Performs the Supabase query
    async function makeQuery() {
      // dont perform query if user is not logged in
      if (!currentUser) {
        return;
      }
      let query = supabase.from(tableName!).select(columns + ",id");
      query = applyFilter(query, validFilters);
      const { data, error, status } = await (single
        ? query.single()
        : query.order("id", { ascending: false }));

      if (error && status !== 406) {
        throw error;
      }
      return data;
    }

    const { data } = useMutablePlasmicQueryData(`${tableName}-${JSON.stringify(filters)}`, async () => {
      try {
        return await makeQuery();
      } catch (err) {
        console.error(err);
        return {};
      }
    }, {revalidateOnMount: true, revalidateOnFocus: true, });
  
    return (
      <div className={className}>
        <DataProvider name={tableName} data={data}>
          {children}
        </DataProvider>
      </div>
    );
  }