import PublishSpinner from "@/wab/client/components/widgets/PublishSpinner";
import {
  DefaultGitJobStepProps,
  PlasmicGitJobStep,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicGitJobStep";
import * as React from "react";

interface GitJobStepProps extends DefaultGitJobStepProps {
  description: React.ReactNode;
}

const dict = {
  "Set up job": "Setting up job...",
  "Build repo-sync/pull-request@v2": "Building pull-request dependency...",
  "Post Cache node_modules": "Caching node_modules...",
  "Post Checkout repository": "Cleaning up checkout job...",
  "Complete job": "Completing job...",
} as const;

function GitJobStep(props: GitJobStepProps) {
  const { description, ...rest } = props;
  const text =
    typeof description === "string" && description in dict
      ? dict[description]
      : description;
  return (
    <PlasmicGitJobStep
      {...rest}
      children={text}
      svg={
        rest.status === "started"
          ? {
              render: () => <PublishSpinner />,
            }
          : undefined
      }
    />
  );
}

export default GitJobStep;
