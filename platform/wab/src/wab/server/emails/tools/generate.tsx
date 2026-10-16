import { removeClassesFromEmailHtml } from "@/wab/server/emails/email-html";
import TemplateComments from "@/wab/server/emails/templates/TemplateComments";
import TemplateLegalNotice from "@/wab/server/emails/templates/TemplateLegalNotice";
import { Body, Font, Head, Html, render } from "@react-email/components";
import * as fs from "fs";
import * as path from "path";
import React from "react";

const TEMPLATES = {
  Comments: TemplateComments,
  LegalNotice: TemplateLegalNotice,
};

export async function generateEmailHtml(
  templateName: keyof typeof TEMPLATES,
  props: any,
) {
  const Template: React.ComponentType<any> | undefined =
    TEMPLATES[templateName];
  if (!Template) {
    throw new Error(`Template ${templateName} not found`);
  }
  const html = await render(
    <Html lang="en" dir="ltr">
      <Head>
        {props.title && <title>{props.title}</title>}
        <Head>
          <Font
            fontFamily="sans-serif"
            fallbackFontFamily="sans-serif"
            fontWeight={400}
            fontStyle="normal"
          />
        </Head>
      </Head>
      <Body
        style={{ backgroundColor: "#eeeeee", padding: "24px", borderRadius: 7 }}
      >
        <Template {...props} />
      </Body>
    </Html>,
  );
  return removeClassesFromEmailHtml(html);
}

/** Writes HTML to a file, creating its directory if needed. */
export async function writeHtmlToFile(htmlContent: string, filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, htmlContent, "utf8");
}
