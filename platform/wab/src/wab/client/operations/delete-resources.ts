import { deleteStudioElementConfirm } from "@/wab/client/components/quick-modals";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import type { AddItemKey } from "@/wab/shared/add-item-keys";
import type { DefaultStyle } from "@/wab/shared/core/styles";
import type {
  AnimationSequence,
  ArenaFrame,
  Component,
  DataToken,
  ImageAsset,
  Mixin,
  StyleToken,
  StyleTokenOverride,
  Variant,
  VariantGroup,
} from "@/wab/shared/model/classes";

export interface UsageSummary {
  components?: Component[];
  frames?: ArenaFrame[];
  mixins?: Mixin[];
  styleTokens?: StyleToken[];
  styleTokenOverrides?: StyleTokenOverride[];
  themes?: DefaultStyle[];
  addItemPrefs?: AddItemKey[];
}

export type DeletableResource =
  | AnimationSequence
  | StyleToken
  | ImageAsset
  | DataToken
  | Mixin
  | Variant
  | VariantGroup;

export interface ResourceWithUsage<R extends DeletableResource> {
  resource: R;
  usageSummary: UsageSummary;
  usageCount: number;
}

export interface DeleteResourcesResult<R extends DeletableResource> {
  deletedResources: R[];
  messages: string[];
  errors?: string[];
  /** True when the user dismissed the confirmation dialog without deleting. */
  cancelled?: boolean;
}

/**
 * Generic resource deletion utility that handles changeObserved coordination,
 * optional confirmation dialogs, and structured error/success reporting.
 *
 * @param behaviour Deletion behavior:
 *   - "confirm-if-referenced" - show confirmation dialog if there are usages (for UI, default)
 *   - "delete-if-referenced" - delete even if referenced, no dialog (for copilot tools)
 *   - "error-if-referenced" - return error if referenced, don't delete (for copilot blocks)
 */
export async function deleteResourcesWithUsages<R extends DeletableResource>(
  studioCtx: StudioCtx,
  resourcesWithUsage: ResourceWithUsage<R>[],
  onDelete: (resource: R) => void,
  opts: {
    behaviour?:
      | "confirm-if-referenced"
      | "delete-if-referenced"
      | "error-if-referenced";
    deleteLabel: string;
  }
): Promise<DeleteResourcesResult<R>> {
  const messages: string[] = [];
  const errors: string[] = [];

  const behaviour = opts.behaviour ?? "confirm-if-referenced";
  const deleteLabel = opts.deleteLabel;
  const dialogTitle = `Deleting ${deleteLabel}`;

  // Filter resources with usages for confirmation dialog
  const resourcesWithUsages = resourcesWithUsage.filter(
    ({ usageCount }) => usageCount > 0
  );

  // Handle "error-if-referenced" mode
  if (behaviour === "error-if-referenced" && resourcesWithUsages.length > 0) {
    for (const { resource, usageSummary } of resourcesWithUsages) {
      const componentNames = (usageSummary.components ?? [])
        .map((c) => `${c.name || "unnamed"} (uuid: ${c.uuid})`)
        .join(", ");
      const frameNames = (usageSummary.frames ?? [])
        .map((f) => f.name || "unnamed")
        .join(", ");
      const locations = [
        componentNames && `components: ${componentNames}`,
        frameNames && `frames: ${frameNames}`,
      ]
        .filter(Boolean)
        .join("; ");
      errors.push(
        `Cannot delete "${getDeletableResourceLabel(resource)}" (uuid: ${
          resource.uuid
        }): still referenced in ${locations}.`
      );
    }
    return { deletedResources: [], messages, errors };
  }

  // Handle confirmation dialog when there are usages
  if (behaviour === "confirm-if-referenced" && resourcesWithUsages.length > 0) {
    const confirmed = await deleteStudioElementConfirm(
      dialogTitle,
      resourcesWithUsages.map(({ resource, usageSummary }) => ({
        element: resource,
        summary: usageSummary,
      }))
    );
    if (!confirmed) {
      errors.push(`Deletion of ${deleteLabel} was cancelled.`);
      return { deletedResources: [], messages, errors, cancelled: true };
    }
  }

  // Delete all resources that were passed in
  if (resourcesWithUsage.length > 0) {
    const affectedComponentsSet = new Set(
      resourcesWithUsage.flatMap(({ usageSummary }) => [
        ...(usageSummary.components ?? []),
        ...(usageSummary.frames ?? []).map((f) => f.container.component),
      ])
    );
    const affectedComponents = Array.from(affectedComponentsSet);

    await studioCtx.changeObserved<never, void>(
      () => affectedComponents,
      ({ success }) => {
        for (const { resource } of resourcesWithUsage) {
          onDelete(resource);
          messages.push(
            `Deleted ${deleteLabel} "${getDeletableResourceLabel(
              resource
            )}" (uuid: ${resource.uuid}).`
          );
        }
        return success();
      }
    );
  }

  return {
    deletedResources: resourcesWithUsage.map(({ resource }) => resource),
    messages,
    errors,
  };
}

function getDeletableResourceLabel(resource: DeletableResource) {
  return "name" in resource ? resource.name : resource.typeTag;
}
