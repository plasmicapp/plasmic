import { useApi } from "@/wab/client/contexts/AppContexts";
import { getDataSourceMeta } from "@/wab/shared/data-sources-meta/data-source-registry";
import useSWR from "swr";

export function useSourceOp(
  sourceId: string | undefined,
  opName: string | undefined
) {
  const api = useApi();

  const { data: source, error: sourceError } = useSWR(
    () => (sourceId ? `/data-sources/${sourceId}` : null),
    async () => {
      return await api.getDataSourceById(sourceId!).catch((err) => {
        console.log(`Error fetching data-source ${sourceId}`, err);
        throw err;
      });
    }
  );
  const sourceMeta = source ? getDataSourceMeta(source.source) : undefined;
  const opMeta =
    sourceMeta && opName
      ? sourceMeta.ops.find((op) => op.name === opName)
      : undefined;

  return { source, sourceError, sourceMeta, opMeta };
}
