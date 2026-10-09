import { methodForwarder } from "@/wab/commons/methodForwarder";
import type { Analytics } from "@/wab/shared/observability/Analytics";

export function initAnalyticsFactory(_opts: {
  production: boolean;
}): () => Analytics {
  return () => methodForwarder<Analytics>();
}
