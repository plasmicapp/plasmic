import { CodeSnippet } from "@/wab/client/components/coding/CodeDisplay";
import { confirm } from "@/wab/client/components/quick-modals";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawnWrapper } from "@/wab/shared/common";
import { notification } from "antd";
import React from "react";

export async function showPlasmicImgModal(studioCtx: StudioCtx) {
  const res = await confirm({
    title: "Enable automatic image optimization?",
    message: (
      <>
        <p>
          Automatic image optimization aims to improve performance scores for
          websites that use Plasmic by:
          <ul className="disc-list">
            <li> Serving images in next-gen formats; </li>
            <li> Resizing images according to their usage; </li>
            <li> Lazy loading images by default; </li>
            <li>
              Reducing Cumulative Layout Shift (CLS) by preallocating space for
              the image.
            </li>
          </ul>
        </p>
        <h2>Possible breaking changes</h2>
        <p>
          We have tried to make sure these optimized images behave and look the
          same as they once did. But there are some cases where you may need to
          make some small tweaks:
          <ul className="disc-list">
            <li>
              Some images may end up with a different size if they were sized in
              unusual ways. Most of the time, you can fix this by explicitly
              setting the size you want on the affected image in the studio;
            </li>
            <li>
              If you are using prop overrides to specify a <code>ref</code>,
              then you should note that that ref may now contain a reference to
              a wrapper <code>HTMLDivElement</code> instead. If you need a
              reference to the <code>HTMLImageElement</code>, please override
              the <code>imgRef</code> prop instead. If you are using prop
              overrides to specify a <code>className</code>, note that the CSS
              class may now be placed on a wrapper div element instead;
            </li>
            <li>
              If you want the image to not make use lazy loading, you'll need to
              explicitly set its "<code>Loading</code>" attribute to "
              <code>Eager</code>" in the studio.
            </li>
          </ul>
        </p>
        <h2>How to enable</h2>
        <p>
          Click on the confirm button below to enable image optimization for
          this project. <br /> <br />
          For Headless API users, image optimization will be turned on the next
          time you publish your project. <br /> <br />
          For codegen users, if you want to opt into automatic image resizing,
          then your images will need to be served by Plasmic; you should update
          your
          <code>images.scheme</code> in the <code>plasmic.json</code> file to{" "}
          <code>"cdn"</code>:
          <CodeSnippet language="json">
            {`"images": {
  "scheme": "cdn"
}`}
          </CodeSnippet>
        </p>
      </>
    ),
  });
  if (res) {
    await studioCtx.change<never>(({ success }) => {
      studioCtx.site.flags.usePlasmicImg = true;
      return success();
    });
    const saveResult = await studioCtx.save();
    if (saveResult === "Success") {
      notification.info({
        message:
          "Successfully enabled image optimization. Reloading the project to render the updated images...",
        duration: 5,
      });
      setTimeout(
        spawnWrapper(() => studioCtx.appCtx.api.reloadLocation()),
        5000
      );
    }
  }
}
