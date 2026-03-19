import { insertHtmlTool } from "@/wab/client/copilot/tools/insertHtml";
import { CopilotTool } from "@/wab/shared/copilot/internal/copilot-tools";

type AnyCopilotTool = CopilotTool<any>;

export const COPILOT_TOOLS: Record<string, AnyCopilotTool> = {
  [insertHtmlTool.toolName]: insertHtmlTool,
};
