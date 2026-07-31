import { ENV } from "@/wab/client/env";
import { sortAs } from "@/wab/shared/common";
import { fstPartyHostLessComponents } from "@/wab/shared/core/hostless-components";
import { getStaticBaseUrl } from "@/wab/shared/urls";
import { memoize } from "lodash";
import memoizeOne from "memoize-one";

const fetchCanvasPkgs = memoizeOne(() =>
  fetch(
    `${getStaticBaseUrl()}/canvas-packages/build/client.${ENV.COMMITHASH}.js`
  ).then((res) => res.text())
);
const fetchReactWebBundle = memoizeOne(() =>
  fetch(
    `${getStaticBaseUrl()}/react-web-bundle/build/client.${ENV.COMMITHASH}.js`
  ).then((res) => res.text())
);
const fetchLiveFrameClient = memoizeOne(() =>
  fetch(
    `${getStaticBaseUrl()}/live-frame/build/client.${ENV.COMMITHASH}.js`
  ).then((res) => res.text())
);

const fetchHostLessPkg = memoize(
  async (pkg: string, version: string) => {
    return fetch(
      `${getStaticBaseUrl()}/canvas-packages/build/${pkg}${version}.${
        ENV.COMMITHASH
      }.js`
    ).then((res) => res.text());
  },
  (pkg, version) => `${pkg}${version}`
);

export function getCanvasPkgs() {
  return fetchCanvasPkgs();
}

export function getReactWebBundle() {
  return fetchReactWebBundle();
}

export function getLiveFrameClientJs() {
  return fetchLiveFrameClient();
}

export function getHostLessPkg(pkg: string, version: string) {
  return fetchHostLessPkg(pkg, version);
}

export async function getSortedHostLessPkgs(pkgs: string[], version: string) {
  const sortedPkgs = sortAs(pkgs, fstPartyHostLessComponents, (t) => t);
  return await Promise.all(
    sortedPkgs.map(async (pkg) => [pkg, await fetchHostLessPkg(pkg, version)])
  );
}

// Versioning based on bundling made on platform/canvas-packages/esbuild.js
export function getVersionForCanvasPackages(window: Window | null) {
  if (!!(window as any)?.__Sub?.jsxRuntime) {
    return "-v2";
  }

  return "";
}
