import { CustomError } from "@/wab/shared/common";

/**
 * Hard failure of an HTML import when the input produced nothing usable.
 * Carries any partial errors that might occur during the parsing.
 */
export class WIImportFailedError extends CustomError {
  name = "WIImportFailedError";
  constructor(
    public readonly reason: "invalid-html" | "nothing-to-insert",
    public readonly errors: WIError[],
    message: string
  ) {
    super(message);
  }
}

/**
 * Structured errors for the HTML import pipeline (html-parser and html-to-tpl).
 *
 * The import as a whole still succeeds, but invalid node/prop/style are skipped.
 * Hard failure is modeled separately as {@link WIImportFailedError}.
 */
export type WIError =
  | {
      code: "invalid-component-instance";
      path: string;
      reason: string;
    }
  | {
      code: "invalid-data-props";
      path: string;
      component: string;
      reason: string;
    }
  | {
      code: "unknown-component";
      path: string;
      component: string;
      projectId?: string;
    }
  | {
      code: "invalid-component-prop";
      component: string;
      prop: string;
      reason: string;
      path?: string;
    }
  | {
      code: "unknown-slot";
      path: string;
      component: string;
      slot: string;
    }
  | {
      code: "invalid-slot-target";
      path: string;
      reason: string;
    }
  | {
      code: "invalid-slot";
      path: string;
      reason: string;
    }
  | { code: "svg-upload-failed"; path: string }
  | {
      code: "invalid-style-declaration";
      prop: string;
      value: string;
      path?: string;
      reason?: string;
    }
  | {
      code: "styles-not-applicable";
      tpl: WITplRef;
      props: string[];
      variantDesc: string;
    }
  | { code: "unmatched-screen-variant"; width: number }
  | { code: "unsupported-media-query"; query: string }
  | { code: "unresolved-token"; token: string }
  | {
      code: "invalid-keyframes";
      sequence: string;
      selector?: string;
    }
  | { code: "unknown-animation"; animation: string }
  | {
      code: "svg-size-fallback";
      path: string;
      fallback: string;
    }
  | { code: "invalid-css"; message: string }
  | { code: "unsupported-selector"; selector: string }
  | {
      code: "unsupported-style-variant";
      tpl: WITplRef;
      selectors: string[];
    };

/**
 * Reference to a tpl that was inserted but degraded.
 */
export interface WITplRef {
  type: "TplTag" | "TplComponent" | "TplSlot";
  uuid: string;
}

/** Render a single WIError as a human/LLM-readable message. */
export function formatWIError(error: WIError): string {
  const pathAt = (path: string | undefined) => (path ? ` at "${path}"` : "");
  switch (error.code) {
    case "invalid-component-instance":
      return `Skipped invalid <plasmic-component>${pathAt(error.path)}: ${
        error.reason
      }.`;
    case "invalid-data-props":
      return `Ignored data-props on component "${error.component}"${pathAt(
        error.path
      )}: ${error.reason}. The component was inserted without props.`;
    case "unknown-component":
      return `Skipped component "${error.component}"${pathAt(
        error.path
      )}: not found ${
        error.projectId
          ? `in imported project "${error.projectId}"`
          : "in this project"
      }.`;
    case "invalid-component-prop":
      return `Invalid prop "${error.prop}" on component "${
        error.component
      }"${pathAt(error.path)}: ${error.reason}.`;
    case "unknown-slot":
      return `Skipped content for slot "${error.slot}"${pathAt(
        error.path
      )}: component "${error.component}" has no such slot.`;
    case "invalid-slot-target":
      return `Skipped <slot-target>${pathAt(error.path)}: ${error.reason}.`;
    case "invalid-slot":
      return `Skipped slot content${pathAt(error.path)}: ${error.reason}.`;
    case "svg-upload-failed":
      return `Skipped SVG${pathAt(error.path)}: failed to process the image.`;
    case "invalid-style-declaration":
      return `Dropped invalid style "${error.prop}: ${error.value}"${pathAt(
        error.path
      )}${error.reason ? ` (${error.reason})` : ""}.`;
    case "styles-not-applicable":
      return `Dropped styles not applicable to ${error.tpl.type} uuid=${
        error.tpl.uuid
      } (${error.variantDesc} variant): ${error.props.join(", ")}.`;
    case "unmatched-screen-variant":
      return `Skipped styles for the ${error.width}px breakpoint: no matching screen breakpoint in this project.`;
    case "unsupported-media-query":
      return `Skipped media query "${error.query}": only px-based min-width/max-width queries are supported.`;
    case "unresolved-token":
      return `Kept unresolved token reference "var(--token-${error.token})": no matching style token in this project.`;
    case "invalid-keyframes":
      return error.selector
        ? `Ignored invalid keyframe selector "${error.selector}" in @keyframes "${error.sequence}".`
        : `Skipped invalid @keyframes "${error.sequence}".`;
    case "unknown-animation":
      return `Dropped animation "${error.animation}": no matching animation sequence in this project.`;
    case "svg-size-fallback":
      return `SVG${pathAt(
        error.path
      )} has no usable width/height; defaulted to ${error.fallback}.`;
    case "invalid-css":
      return `CSS parse issue: ${error.message}.`;
    case "unsupported-selector":
      return `Ignored selector "${error.selector}": pseudo-elements and non-DOM selectors are not supported.`;
    case "unsupported-style-variant":
      return `Skipped element-state styles (${error.selectors.join(", ")}) on ${
        error.tpl.type
      } uuid=${
        error.tpl.uuid
      }: element states are only supported on plain elements.`;
  }
}

export function formatWIErrors(errors: WIError[]): string[] {
  return [...new Set(errors.map((error) => formatWIError(error)))];
}
