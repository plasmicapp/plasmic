import { AppCtx } from "@/wab/client/app-ctx";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { ApiDataSource } from "@/wab/shared/ApiSchema";
import { DATA_SOURCE_LOWER } from "@/wab/shared/Labels";

export async function confirmDeleteDataSource(
  appCtx: AppCtx,
  source: ApiDataSource,
  onUpdate: () => Promise<any>
) {
  if (
    await reactConfirm({
      message: `Are you sure you want to delete this ${DATA_SOURCE_LOWER}?`,
      confirmLabel: "Delete",
    })
  ) {
    await appCtx.api.deleteDataSource(source.id);
    await onUpdate();
  }
}
