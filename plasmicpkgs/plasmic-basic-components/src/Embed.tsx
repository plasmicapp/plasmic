import { usePlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { useEffect, useRef } from "react";
import { ensure, useFirstRender, useId } from "./common";

export interface EmbedProps {
  className?: string;
  code: string;
  hideInEditor?: boolean;
}

/**
 * A common use case for embedding HTML snippets is loading/running script tags, so most of the logic here is for
 * handling that.
 *
 * You can't just write innerHTML with some <script> tags in there. You need to explicitly add each one via the DOM API.
 *
 * You also can't just add the script tags and expect them to run sequentially, and sometimes there are multiple scripts
 * with dependencies on each other. You have to explicitly wait for earlier ones to finish loading.
 *
 * One last complication is that Next.js can run the effect multiple times in development mode. There's nothing actually
 * that we can/should do about that, but just something to be aware of if you are here debugging issues.
 */
export default function Embed({
  className,
  code,
  hideInEditor = false,
}: EmbedProps) {
  const rootElt = useRef<HTMLDivElement>(null);
  const inEditor = usePlasmicCanvasContext();
  const htmlId = useId();
  const firstRender = useFirstRender();
  useEffect(() => {
    if (hideInEditor && inEditor) {
      return;
    }
    // If it's the first render and we already set the global id for this component, it means that
    // the HTML is already present in the DOM from the server-rendered HTML. We don't want to re-run.
    // If it's not the first render, then it can mean that some dependency changed.
    if (
      !inEditor &&
      firstRender &&
      (window as any)[makePlasmicVarName(htmlId)]
    ) {
      return;
    }
    // Load scripts sequentially one at a time, since later scripts can depend on earlier ones.
    (async () => {
      for (const oldScript of Array.from(
        ensure(rootElt.current).querySelectorAll("script")
      )) {
        const newScript = document.createElement("script");
        // This doesn't actually have the effect we want, we need to explicitly wait on the load event, since all
        // dynamically injected scripts are always async.
        newScript.async = false;
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        ensure(oldScript.parentNode).replaceChild(newScript, oldScript);
        // Only scripts with src will ever fire a load event.
        if (newScript.src) {
          await new Promise((resolve) =>
            newScript.addEventListener("load", resolve)
          );
        }
      }
    })();
  }, [htmlId, firstRender, code, hideInEditor, inEditor]);
  const effectiveCode =
    hideInEditor && inEditor
      ? ""
      : inEditor
      ? code
      : addIdentifierScript(htmlId, code);
  return (
    <div
      ref={rootElt}
      className={className}
      dangerouslySetInnerHTML={{ __html: effectiveCode }}
      style={{ whiteSpace: "normal" }}
    />
  );
}

function makePlasmicVarName(id: string) {
  return `__plasmic_${id.replace(/[^a-z0-9]/gi, "")}`;
}

function addIdentifierScript(id: string, code: string) {
  return `<script>
    var ${makePlasmicVarName(id)} = 1;
  </script>
  ${code}`;
}

export const embedMeta: ComponentMeta<EmbedProps> = {
  name: "hostless-embed",
  displayName: "Embed HTML",
  importName: "Embed",
  importPath: "@plasmicpkgs/plasmic-basic-components",
  props: {
    code: {
      type: "code",
      lang: "html",
      defaultValue: "<div>Paste your embed code via the right sidebar</div>",
      description: "The HTML code to be embedded",
    },
    hideInEditor: {
      type: "boolean",
      displayName: "Hide in editor",
      description:
        "Disable running the code while editing in Plasmic Studio (may require reload)",
      editOnly: true,
    },
  },
  defaultStyles: {
    maxWidth: "100%",
  },
};

export function registerEmbed(
  loader?: { registerComponent: typeof registerComponent },
  customEmbedMeta?: ComponentMeta<EmbedProps>
) {
  if (loader) {
    loader.registerComponent(Embed, customEmbedMeta ?? embedMeta);
  } else {
    registerComponent(Embed, customEmbedMeta ?? embedMeta);
  }
}
