import { Bundle } from "../../src/wab/shared/bundles";
import formsBundle from "./forms.json";
import staleMigrationBundle from "./stale-bundle.json";
import stateManagementBundle from "./state-management.json";
import tutorialAppBundle from "./tutorial-app.json";

export default {
  "state-management": stateManagementBundle,
  "tutorial-app": tutorialAppBundle,
  "stale-bundle": staleMigrationBundle,
  forms: formsBundle,
} as Record<string, Bundle>;
