import { UU } from "@/wab/client/cli-routes";
import { Icon } from "@/wab/client/components/widgets/Icon";
import NewComponentItem from "@/wab/client/components/widgets/NewComponentItem";
import NewComponentSection from "@/wab/client/components/widgets/NewComponentSection";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import { getPageTemplatesGroups } from "@/wab/client/insertable-templates";
import EyeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Eye";
import {
  DefaultNewComponentModalProps,
  PlasmicNewComponentModal,
} from "@/wab/client/plasmic/plasmic_kit_new_component/PlasmicNewComponentModal";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { InsertableTemplatesItem } from "@/wab/shared/devflags";
import { Tooltip } from "antd";
import * as React from "react";
import { useState } from "react";

type NewPageType = "blank" | "dynamic" | "template";
export type NewPageInfo = {
  name: string;
  type: NewPageType;
  componentName?: string;
  projectId?: string;
};

interface NewPageModalProps
  extends Omit<DefaultNewComponentModalProps, "children"> {
  onSubmit: (info: NewPageInfo) => void;
  onCancel: () => void;
  studioCtx: StudioCtx;
  folderPath?: string;
}

function NewPageModal(props: NewPageModalProps) {
  const { onSubmit, onCancel, studioCtx, folderPath, ...rest } = props;

  const [type, setType] = useState<NewPageType>("blank");
  const [componentName, setComponentName] = React.useState<string | undefined>(
    undefined
  );
  const [projectId, setProjectId] = React.useState<string | undefined>(
    undefined
  );
  const [name, setName] = React.useState("");
  const nameRef = React.useRef<TextboxRef>(null);

  React.useEffect(() => {
    if (folderPath !== undefined) {
      setName(folderPath);
    }
  }, [folderPath]);

  const isApp = studioCtx.siteInfo.hasAppAuth;
  const contentEditorMode = studioCtx.contentEditorMode;
  const pageTemplatesGroups =
    isApp || contentEditorMode ? [] : getPageTemplatesGroups(studioCtx);
  const showDefaultPageTemplates =
    pageTemplatesGroups.length === 0 ||
    !studioCtx.getCurrentUiConfig().hideDefaultPageTemplates;

  return (
    <PlasmicNewComponentModal
      root={{
        as: "form",
        props: {
          onSubmit: () => {
            if (name) {
              onSubmit({ name, type, componentName, projectId });
            }
          },
          style: {
            maxHeight: "calc(100vh - 64px)",
          },
        },
      }}
      cancelButton={{
        onClick: onCancel,
        htmlType: "button",
      }}
      nameInput={{
        props: {
          autoFocus: true,
          isDelayedFocus: true,
          "data-test-id": "prompt",
          ref: nameRef,
          value: name,
          onChange: (e) => setName(e.target.value),
        },
      }}
      submitButton={{
        props: {
          "data-test-id": "prompt-submit",
          htmlType: "submit",
          disabled: !name,
        },
      }}
      showTemplates={true}
      isPage={true}
      {...rest}
    >
      {showDefaultPageTemplates && (
        <NewComponentSection title={""}>
          <NewComponentItem
            isSelected={type === "blank"}
            title="Empty page"
            imgUrl={"https://jovial-poitras-57edb1.netlify.app/blank.png"}
            onClick={() => {
              const previousName = componentName;
              setComponentName(undefined);
              setProjectId(undefined);
              setType("blank");
              if (!name || previousName === name) {
                setName("NewPage");
              }
            }}
          />
          <NewComponentItem
            isSelected={type === "dynamic"}
            title="Dynamic page"
            imgUrl={"https://jovial-poitras-57edb1.netlify.app/blank.png"}
            onClick={() => {
              const previousName = componentName;
              setComponentName(undefined);
              setProjectId(undefined);
              setType("dynamic");
              if (!name || previousName === name) {
                setName("NewPage");
              }
            }}
          />
        </NewComponentSection>
      )}
      {pageTemplatesGroups.map((group, idx) => (
        <NewComponentSection
          title={group.name}
          key={`page-templates-section-${group.name}-${idx}`}
        >
          {(
            group.items.filter(
              (c) => c.type === "insertable-templates-item"
            ) as InsertableTemplatesItem[]
          ).map((comp) => {
            return (
              <NewComponentItem
                key={`page-templates-item-${comp.projectId}-${comp.componentName}`}
                isSelected={
                  comp.componentName === componentName &&
                  comp.projectId === projectId
                }
                title={comp.displayName || comp.componentName}
                imgUrl={comp.imageUrl}
                onClick={() => {
                  const previousName = componentName;
                  setComponentName(comp.componentName);
                  setProjectId(comp.projectId);
                  setType("template");
                  if (!name || previousName === name) {
                    setName(comp.componentName);
                  }
                  if (nameRef.current) {
                    nameRef.current.focus();
                  }
                }}
                controls={
                  <Tooltip title="Open page template in new window">
                    <Icon
                      icon={EyeIcon}
                      onClick={async () => {
                        await studioCtx.projectDependencyManager.fetchInsertableTemplate(
                          comp.projectId
                        );
                        const template =
                          studioCtx.projectDependencyManager.getInsertableTemplate(
                            comp
                          );
                        if (!template) {
                          return;
                        }
                        const route = UU.projectFullPreview.pattern
                          .replace(":projectId", comp.projectId)
                          .replace(":previewPath*", template.component.uuid);
                        window.open(route, "_blank");
                      }}
                    />
                  </Tooltip>
                }
                large
                showControls
              />
            );
          })}
        </NewComponentSection>
      ))}
    </PlasmicNewComponentModal>
  );
}

export default NewPageModal;
