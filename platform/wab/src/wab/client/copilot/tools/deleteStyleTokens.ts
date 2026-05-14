import { deleteStyleToken } from "@/wab/client/operations/delete-style-token";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import {
  TokenUsageSummary,
  extractTokenUsages,
} from "@/wab/shared/core/styles";
import { MutableToken, toFinalToken } from "@/wab/shared/core/tokens";
import { StyleToken } from "@/wab/shared/model/classes";
import { serializeInvalidResource } from "@/wab/shared/web-exporter/project-exporter";

export const deleteStyleTokensTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.deleteStyleTokens,
  async (studioCtx, { tokenUuids }) => {
    const site = studioCtx.site;
    const messages: string[] = [];
    const invalid: string[] = [];

    // Resolve uuids and collect each token's usage summary up-front so
    // we can hand the affected components to changeObserved.
    const tokensToDelete: { token: StyleToken; summary: TokenUsageSummary }[] =
      [];

    for (const uuid of tokenUuids) {
      const token = site.styleTokens.find((t) => t.uuid === uuid);
      if (!token) {
        invalid.push(
          serializeInvalidResource(
            uuid,
            "token",
            `Style token with UUID "${uuid}" not found.`
          )
        );
        continue;
      }

      const finalToken = toFinalToken(token, site);
      if (!(finalToken instanceof MutableToken)) {
        invalid.push(
          serializeInvalidResource(
            uuid,
            "token",
            `Token "${token.name}" cannot be deleted. Registered or imported tokens cannot be deleted.`
          )
        );
        continue;
      }

      const [, summary] = extractTokenUsages(site, token);
      tokensToDelete.push({ token, summary });
    }

    if (tokensToDelete.length > 0) {
      unwrap(
        await studioCtx.changeObserved<never, void>(
          () =>
            tokensToDelete.flatMap(({ summary }) => [
              ...summary.components,
              ...summary.frames.map((f) => f.container.component),
            ]),
          ({ success }) => {
            for (const { token } of tokensToDelete) {
              const { name, uuid } = token;
              deleteStyleToken({ site, token });
              messages.push(`Deleted style token "${name}" (uuid: ${uuid}).`);
            }
            return success();
          }
        )
      );
    }

    return [...messages, ...invalid].join("\n\n");
  }
);
