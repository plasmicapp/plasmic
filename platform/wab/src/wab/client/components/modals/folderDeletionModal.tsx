import { confirm } from "@/wab/client/components/quick-modals";
import pluralize from "pluralize";

export async function promptDeleteFolder(itemType, path, itemCount = 0) {
  return confirm({
    title: "Confirm deletion",
    confirmLabel: "Delete",
    message: `Are you sure you want to delete folder ${path}${
      itemCount > 0
        ? ` and all its contents? It currently contains ${itemCount} ${pluralize(
            itemType,
            itemCount
          )}.`
        : "?"
    }`,
  });
}
