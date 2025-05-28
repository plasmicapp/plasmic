import { removeClassesFromEmailHtml } from "@/wab/server/emails/email-html";
import { Body, Font, Head, Html, render } from "@react-email/components";
import React from "react";

export async function generateEmailHtml(templateName: string, props: any) {
  const module = await import(`./${templateName}.tsx`);
  const Template = module.default;
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
    </Html>
  );
  return removeClassesFromEmailHtml(html);
}
