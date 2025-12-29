import { CopilotPromptInput } from "@/wab/client/components/copilot/CopilotPromptInput";
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
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { Tooltip } from "antd";
import * as React from "react";

export type NewPageInfo =
  | {
      name: string;
      type: "blank";
    }
  | {
      name: string;
      type: "dynamic";
    }
  | {
      name: string;
      type: "template";
      componentName: string;
      projectId: string;
    }
  | {
      name: string;
      type: "copilot";
      prompt: string;
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

  const [pageInfo, setPageInfo] = React.useState<NewPageInfo>({
    type: "blank",
    name: "",
  });
  const nameRef = React.useRef<TextboxRef>(null);

  React.useEffect(() => {
    if (folderPath !== undefined) {
      setPageInfo((prev) => ({ ...prev, name: folderPath }));
    }
  }, [folderPath]);

  const isApp = studioCtx.siteInfo.hasAppAuth;
  const contentEditorMode = studioCtx.contentEditorMode;
  const pageTemplatesGroups =
    isApp || contentEditorMode ? [] : getPageTemplatesGroups(studioCtx);
  const showDefaultPageTemplates =
    pageTemplatesGroups.length === 0 ||
    !studioCtx.getCurrentUiConfig().hideDefaultPageTemplates;
  const uiCopilotEnabled = studioCtx.uiCopilotEnabled();

  const getNewPageName = (defaultName: string) => {
    return !pageInfo.name ||
      (pageInfo.type === "template" && pageInfo.name === pageInfo.componentName)
      ? defaultName
      : pageInfo.name;
  };

  return (
    <PlasmicNewComponentModal
      root={{
        as: "form",
        props: {
          onSubmit: () => {
            if (pageInfo.name) {
              onSubmit(pageInfo);
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
          value: pageInfo.name,
          onChange: (e) =>
            setPageInfo((prev) => ({ ...prev, name: e.target.value })),
        },
      }}
      submitButton={{
        props: {
          "data-test-id": "prompt-submit",
          htmlType: "submit",
          disabled:
            !pageInfo.name || (pageInfo.type === "copilot" && !pageInfo.prompt),
        },
      }}
      showTemplates={true}
      isPage={true}
      {...rest}
    >
      {showDefaultPageTemplates && (
        <NewComponentSection title={""}>
          <NewComponentItem
            isSelected={pageInfo.type === "blank"}
            title="Empty page"
            imgUrl={"https://jovial-poitras-57edb1.netlify.app/blank.png"}
            onClick={() => {
              setPageInfo({ type: "blank", name: getNewPageName("NewPage") });
            }}
          />
          <NewComponentItem
            isSelected={pageInfo.type === "dynamic"}
            title="Dynamic page"
            imgUrl={"https://jovial-poitras-57edb1.netlify.app/blank.png"}
            onClick={() => {
              setPageInfo({ type: "dynamic", name: getNewPageName("NewPage") });
            }}
          />
          {uiCopilotEnabled && (
            <NewComponentItem
              isSelected={pageInfo.type === "copilot"}
              title="Copilot page"
              imgUrl={"https://jovial-poitras-57edb1.netlify.app/blank.png"}
              onClick={() => {
                setPageInfo({
                  type: "copilot",
                  prompt: pageInfo.type === "copilot" ? pageInfo.prompt : "",
                  name: getNewPageName("NewPage"),
                });
              }}
            />
          )}
        </NewComponentSection>
      )}
      {pageInfo.type === "copilot" && (
        <NewComponentSection title="Copilot Prompt">
          <CopilotPromptInput
            showImageUpload={false}
            textAreaInput={{
              value: pageInfo.prompt,
              placeholder: "Describe the page you want to create...",
              rows: 3,
              autoFocus: true,
              onChange: (value) =>
                setPageInfo((prev) => ({ ...prev, prompt: value ?? "" })),
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
                  pageInfo.type === "template" &&
                  comp.componentName === pageInfo.componentName &&
                  comp.projectId === pageInfo.projectId
                }
                title={comp.displayName || comp.componentName}
                imgUrl={comp.imageUrl}
                onClick={() => {
                  setPageInfo({
                    type: "template",
                    componentName: comp.componentName,
                    projectId: comp.projectId,
                    name: getNewPageName(comp.componentName),
                  });
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
                        const route = APP_ROUTES.projectFullPreview.pattern
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
