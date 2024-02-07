/**
 * Import and call this main instead of Shell's from main.tsx.
 */

import {
  createIframeFromNamedDomSnap,
  extractImportableDomFromIframe,
} from "@/wab/client/WebImporter";
import { ensure, spawn, swallow } from "@/wab/common";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Helmet } from "react-helmet";
import "./WebImporterSandbox.scss";

export function main() {
  ReactDOM.render(<Sandbox />, document.querySelector(".app-container"));
}

/**
 * Adapted from
 * https://gist.github.com/Robdel12/5cd25c39ccf58b192402c2c984146d81.
 */
function extractStylesFromPage() {
  return [...document.styleSheets].map((ss) => {
    return {
      href: ss.href,
      content: swallow(() =>
        [].slice.call(ss.cssRules).reduce((prev, cssRule) => {
          return prev + cssRule.cssText;
        }, "")
      ),
    };
  });
}

/**
 * Just paste this expression into Devtools Console and copy() out the resulting
 * JSON structure, then save this as a DomSnap in snaps/.
 */
function copyDomSnap() {
  /*
  const domSnap = {
    baseUrl: origin,
    html: document.documentElement.outerHTML,
    stylesheets:   [...document.styleSheets].map((ss) => {
      let content = "";
      try {
        content = [...ss.cssRules].map((cssRule) => {
          return cssRule.cssText;
        }).join('\n');
      } catch (e) {}
      return {
        href: ss.href,
        content,
      };
    })
  };
  copy(JSON.stringify(domSnap));
   */
}

export function WebImporterSandbox() {
  const snapName = ensure(
    new URLSearchParams(location.search).get("snap"),
    "Must have ?snap param"
  );

  const [iframe, setIframe] = useState<HTMLIFrameElement | undefined>(
    undefined
  );
  const [fontFaces, setFontFaces] = useState("");
  const [html, setHtml] = useState("");
  useEffect(() => {
    (document.querySelector(".app-container") as any).style.height = "unset";
    spawn(
      createIframeFromNamedDomSnap(snapName).then(({ iframe: _iframe }) =>
        setIframe(_iframe)
      )
    );
  }, []);
  useEffect(() => {
    if (!iframe) {
      return;
    }
    const { dom, fontStyles } = extractImportableDomFromIframe(iframe);
    // For some reason it's important for us to hydrate by setting innerHTML
    // rather than simply appendChild on `dom`, because otherwise things like
    // SVGs do not display anything.
    setFontFaces(fontStyles);
    setHtml(dom.outerHTML);
  });

  return (
    <>
      {/* @ts-ignore */}
      <Helmet>
        <style type={"text/css"}>{fontFaces}</style>
      </Helmet>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

export const Sandbox = WebImporterSandbox;
