import gatsbyStrategy from "./gatsby";
import nextjsStrategy from "./nextjs";
import reactStrategy from "./react";
import { CPAStrategy } from "./types";

const strategies: Record<string, CPAStrategy> = {
  nextjs: nextjsStrategy,
  gatsby: gatsbyStrategy,
  react: reactStrategy,
};

export const getCPAStrategy = (
  platform: string,
  errorMsg?: string
): CPAStrategy => {
  if (!Object.keys(strategies).includes(platform)) {
    const msg = errorMsg || `Unrecognized platform: ${platform}`;
    throw new Error(msg);
  }
  return strategies[platform];
};
