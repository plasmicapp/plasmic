import { ApiDataSource } from "../../shared/ApiSchema";
import { DATA_SOURCE_LOWER } from "../../shared/Labels";
import { AppCtx } from "../app-ctx";
import { reactConfirm } from "./quick-modals";

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
