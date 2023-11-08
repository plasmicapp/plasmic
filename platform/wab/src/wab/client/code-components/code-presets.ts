import { CodeComponentElement } from "@plasmicapp/host/dist/element-types";
import { notification } from "antd";
import { computedFn } from "mobx-utils";
import { TplComponent } from "../../classes";
import { withoutNils } from "../../common";
import { CodeComponent, getComponentDisplayName } from "../../components";
import { StudioCtx } from "../studio-ctx/StudioCtx";
import { elementSchemaToTplAndLogErrors } from "./code-components";

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
