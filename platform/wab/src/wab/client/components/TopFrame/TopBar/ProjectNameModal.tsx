/** @format */

import { Button, Form } from "antd";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";
import { spawn } from "../../../../common";
import { ApiProject } from "../../../../shared/ApiSchema";
import { useAppCtx } from "../../../contexts/AppContexts";
import { useTopFrameCtx } from "../../../frame-ctx/top-frame-ctx";
import { maybeShowPaywall } from "../../modals/PricingModal";
import Textbox from "../../widgets/Textbox";

interface ProjectNameModalProps {
  project: ApiProject;
  refreshProjectAndPerms: () => void;
  showProjectNameModal: boolean;
  setShowProjectNameModal: (val: boolean) => Promise<void>;
}

export const ProjectNameModal = observer(function ProjectNameModal({
  project,
  refreshProjectAndPerms,
  showProjectNameModal,
  setShowProjectNameModal,
}: ProjectNameModalProps) {
  const { hostFrameApi } = useTopFrameCtx();
  const [name, setName] = React.useState(project.name);
  const appCtx = useAppCtx();

  const onSubmit = (newName: string) => {
    if (newName && (newName !== project.name || newName !== name)) {
      setName(newName);
      spawn(
        (async () => {
          await maybeShowPaywall(appCtx, async () =>
            appCtx.api.setSiteInfo(project.id, {
              name: newName,
            })
          );
          refreshProjectAndPerms();
          await hostFrameApi.refreshSiteInfo();
        })()
      );
    }
    spawn(setShowProjectNameModal(false));
  };

  return (
    <>
      {showProjectNameModal && (
        <Modal
          title={null}
          visible={true}
          footer={null}
          onCancel={() => setShowProjectNameModal(false)}
          closable={false}
          wrapClassName="prompt-modal"
        >
          <Form
            onFinish={(e) => {
              onSubmit(e.name);
            }}
            initialValues={{ ["name"]: name }}
            data-test-id="prompt-form"
            layout="vertical"
          >
            <Form.Item name="name" label={"Enter a new project name"}>
              <Textbox
                name="name"
                placeholder={"Project Name"}
                styleType={["bordered"]}
                autoFocus
                data-test-id="promptName"
              />
            </Form.Item>
            <Form.Item style={{ margin: 0 }}>
              <Button
                className="mr-sm"
                type="primary"
                htmlType="submit"
                data-test-id="prompt-submit"
              >
                {"Submit"}
              </Button>
              <Button onClick={() => setShowProjectNameModal(false)}>
                Cancel
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </>
  );
});

export default ProjectNameModal;
