import { Database } from "@/types/supabase";
import { createSupabaseClient } from "@/util/supabase/component";
import { Filter, applyFilter, isValidFilter } from "@/util/supabase/helpers";
import {
  DataProvider,
  usePlasmicCanvasContext,
  useSelector,
} from "@plasmicapp/loader-nextjs";
import { useMutablePlasmicQueryData } from "@plasmicapp/query";
import { ReactNode } from "react";

export interface SupabaseDataProviderProps {
  children?: ReactNode;
  tableName?: keyof Database["public"]["Tables"];
  columns?: string[];
  className?: string;
  filters?: any;
  single?: boolean;
}

export function SupabaseDataProvider(props: SupabaseDataProviderProps) {
  const supabase = createSupabaseClient();
  const inEditor = usePlasmicCanvasContext();
  // These props are set in the Plasmic Studio
  const { children, tableName, columns, className, filters, single } = props;
  const currentUser = useSelector("auth");
  const validFilters = filters?.filter((f: any) => isValidFilter(f)) as
    | Filter[]
    | undefined;

  const selectFields = columns?.join(",") || "";

  // Error messages are currently rendered in the component
  if (!tableName) {
    return <p>You need to set the tableName prop</p>;
  } else if (!selectFields) {
    return <p>You need to set the columns prop</p>;
  }

  // Performs the Supabase query
  async function makeQuery() {
    // dont perform query if user is not logged in.
    // allow to query in editor mode for demo purposes
    if (!inEditor && !currentUser?.email) {
      return;
    }
    let query = supabase.from(tableName!).select(selectFields || "");
    query = applyFilter(query, validFilters);
    const { data, error, status } = await (single
      ? query.single()
      : query.order("id", { ascending: false }));

    if (error && status !== 406) {
      throw error;
    }
    return data;
  }

  // The first parameter is a unique cache key for the query.
  // If you want to update the cache - you are able to use the Refresh Data function in the Plasmic Studio.
  const { data } = useMutablePlasmicQueryData(
    `${tableName}-${JSON.stringify(filters)}`,
    async () => {
      try {
        return await makeQuery();
      } catch (err) {
        console.error(err);
        return {};
      }
      // As an additional way to control the cache flow - you are able to specify the revalidate options.
      // For example, you can revalidate the data on mount and on page focus, to make sure that data is always up-to-date.
      // If your data is mostly static - turn these options off.
    },
    { revalidateOnMount: true, revalidateOnFocus: true }
  );

  return (
    <div className={className}>
      <DataProvider name={tableName} data={data}>
        {children}
      </DataProvider>
    </div>
  );
}
