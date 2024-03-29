import { confirm } from "@/wab/client/components/quick-modals";

async function promptDeleteComponent(itemType, itemName) {
  return confirm({
    title: "Confirm deletion",
    confirmLabel: "Delete",
    message: `Are you sure you want to delete ${itemType} ${itemName}`,
  });
}

export default promptDeleteComponent;
