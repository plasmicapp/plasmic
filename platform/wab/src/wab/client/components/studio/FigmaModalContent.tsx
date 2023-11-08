import * as React from "react";

export function FigmaModalContent() {
  return (
    <>
      <p>
        To import Figma layers into a Plasmic project, first install{" "}
        <a
          href="https://www.figma.com/community/plugin/845367649027913572/Figma-to-Code-by-Plasmic"
          target="_blank"
        >
          Figma-to-Code by Plasmic
        </a>{" "}
        plugin on your Figma workspace.
      </p>

      <p>
        Then, on a Figma file, load the plugin by right-clicking the canvas,
        hovering into <em>Plugins</em> and clicking{" "}
        <em>Figma-to-Code by Plasmic</em>. Select the layers you want to export
        and click <em>Export selected layers to clipboard</em>.
      </p>

      <p>Finally, paste into a Plasmic artboard by pressing Cmd/Ctrl+V.</p>

      <iframe
        width="560"
        height="315"
        src="https://www.youtube.com/embed/dn8gRc3M2NA"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </>
  );
}
