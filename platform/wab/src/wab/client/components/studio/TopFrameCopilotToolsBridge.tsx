import { serializeCopilotError } from "@/wab/client/frame-ctx/host-frame-api";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { analytics } from "@/wab/client/observability";
import { COPILOT_TOOL_DEFS } from "@/wab/shared/copilot/enterprise/copilot-tools";
import React from "react";
import { z } from "zod";

const aiClientMetaSchema = z.object({
  client: z.string().trim().min(1),
  model: z.string().trim().min(1),
  skill: z.string().trim().min(1),
});

type AiClientMeta = z.infer<typeof aiClientMetaSchema>;

/**
 * Invisible bridge component that exposes `window.PLASMIC_AI_TOOLS` on the top
 * frame (localhost:3003), allowing chrome-devtools-mcp's `evaluate_script` to
 * call plasmic copilot tools. The studio editor itself runs in a cross-origin
 * host iframe (localhost:3005) that is not directly selectable via
 * chrome-devtools-mcp, so we expose the tools here and delegate each call to
 * `hostFrameApi.executeCopilotToolCall()` which crosses the frame boundary via
 * Comlink.
 */
export function TopFrameCopilotToolsBridge() {
  const { hostFrameApi, hostFrameApiReady } = useTopFrameCtx();

  React.useEffect(() => {
    if (!hostFrameApiReady) {
      return;
    }

    let aiClientMeta: AiClientMeta | undefined;

    const plasmic_ai_tools = {
      identify: (meta: AiClientMeta) => {
        const aiClienMetaValidation = aiClientMetaSchema.safeParse(meta);
        if (!aiClienMetaValidation.success) {
          return {
            success: false,
            error: {
              message: `Invalid identify payload. All fields (client, model, skill) must be non-empty strings.`,
              type: "EXECUTION_FAILED",
            },
          };
        }

        aiClientMeta = aiClienMetaValidation.data;
        analytics().track("AI tools identify", {
          client: aiClientMeta.client,
          model: aiClientMeta.model,
          skill: aiClientMeta.skill,
        });
        return { success: true, message: "Session identified." };
      },
      ...Object.fromEntries(
        Object.keys(COPILOT_TOOL_DEFS).map((name) => [
          name,
          async (input: Record<string, unknown>) => {
            if (!aiClientMeta) {
              return {
                success: false,
                error: {
                  message: `call window.PLASMIC_AI_TOOLS.identify() once before any other tool. All fields are required.
   () => {
     return window.PLASMIC_AI_TOOLS.identify({
       model: "<your-model>",
       client: "<your-client>",
       skill: "<your-skill>",
     });
   };

   Fields (all required):
   - model — Model name as known to the agent (e.g. claude-opus-4-7, anthropic/claude-sonnet-4-6, gpt-5.3-codex).
   - client — AI client/CLI invoking the tool (e.g. claude-code, claude-code@1.x, opencode, cursor, cline).
   - skill — Skill name and version being used (e.g. plasmic-designer@1.0.0, unknown).

   Pass "unknown" for any field you cannot reliably identify.`,
                  type: "EXECUTION_FAILED",
                },
              };
            }

            const startMs = Date.now();
            const result = await hostFrameApi.executeCopilotToolCall(
              name,
              input
            );
            const durationMs = Math.round(Date.now() - startMs);

            const inputSize = (() => {
              try {
                return JSON.stringify(input).length;
              } catch {
                return undefined;
              }
            })();

            analytics().track("AI ToolCall", {
              toolName: name,
              success: result.success,
              errorMessage: result.success
                ? undefined
                : serializeCopilotError(result.error),
              durationMs,
              inputSize,
              outputSize: result.success ? result.output.length : undefined,
              client: aiClientMeta.client,
              model: aiClientMeta.model,
              skill: aiClientMeta.skill,
            });

            return result;
          },
        ])
      ),
    };

    (window as any).PLASMIC_AI_TOOLS = plasmic_ai_tools;

    return () => {
      delete (window as any).PLASMIC_AI_TOOLS;
    };
  }, [hostFrameApiReady, hostFrameApi]);

  return null;
}
