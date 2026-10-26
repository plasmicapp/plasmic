import { initErrorReporting } from "@/wab/server/observability";
import { beforeSend } from "@/wab/server/observability/sentry-filters";

initErrorReporting(beforeSend);
