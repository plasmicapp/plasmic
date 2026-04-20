import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { COPILOT_TOOL_DEFS } from "@/wab/shared/copilot/enterprise/copilot-tools";
import React from "react";

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

    (window as any).PLASMIC_AI_TOOLS = Object.fromEntries(
      Object.keys(COPILOT_TOOL_DEFS).map((name) => [
        name,
        (input: Record<string, unknown>) =>
          hostFrameApi.executeCopilotToolCall(name, input),
      ])
    );

    return () => {
      delete (window as any).PLASMIC_AI_TOOLS;
    };
  }, [hostFrameApiReady, hostFrameApi]);

  return null;
}
