import { DefaultCopilotChatDialogProps } from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotChatDialog";
import { CopilotChatOpenOpts, ProjectId } from "@/wab/shared/ApiSchema";

export interface CopilotChatDialogProps extends DefaultCopilotChatDialogProps {
  projectId: ProjectId;
  chatOpenOpts?: CopilotChatOpenOpts;
  canStartNewChat: boolean;
  onClose: () => void;
}

/**
 * Public stub for {@link CopilotChatDialog}.
 */
export function CopilotChatDialog(_props: CopilotChatDialogProps) {
  return null;
}
