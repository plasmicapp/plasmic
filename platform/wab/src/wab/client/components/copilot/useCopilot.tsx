import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import {
  CopilotInteraction,
  CopilotPrompt,
  CopilotType,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { trackEvent } from "@/wab/client/tracking";
import { CopilotInteractionId } from "@/wab/shared/ApiSchema";

export interface CopilotData<R> {
  displayMessage: string | undefined;
  response: R | undefined;
  copilotInteractionId: CopilotInteractionId | undefined;
  // metadata for trackCopilotQuery
  context?: string;
  currentValue?: string;
  data?: any;
}

interface UseCopilotProps<Response> {
  showHistory: boolean;
  promptSubmitted: boolean;
  type: CopilotType;
  copilotPrompt: CopilotPrompt;
  onCopilotSubmit: (args: CopilotPrompt) => Promise<CopilotData<Response>>;
}

type CopilotState =
  | "loading"
  | "error"
  | "ready"
  | "quotaExceeded"
  | "history"
  | "historyEmpty";

export function useCopilot<Response>({
  showHistory,
  promptSubmitted,
  type,
  copilotPrompt,
  onCopilotSubmit,
}: UseCopilotProps<Response>) {
  const studioCtx = useStudioCtx();

  const copilotResponse = useAsyncStrict(async () => {
    if (!promptSubmitted) {
      // Prompt not ready yet
      return undefined;
    }

    try {
      const result = await onCopilotSubmit(copilotPrompt);
      const {
        response,
        displayMessage,
        copilotInteractionId,
        data,
        context,
        currentValue,
      } = result;

      if (response && copilotInteractionId) {
        studioCtx.addToCopilotHistory(type, {
          prompt: copilotPrompt.prompt,
          response: response,
          displayMessage: displayMessage,
          id: copilotInteractionId,
        });
      }

      trackCopilotQuery({
        data,
        context,
        currentValue,
        prompt: copilotPrompt.prompt,
        result: JSON.stringify(response),
      });

      return result;
    } catch (err) {
      if (err.name === "CopilotRateLimitExceededError") {
        return "CopilotRateLimitExceededError";
      }
      throw err;
    }
    // Intentionally not depending on anything bug the promptSubmitted to trigger the
    // request, so for example we don't keep issuing requests whenever the
    // `data` changes due to state updates in the canvas
  }, [promptSubmitted]);

  const suggestionHistory = studioCtx.getCopilotHistory(
    type
  ) as CopilotInteraction<Response>[];

  const state: CopilotState = showHistory
    ? suggestionHistory.length > 0
      ? "history"
      : "historyEmpty"
    : copilotResponse.loading
    ? "loading"
    : copilotResponse.error !== undefined
    ? "error"
    : copilotResponse.value === "CopilotRateLimitExceededError"
    ? "quotaExceeded"
    : "ready";

  const copilotData =
    copilotResponse.value &&
    copilotResponse.value !== "CopilotRateLimitExceededError"
      ? copilotResponse.value
      : undefined;

  return {
    state,
    suggestionHistory,
    copilotInteractionId: copilotData?.copilotInteractionId,
    displayMessage: copilotData?.displayMessage,
    response: copilotData?.response,
  };
}

function trackCopilotQuery({
  prompt,
  context,
  currentValue,
  data,
  result,
}: {
  prompt: string;
  context: string | undefined;
  currentValue: string | undefined;
  data: any;
  result: string | undefined;
}) {
  const truncateCode = (code: string | undefined) =>
    code &&
    (code.length <= 500
      ? code
      : `${code.slice(0, 250)}\n// ...\n${code.slice(-250)}`);
  trackEvent("Run Copilot query", {
    prompt,
    context,
    currentCode: truncateCode(currentValue),
    env:
      data && typeof data === "object"
        ? JSON.stringify(
            Object.entries(data).map(([k, v]) =>
              k.startsWith("$") && v && typeof v === "object"
                ? [k, Object.keys(v)]
                : [k, typeof v]
            ),
            undefined,
            2
          )
        : undefined,
    result: truncateCode(result),
  });
}
