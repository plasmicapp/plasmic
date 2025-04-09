import { methodForwarder } from "@/wab/commons/methodForwarder";
import { ensure } from "@/wab/shared/common";
import type { Analytics } from "@/wab/shared/observability/Analytics";

let globalAnalytics: Analytics;

export function analytics(): Analytics {
  return globalAnalytics;
}

export function initObservability(): void {
  ensure(
    globalAnalytics === undefined,
    "Cannot initialize observability twice"
  );
  globalAnalytics = methodForwarder<Analytics>();
}

export const _testonly = {
  setGlobalAnalytics: (testAnalytics: Analytics) => {
    globalAnalytics = testAnalytics;
  },
};
