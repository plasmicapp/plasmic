import { elementSchemaToTplAndLogErrors } from "@/wab/client/code-components/code-components";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { withoutNils } from "@/wab/shared/common";
import { CodeComponent, getComponentDisplayName } from "@/wab/shared/core/components";
import { TplComponent } from "@/wab/shared/model/classes";
import { CodeComponentElement } from "@plasmicapp/host/dist/element-types";
import { notification } from "antd";
import { computedFn } from "mobx-utils";

export interface Preset {
  name: string;
  tpl: TplComponent;
  screenshot?: string;
}

export const getComponentPresets = computedFn(function getComponentPresets(
  studioCtx: StudioCtx,
  component: CodeComponent
): Preset[] {
  const meta = studioCtx.getCodeComponentMeta(component);
  const schemas = meta?.templates ?? {};
  return withoutNils(
    [...Object.entries(schemas)].map(([name, template]): Preset | undefined => {
      if (typeof template !== "object") {
        notification.error({
          message: "Type error while registering code templates",
          description: `Component ${getComponentDisplayName(
            component
          )} has template ${name} of unexpected type ${typeof template}`,
        });
        return undefined;
      }
      const schema: CodeComponentElement<{}> = {
        type: "component",
        name: component.name,
        ...template,
      };
      const maybeTpl = elementSchemaToTplAndLogErrors(
        studioCtx.site,
        undefined,
        schema
      );
      if (maybeTpl.result.isError) {
        notification.error({
          message: "Type error while registering code templates",
          description: maybeTpl.result.error.message,
        });
        return undefined;
      }
      const tpl = maybeTpl.result.value as TplComponent;
      return {
        name,
        screenshot: template.previewImg,
        tpl,
      };
    })
  );
});
