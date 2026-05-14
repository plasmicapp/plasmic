import { setStyleTokenVariantedValues } from "@/wab/client/copilot/tools/changeStyleTokens";
import { createStyleToken } from "@/wab/client/operations/create-style-token";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import { StyleToken } from "@/wab/shared/model/classes";
import {
  serializeInvalidResource,
  serializeToken,
} from "@/wab/shared/web-exporter/project-exporter";

export const createStyleTokensTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.createStyleTokens,
  async (studioCtx, { tokens }) => {
    const tplMgr = studioCtx.tplMgr();
    const site = studioCtx.site;

    const created: StyleToken[] = [];
    const invalid: string[] = [];

    unwrap(
      await studioCtx.change<never, void>(({ success }) => {
        for (const tokenInput of tokens) {
          const result = createStyleToken({
            tplMgr,
            name: tokenInput.name,
            type: tokenInput.type,
            value: tokenInput.value,
          });
          if (result.result === "error") {
            invalid.push(
              serializeInvalidResource(
                tokenInput.name,
                "token",
                `Failed to create token "${tokenInput.name}": ${result.message}`
              )
            );
            continue;
          }

          created.push(result.token);

          // Set token varianted values and collect any invalid inputs
          invalid.push(
            ...setStyleTokenVariantedValues(
              site,
              result.token,
              tokenInput.variantedValues ?? []
            )
          );
        }
        return success();
      })
    );

    return [
      ...created.map((t) => serializeToken(t, { site })),
      ...invalid,
    ].join("\n\n");
  }
);
