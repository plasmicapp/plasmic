import * as React from "react";

/**
 * For stories: pads the story and marks each hoverable <time> with a dotted
 * underline, with a hint above.
 */
export function HoverableTime({ children }: { children: React.ReactNode }) {
  return (
    <div className="hoverable-time" style={{ padding: 120 }}>
      <style>{`
        .hoverable-time time {
          text-decoration: underline dotted;
          text-underline-offset: 3px;
        }
      `}</style>
      <p style={{ marginBottom: 24, opacity: 0.7 }}>
        Hover or Tab to the dotted-underlined text to see the time in other time
        zones.
      </p>
      {children}
    </div>
  );
}
