import { useHistory, useLocation } from "@/wab/client/route/HistoryProvider";
import * as React from "react";
import { useBeforeUnload } from "react-use";

/**
 * Same as useBeforeUnload, but also blocks client-side navigation.
 */
export function useBeforeNavigation(enabled: boolean, message: string): void {
  useBeforeUnload(enabled, message);

  const history = useHistory();
  const location = useLocation();
  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    const unblock = history.block((tx) => {
      if (window.confirm(message)) {
        // Must unblock BEFORE retry, or the retried navigation is blocked
        // again and prompts forever.
        unblock();
        tx.retry();
      }
    });
    return unblock;
    // Re-arm only after a navigation lands (keying on the location):
    // re-registering synchronously after retry() would intercept POP's own
    // async retry and loop the confirm dialog.
  }, [history, enabled, message, location.key]);
}
