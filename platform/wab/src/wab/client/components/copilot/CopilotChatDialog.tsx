import { DefaultCopilotChatDialogProps } from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotChatDialog";
import { ProjectId } from "@/wab/shared/ApiSchema";

export interface CopilotChatDialogProps extends DefaultCopilotChatDialogProps {
  projectId: ProjectId;
  onClose: () => void;
}

/**
 * Public stub for {@link CopilotChatDialog}.
 */
export function CopilotChatDialog(_props: CopilotChatDialogProps) {
  return null;
}
