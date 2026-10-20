import { ModelUiId } from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { useResourceApi } from "@/wab/client/studio-ctx/ui/studio-ui-resources";
import * as React from "react";

type MentionLookupResult =
  | { state: "loading" }
  | { state: "unavailable" }
  | { state: "found"; label: string; jump(): void };

export function ResourceMentionDisplay({ uiId }: { uiId: ModelUiId }) {
  const lookup = useMentionLookup(uiId);
  if (lookup.state === "loading") {
    return null;
  }
  if (lookup.state === "unavailable") {
    return (
      <span className="mention-link mention-link--missing">@(deleted)</span>
    );
  }

  return (
    <span
      className="mention-link"
      role="link"
      tabIndex={0}
      onClick={lookup.jump}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          lookup.jump();
        }
      }}
    >
      {`@${lookup.label}`}
    </span>
  );
}

function useMentionLookup(uiId: ModelUiId): MentionLookupResult {
  const api = useResourceApi();
  const [label, setLabel] = React.useState<string | null>();
  React.useEffect(() => {
    // Never show the previous target's label while the new one is in flight.
    setLabel(undefined);
    return api?.subscribe(uiId, (l) => setLabel(l ?? null));
  }, [api, uiId]);

  if (label === null) {
    return { state: "unavailable" };
  }
  if (!api || label === undefined) {
    return { state: "loading" };
  }
  return {
    state: "found",
    label,
    jump: () => api.dispatch(uiId, "jump"),
  };
}
