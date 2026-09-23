import { DefaultCopilotChatDialogProps } from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotChatDialog";
import { ApiProject, CopilotChatOpenOpts } from "@/wab/shared/ApiSchema";

export interface CopilotChatDialogProps extends DefaultCopilotChatDialogProps {
  project: ApiProject;
  chatOpenOpts?: CopilotChatOpenOpts;
  canStartNewChat: boolean;
  onClose: () => void;
  onPlanReady: () => void;
}

/**
 * Public stub for {@link CopilotChatDialog}.
 */
export function CopilotChatDialog(_props: CopilotChatDialogProps) {
  return null;
}
