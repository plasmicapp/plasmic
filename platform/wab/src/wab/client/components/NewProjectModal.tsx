import StartersSection from "@/StartersSection";
import {
  useAllProjectsData,
  useAppCtx,
} from "@/wab/client/contexts/AppContexts";
import {
  DefaultNewProjectModalProps,
  PlasmicNewProjectModal,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicNewProjectModal";
import { zIndex } from "@/wab/client/z-index";
import { WorkspaceId } from "@/wab/shared/ApiSchema";
import { observer } from "mobx-react";
import * as React from "react";
import StarterGroup from "./StarterGroup";
import { BareModal } from "./studio/BareModal";
import { Tab, Tabs } from "./widgets";

interface NewProjectModalProps extends DefaultNewProjectModalProps {
  onCancel: () => void;
  workspaceId?: WorkspaceId;
}

function NewProjectModalBody(props: Pick<NewProjectModalProps, "workspaceId">) {
  const appCtx = useAppCtx();
  const { workspaceId } = props;
  const [currentTab, setCurrentTab] = React.useState<"website" | "app">(
    "website"
  );
  return (
    <>
      <div
        style={{
          // This is a hack to make the only the tab bar sticky mantaining the content scrollable through the whole modal
          position: "sticky",
          top: -32,
          backgroundColor: "white",
          marginTop: -32,
          paddingBottom: 16,
          zIndex: zIndex.modal,
        }}
      >
        <Tabs
          tabKey={currentTab}
          onSwitch={setCurrentTab}
          tabBarClassName="pt-m"
          tabClassName="hilite-tab"
          activeTabClassName="hilite-tab--active"
          tabs={[
            new Tab({
              name: "Website",
              key: "website",
              contents: () => <></>,
            }),
            new Tab({
              name: "App",
              key: "app",
              contents: () => <></>,
            }),
          ]}
        />
      </div>
      {currentTab === "website" && (
        <StartersSection>
          {appCtx.starters.templateAndExampleSections.map((section) => (
            <StarterGroup
              key={section.tag}
              title={section.title}
              tag={section.tag}
              projects={section.projects}
              infoTooltip={section.infoTooltip}
              docsUrl={section.docsUrl}
              moreUrl={section.moreUrl}
              workspaceId={workspaceId}
            />
          ))}
        </StartersSection>
      )}
      {currentTab === "app" && (
        <StartersSection>
          {appCtx.starters.appSections.map((section) => (
            <StarterGroup
              key={section.tag}
              title={section.title}
              tag={section.tag}
              projects={section.projects}
              infoTooltip={section.infoTooltip}
              docsUrl={section.docsUrl}
              moreUrl={section.moreUrl}
              workspaceId={workspaceId}
            />
          ))}
        </StartersSection>
      )}
    </>
  );
}

const NewProjectModal = observer(function NewProjectModal({
  workspaceId,
  onCancel,
  ...rest
}: NewProjectModalProps) {
  const appCtx = useAppCtx();
  const { data: projectsData } = useAllProjectsData();

  const workspaceStarters = React.useMemo(() => {
    if (!projectsData || !workspaceId) {
      return [];
    }
    return projectsData.projects.filter(
      (project) => project.workspaceId === workspaceId && project.isUserStarter
    );
  }, [projectsData, workspaceId]);

  return (
    <BareModal onClose={onCancel} width={1450} style={{ top: 32 }}>
      <PlasmicNewProjectModal
        {...rest}
        root={{
          style: {
            maxHeight: `calc(100vh - 64px)`,
          },
        }}
        cancelButton={{ onClick: onCancel }}
      >
        {appCtx.appConfig.newProjectModal ? (
          <NewProjectModalBody workspaceId={workspaceId} />
        ) : (
          <>
            {workspaceStarters.length > 0 && (
              <StarterGroup
                title="Workspace starters"
                tag="workspace-starters"
                projects={workspaceStarters.map((project) => ({
                  name: project.name,
                  projectId: project.id,
                  tag: project.id,
                  description: "",
                  withDropShadow: true,
                  cloneWithoutName: true,
                }))}
                workspaceId={workspaceId}
              />
            )}
            {appCtx.starters.templateAndExampleSections.map((section) => (
              <StarterGroup
                key={section.tag}
                title={section.title}
                tag={section.tag}
                projects={section.projects}
                infoTooltip={section.infoTooltip}
                docsUrl={section.docsUrl}
                moreUrl={section.moreUrl}
                workspaceId={workspaceId}
              />
            ))}
          </>
        )}
      </PlasmicNewProjectModal>
    </BareModal>
  );
});

export default NewProjectModal;
