global.PUBLICPATH = "/";
global.DEPLOYENV = "test";

// Set global variables BEFORE importing modules.
// Importing modules may have side-effects that depend on these variables.

import { _testonly } from "@/wab/client/observability";
import { ConsoleLogAnalytics } from "@/wab/shared/observability/ConsoleLogAnalytics";

_testonly.setGlobalAnalytics(new ConsoleLogAnalytics());
