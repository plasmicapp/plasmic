import { setStyleTokenVariantedValue } from "@/wab/client/operations/set-style-token-varianted-value";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import { getVariantsByUuids } from "@/wab/shared/copilot/utils";
import { MutableToken, toFinalToken } from "@/wab/shared/core/tokens";
import { Site, StyleToken } from "@/wab/shared/model/classes";
import {
  serializeInvalidResource,
  serializeToken,
} from "@/wab/shared/web-exporter/project-exporter";

export const changeStyleTokensTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.changeStyleTokens,
  async (studioCtx, { changes }) => {
    const tplMgr = studioCtx.tplMgr();
    const site = studioCtx.site;

    const changed: StyleToken[] = [];
    const invalid: string[] = [];

    unwrap(
      await studioCtx.change<never, void>(({ success }) => {
        for (const change of changes) {
          const token = site.styleTokens.find(
            (t) => t.uuid === change.tokenUuid
          );
          if (!token) {
            invalid.push(
              serializeInvalidResource(
                change.tokenUuid,
                "token",
                `Style token with UUID "${change.tokenUuid}" not found.`
              )
            );
            continue;
          }

          const finalToken = toFinalToken(token, site);
          if (!(finalToken instanceof MutableToken)) {
            invalid.push(
              serializeInvalidResource(
                token.uuid,
                "token",
                `Token "${token.name}" is not editable. Registered or imported tokens cannot be changed.`
              )
            );
            continue;
          }

          if (change.name !== undefined) {
            if (!change.name.trim()) {
              invalid.push(
                serializeInvalidResource(
                  token.uuid,
                  "token",
                  `Failed to rename token "${token.name}": name cannot be empty.`
                )
              );
            } else {
              tplMgr.renameStyleToken(token, change.name);
            }
          }

          if (change.value !== undefined) {
            finalToken.setValue(change.value);
          }

          // Set token varianted values and collect any invalid inputs
          invalid.push(
            ...setStyleTokenVariantedValues(
              site,
              token,
              change.variantedValues ?? []
            )
          );

          changed.push(token);
        }
        return success();
      })
    );

    return [
      ...changed.map((t) => serializeToken(t, { site })),
      ...invalid,
    ].join("\n\n");
  }
);

/**
 * Apply a batch of varianted-value upserts/removes on a single style token.
 * Looks up each entry's variants by uuid; entries with unknown variant uuids
 * are skipped. Returns a list of `<invalid-resource>` strings (one per
 * skipped or failed entry) for the caller to append to its primary
 * serialized output.
 */
export function setStyleTokenVariantedValues(
  site: Site,
  token: StyleToken,
  variantedValues: { variantUuids: string[]; value: string | null }[]
): string[] {
  const invalid: string[] = [];
  for (const vv of variantedValues) {
    const { variants, invalidUuids } = getVariantsByUuids(vv.variantUuids, {
      site,
    });
    if (invalidUuids.length > 0) {
      invalid.push(
        serializeInvalidResource(
          vv.variantUuids.join(","),
          "variantedValue",
          `Skipped varianted value on token "${
            token.uuid
          }": global variant(s) not found: ${invalidUuids.join(", ")}.`
        )
      );
      continue;
    }

    const setResult = setStyleTokenVariantedValue({
      site,
      token,
      variants,
      value: vv.value,
    });

    if (setResult.result === "error") {
      invalid.push(
        serializeInvalidResource(
          vv.variantUuids.join(","),
          "variantedValue",
          `Failed to set varianted value on token "${token.uuid}": ${setResult.message}`
        )
      );
    }
  }
  return invalid;
}
