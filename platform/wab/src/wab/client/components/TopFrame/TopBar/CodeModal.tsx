/** @format */

import { observer } from "mobx-react-lite";
import * as React from "react";
import { ApiProject } from "../../../../shared/ApiSchema";
import CodeQuickstartDisplay from "../../studio/code-quickstart/CodeQuickstartDisplay";
import { TopBarModal } from "./TopBarModal";

interface CodeModalProps {
  project: ApiProject;
  noComponents: boolean;
  subjectComponentInfo:
    | {
        pathOrComponent: string;
        componentName: string;
      }
    | undefined;
  showCodeModal: boolean;
  setShowCodeModal: (val: boolean) => Promise<void>;
}

export const CodeModal = observer(function CodeModal({
  project,
  noComponents,
  subjectComponentInfo,
  showCodeModal,
  setShowCodeModal,
}: CodeModalProps) {
  return (
    <>
      {showCodeModal && (
        <TopBarModal onClose={() => setShowCodeModal(false)}>
          <div style={{ width: 800, height: "calc(100vh - 100px)" }}>
            <CodeQuickstartDisplay
              project={project}
              noComponents={noComponents}
              subjectComponentInfo={subjectComponentInfo}
            />
          </div>
        </TopBarModal>
      )}
    </>
  );
});

export default CodeModal;
