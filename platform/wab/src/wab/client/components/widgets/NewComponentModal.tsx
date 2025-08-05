import NewComponentItem from "@/wab/client/components/widgets/NewComponentItem";
import NewComponentSection from "@/wab/client/components/widgets/NewComponentSection";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import {
  buildInsertableExtraInfo,
  getInsertableTemplateComponentItem,
  getScreenVariantToInsertableTemplate,
} from "@/wab/client/insertable-templates";
import {
  DefaultNewComponentModalProps,
  PlasmicNewComponentModal,
} from "@/wab/client/plasmic/plasmic_kit_new_component/PlasmicNewComponentModal";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { assert } from "@/wab/shared/common";
import { flattenInsertableTemplatesByType } from "@/wab/shared/devflags";
import { InsertableTemplateComponentExtraInfo } from "@/wab/shared/insertable-templates/types";
import * as React from "react";

export type NewComponentInfo = {
  name: string;
  insertableTemplateInfo?: InsertableTemplateComponentExtraInfo;
};

interface NewComponentModalProps
  extends Omit<DefaultNewComponentModalProps, "children"> {
  onSubmit: (info: NewComponentInfo) => void;
  onCancel: () => void;
  studioCtx: StudioCtx;
  folderPath?: string;
}

function NewComponentModal(props: NewComponentModalProps) {
  const { onSubmit, onCancel, studioCtx, folderPath, ...rest } = props;

  const [expanded, setExpanded] = React.useState(false);
  const [templateName, setTemplateName] = React.useState<string | undefined>(
    undefined
  );
  const [name, setName] = React.useState("");
  const nameRef = React.useRef<TextboxRef>(null);

  React.useEffect(() => {
    if (folderPath !== undefined) {
      setName(folderPath);
    }
  }, [folderPath]);

  const templates = flattenInsertableTemplatesByType(
    studioCtx.appCtx.appConfig.insertableTemplates,
    "insertable-templates-component"
  );

  return (
    <PlasmicNewComponentModal
      root={{
        as: "form",
        props: {
          onSubmit: async (e: Event) => {
            e.preventDefault();
            if (name) {
              if (templateName) {
                const templateItem = getInsertableTemplateComponentItem(
                  studioCtx,
                  templateName
                );
                assert(templateItem, `No template found for ${templateName}`);
                const { screenVariant } =
                  await getScreenVariantToInsertableTemplate(studioCtx);
                const templateInfo = await buildInsertableExtraInfo(
                  studioCtx,
                  templateItem,
                  screenVariant
                );
                onSubmit({ name, insertableTemplateInfo: templateInfo });
              } else {
                onSubmit({ name });
              }
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
      showTemplates={expanded}
      expander={{
        onClick: () => setExpanded(!expanded),
        type: "button",
      }}
      isPage={false}
      {...rest}
    >
      <NewComponentSection>
        <NewComponentItem
          isSelected={templateName == null}
          title="Blank component"
          onClick={() => {
            const previousTemplate = templates.find(
              (c) => c.templateName === templateName
            );
            if (previousTemplate?.componentName === name) {
              setName("");
            }
            setTemplateName(undefined);
            if (nameRef.current) {
              nameRef.current.focus();
            }
          }}
        />
      </NewComponentSection>
      {templates.length > 0 && (
        <NewComponentSection title={"Common components"}>
          {templates.map((template) => {
            const thisTemplateName = template.templateName;
            return (
              <NewComponentItem
                isSelected={templateName === thisTemplateName}
                title={template.displayName ?? template.componentName}
                imgUrl={template.imageUrl}
                onClick={() => {
                  const previousTemplate = templates.find(
                    (c) => c.templateName === templateName
                  );
                  if (!name || previousTemplate?.componentName === name) {
                    setName(template.componentName);
                  }
                  setTemplateName(thisTemplateName);
                  if (nameRef.current) {
                    nameRef.current.focus();
                  }
                }}
              />
            );
          })}
        </NewComponentSection>
      )}
    </PlasmicNewComponentModal>
  );
}

export default NewComponentModal;
