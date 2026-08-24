import {
  HTMLAttributePropEditor,
  LINK_ATTRS,
} from "@/wab/client/components/sidebar-tabs/HTMLAttributesSection";
import { TextContentRow } from "@/wab/client/components/sidebar-tabs/TypographySection";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { TplTag } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

/**
 * Dedicated section for configuring where an `a` tag links to, and what it
 * says. These are hidden from the generic HTML attributes and Text sections.
 */
export const LinkSection = observer(function LinkSection({
  viewCtx,
  tpl,
  expsProvider,
}: {
  viewCtx: ViewCtx;
  tpl: TplTag;
  expsProvider: TplExpsProvider;
}) {
  return (
    <SidebarSection title="Link" data-test-id="link-section">
      <TextContentRow viewCtx={viewCtx} expsProvider={expsProvider} />
      {LINK_ATTRS.map((attr) => (
        <HTMLAttributePropEditor
          key={attr}
          viewCtx={viewCtx}
          tpl={tpl}
          expsProvider={expsProvider}
          attr={attr}
        />
      ))}
    </SidebarSection>
  );
});
