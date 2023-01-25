/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/ssr-apis/
 */

const React = require("react")

const HeadComponents = [
  <script
    key="plasmic-hmr"
    type="text/javascript"
    dangerouslySetInnerHTML={{
      __html: `
        if (typeof window !== "undefined" && /\\/plasmic-host\\/?$/.test(window.location.pathname)) {
          const RealEventSource = window.EventSource;
          window.EventSource = function(url, config) {
            if (/[^a-zA-Z]hmr($|[^a-zA-Z])/.test(url)) {
              console.warn("Plasmic: disabled EventSource request for", url);
              return {
                onerror() {}, onmessage() {}, onopen() {}, close() {}
              };
            } else {
              return new RealEventSource(url, config);
            }
          }
        }
      `,
    }}
  />
]

const isProduction = process.env.NODE_ENV === "production"

exports.onRenderBody = ({ pathname, setHeadComponents }) => {
  /**
   * We add the preamble tag script to all pages during development mode
   * because during development all pages are dynamically rendered based
   * on `/` route, during production we add it only in `/plasmic-host/`
   */
  if (!isProduction || pathname === "/plasmic-host/") {
    setHeadComponents(HeadComponents)
  }
}