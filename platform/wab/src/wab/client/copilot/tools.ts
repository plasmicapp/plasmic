import { addVariantsToComponentVariantGroupTool } from "@/wab/client/copilot/tools/addVariantsToComponentVariantGroup";
import { changeElementTool } from "@/wab/client/copilot/tools/changeElement";
import { changeStyleTokensTool } from "@/wab/client/copilot/tools/changeStyleTokens";
import { createComponentTool } from "@/wab/client/copilot/tools/createComponent";
import { createComponentVariantGroupsTool } from "@/wab/client/copilot/tools/createComponentVariantGroups";
import { createStyleTokensTool } from "@/wab/client/copilot/tools/createStyleTokens";
import { deleteElementTool } from "@/wab/client/copilot/tools/deleteElement";
import { deleteStyleTokensTool } from "@/wab/client/copilot/tools/deleteStyleTokens";
import { extractComponentTool } from "@/wab/client/copilot/tools/extractComponent";
import { insertHtmlTool } from "@/wab/client/copilot/tools/insertHtml";
import { readTool } from "@/wab/client/copilot/tools/read";
import { setPageMetaTool } from "@/wab/client/copilot/tools/setPageMeta";
import { CopilotTool } from "@/wab/shared/copilot/enterprise/copilot-tools";

type AnyCopilotTool = CopilotTool<any>;

export const COPILOT_TOOLS: Record<string, AnyCopilotTool> = {
  [insertHtmlTool.toolName]: insertHtmlTool,
  [changeElementTool.toolName]: changeElementTool,
  [deleteElementTool.toolName]: deleteElementTool,
  [readTool.toolName]: readTool,
  [createComponentTool.toolName]: createComponentTool,
  [extractComponentTool.toolName]: extractComponentTool,
  [createComponentVariantGroupsTool.toolName]: createComponentVariantGroupsTool,
  [addVariantsToComponentVariantGroupTool.toolName]:
    addVariantsToComponentVariantGroupTool,
  [createStyleTokensTool.toolName]: createStyleTokensTool,
  [changeStyleTokensTool.toolName]: changeStyleTokensTool,
  [deleteStyleTokensTool.toolName]: deleteStyleTokensTool,
  [setPageMetaTool.toolName]: setPageMetaTool,
};
