import { initErrorReporting } from "@/wab/server/observability";
import { beforeSend } from "@/wab/server/observability/sentry-filters";

// Imported explicitly by main.ts, codegen-backend.ts and integrations-backend.ts.
initErrorReporting(beforeSend);
