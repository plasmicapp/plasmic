import { confirm } from "@/wab/client/components/quick-modals";

async function promptDeleteComponent(itemType, itemName, commentCount = 0) {
  const commentLabel = commentCount > 1 ? "comments" : "comment";
  return confirm({
    title: "Confirm deletion",
    confirmLabel: "Delete",
    message: `Are you sure you want to delete ${itemType} ${itemName}${
      commentCount > 0
        ? `? It currently contains ${commentCount} unresolved ${commentLabel}.`
        : "?"
    }`,
  });
}

export default promptDeleteComponent;
