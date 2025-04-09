import { methodForwarder } from "@/wab/commons/methodForwarder";
import { Analytics } from "@/wab/shared/observability/Analytics";

export function initAnalyticsFactory(opts: {
  production: boolean;
}): () => Analytics {
  return () => methodForwarder<Analytics>();
}
