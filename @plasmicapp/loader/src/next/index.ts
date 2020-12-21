// From: https://github.com/vercel/next.js/blob/canary/packages/next/next-server/lib/constants.ts.
const PHASE_PRODUCTION_BUILD = "phase-production-build";
const PHASE_DEVELOPMENT_SERVER = "phase-development-server";

import { generateEntrypoint, PlamicOpts } from "../shared";

// Check to make sure it only runs once.
let firstTime = true;

module.exports = (plasmicOpt: PlamicOpts) => {
  const buildPhase = [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD];

  return (nextConfig: any = {}, composePlugins: any = {}) => {
    const { nextComposePlugins, phase } = composePlugins;

    function nextConfigMethod(phase: string, args: any = {}) {
      if (!firstTime) {
        return;
      }
      firstTime = false;
      if (buildPhase.includes(phase)) {
        generateEntrypoint(plasmicOpt);
      }
      return typeof nextConfig === "function"
        ? nextConfig(phase, args)
        : nextConfig;
    }
    return nextComposePlugins ? nextConfigMethod(phase) : nextConfigMethod;
  };
};
