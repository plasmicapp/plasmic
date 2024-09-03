global.PUBLICPATH = "/";
global.DEPLOYENV = "test";

// Set global variables BEFORE importing modules.
// Importing modules may have side-effects that depend on these variables.

import { initBrowserAnalytics } from "@/wab/client/analytics";
import { ConsoleLogAnalytics } from "@/wab/shared/analytics/ConsoleLogAnalytics";

initBrowserAnalytics(new ConsoleLogAnalytics());
