import { methodForwarder } from "@/wab/commons/methodForwarder";
import { PinoLogger } from "@/wab/server/observability/PinoLogger";
import { Analytics } from "@/wab/shared/observability/Analytics";
import { Logger } from "@/wab/shared/observability/Logger";

const loggerInstance: Logger = new PinoLogger();

export function initAnalyticsFactory(opts: {
  production: boolean;
}): () => Analytics {
  return () => methodForwarder<Analytics>();
}

export function logger(): Logger {
  return loggerInstance;
}
