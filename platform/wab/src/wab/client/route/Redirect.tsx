import { handleError } from "@/wab/client/ErrorNotifications";
import { useHistory } from "@/wab/client/route/HistoryProvider";
import { spawn } from "@/wab/shared/common";
import { History, createPath } from "history";
import * as React from "react";

export function Redirect({ to }: { to: string }) {
  const history = useHistory();
  React.useLayoutEffect(() => {
    redirect(history, to);
  }, []);
  return null;
}

export function RedirectAsync({ to }: { to: () => Promise<string> }) {
  const history = useHistory();
  React.useLayoutEffect(() => {
    let cleanup = false;
    spawn(
      to().then((resolvedTo) => {
        if (cleanup) {
          return;
        }
        redirect(history, resolvedTo);
      }, handleError)
    );
    return () => {
      cleanup = true;
    };
  }, []);
  return null;
}

function redirect(history: History, to: string) {
  if (to.startsWith("https://")) {
    window.location.href = to;
  } else if (to !== createPath(history.location)) {
    history.replace(to);
  }
}
