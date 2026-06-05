import { PlasmicHostUrlInput } from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicHostUrlInput";
import { swallow } from "@/wab/shared/common";
import * as React from "react";

interface HostUrlInputProps {
  defaultUrl?: string;
  originOnly?: boolean;
  expectedOrigin?: string;
  onConfirm?: (url: string, parsedUrl: URL) => void;
  confirmDisabled?: boolean;
  onClear?: () => void;
  clearDisabled?: boolean;
  placeholder?: string;
  /** data-test-id for the URL input. */
  inputTestId?: string;
  className?: string;
}

function HostUrlInput({
  defaultUrl,
  expectedOrigin,
  originOnly,
  onConfirm,
  confirmDisabled,
  onClear,
  clearDisabled,
  placeholder,
  inputTestId,
  className,
}: HostUrlInputProps) {
  const [draftUrl, setDraftUrl] = React.useState(defaultUrl || "");

  React.useEffect(() => {
    setDraftUrl(defaultUrl ?? "");
  }, [defaultUrl]);

  const parsedDraftUrl = parseHostUrl(draftUrl);
  const validDraftUrl =
    // Validate parsed URL first.
    !!parsedDraftUrl &&
    validateHostUrl(parsedDraftUrl) &&
    // Do a few more checks to ensure draftUrl is visually equivalent.
    (draftUrl === parsedDraftUrl.toString() ||
      draftUrl + "/" === parsedDraftUrl.toString()) &&
    (expectedOrigin === undefined || parsedDraftUrl.origin === expectedOrigin);

  const handleBlur = () => {
    // On blur, try to fix up the URL for the user (add a scheme, normalize).
    const normalized = normalizeHostUrl(draftUrl);
    if (normalized && normalized !== draftUrl) {
      setDraftUrl(normalized);
    }
  };

  return (
    <PlasmicHostUrlInput
      className={className}
      showPlasmicHostValidations={!originOnly}
      urlValidationStatus={
        !draftUrl ? undefined : validDraftUrl ? "valid" : "invalid"
      }
      urlPathStatus={
        !draftUrl
          ? undefined
          : draftUrl.endsWith("/plasmic-host")
          ? "standard"
          : "nonStandard"
      }
      urlInput={{
        props: {
          "data-test-id": inputTestId,
          value: draftUrl,
          onChange: (val: string) => setDraftUrl(val),
          onBlur: handleBlur,
          ...(placeholder !== undefined
            ? { placeholder }
            : {
                // placeholder not set to use default defined in PlasmicHostUrlInput
              }),
        },
      }}
      confirmButton={
        onConfirm || confirmDisabled !== undefined
          ? {
              props: {
                onClick: () => {
                  if (!validDraftUrl || !parsedDraftUrl || confirmDisabled) {
                    return;
                  }
                  onConfirm?.(draftUrl, parsedDraftUrl);
                },
                disabled: !validDraftUrl || confirmDisabled,
              },
            }
          : {
              render: () => null,
            }
      }
      clearButton={
        onClear || clearDisabled !== undefined
          ? {
              props: {
                onClick: onClear,
                disabled: clearDisabled,
              },
            }
          : {
              render: () => null,
            }
      }
    />
  );
}

export default HostUrlInput;

function parseHostUrl(s: string | null | undefined) {
  return swallow(() => (s ? new URL(s) : null));
}

function validateHostUrl(url: URL) {
  return (
    !!url.origin && (url.protocol === "http:" || url.protocol === "https:")
  );
}

/**
 * Normalizes a user-entered host URL into a canonical http(s) URL string, or
 * returns `null` if it can't be made into a valid one.
 *
 * - Already-valid http(s) URLs are canonicalized (e.g. `new URL().toString()`).
 * - Schemeless input gets a scheme prepended: `http` for localhost/127.0.0.1
 *   (dev), `https` otherwise. Note `new URL("localhost:3000")` parses as
 *   protocol `localhost:`, so we can't rely on parsing having thrown.
 */
function normalizeHostUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = parseHostUrl(trimmed);
  if (parsed && validateHostUrl(parsed)) {
    return parsed.toString();
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    const scheme =
      trimmed.startsWith("localhost:") || trimmed.startsWith("127.0.0.1:")
        ? "http"
        : "https";
    const withScheme = parseHostUrl(`${scheme}://${trimmed}`);
    if (withScheme && validateHostUrl(withScheme)) {
      return withScheme.toString();
    }
  }

  return trimmed;
}

export const _testonly = {
  normalizeHostUrl,
};
