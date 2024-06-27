import { sortAs } from "@/wab/shared/common";
import { fstPartyHostLessComponents } from "@/wab/shared/core/hostless-components";
import { getPublicUrl } from "@/wab/shared/urls";
import { memoize } from "lodash";
import memoizeOne from "memoize-one";

declare const COMMITHASH: string;

const fetchCanvasPkgs = memoizeOne(() =>
  fetch(
    `${getPublicUrl()}/static/canvas-packages/build/client.${COMMITHASH}.js`
  ).then((res) => res.text())
);
const fetchReactWebBundle = memoizeOne(() =>
  fetch(
    `${getPublicUrl()}/static/react-web-bundle/build/client.${COMMITHASH}.js`
  ).then((res) => res.text())
);
const fetchLiveFrameClient = memoizeOne(() =>
  fetch(
    `${getPublicUrl()}/static/live-frame/build/client.${COMMITHASH}.js`
  ).then((res) => res.text())
);

const fetchHostLessPkg = memoize(async (pkg: string) => {
  return fetch(
    `${getPublicUrl()}/static/canvas-packages/build/${pkg}.${COMMITHASH}.js`
  ).then((res) => res.text());
});

export function getCanvasPkgs() {
  return fetchCanvasPkgs();
}

export function getReactWebBundle() {
  return fetchReactWebBundle();
}

export function getLiveFrameClientJs() {
  return fetchLiveFrameClient();
}

export function getHostLessPkg(pkg: string) {
  return fetchHostLessPkg(pkg);
}

export async function getSortedHostLessPkgs(pkgs: string[]) {
  const sortedPkgs = sortAs(pkgs, fstPartyHostLessComponents, (t) => t);
  return await Promise.all(
    sortedPkgs.map(async (pkg) => [pkg, await fetchHostLessPkg(pkg)])
  );
}
