import { insertHtmlTool } from "@/wab/client/copilot/tools/insertHtml";
import { readTool } from "@/wab/client/copilot/tools/read";
import { CopilotTool } from "@/wab/shared/copilot/enterprise/copilot-tools";

type AnyCopilotTool = CopilotTool<any>;

export const COPILOT_TOOLS: Record<string, AnyCopilotTool> = {
  [insertHtmlTool.toolName]: insertHtmlTool,
  [readTool.toolName]: readTool,
};
