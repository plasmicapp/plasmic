import { Spinner } from "@/wab/client/components/widgets";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import useDebounce from "@/wab/commons/components/use-debounce";
import React, { useEffect, useState } from "react";
import "react-quill/dist/quill.snow.css";
const LazyRichTextEditor = React.lazy(
  () => import("@/wab/client/components/RichTextEditor")
);

export function RichTextPropEditor({
  onChange,
  value = "",
}: {
  onChange: (val: string) => void;
  value: string | undefined;
}) {
  const [draft, setDraft] = useState(value);

  function save() {
    if (value !== draft) {
      onChange(draft);
    }
  }

  const debounced = useDebounce(draft, 1500);

  useEffect(() => {
    save();
  }, [debounced]);

  // We must save on blur or click away, or else we can trigger a save too late (e.g. if we're in a popover and you click out, unmounting).

  return (
    <React.Suspense fallback={<Spinner />}>
      <div
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
        onBlur={() => {
          save();
        }}
        style={{
          padding: "0px 0px 0px 8px",
          borderLeft: "4px solid rgb(243, 243, 242)",
        }}
      >
        <OnClickAway
          onDone={() => {
            save();
          }}
        >
          <LazyRichTextEditor
            onChange={(text) => {
              setDraft(text);
            }}
            value={draft}
          />
        </OnClickAway>
      </div>
    </React.Suspense>
  );
}
