import type { NodeOptions } from "@sentry/node";

const errorContexts = new WeakMap<
  Error,
  Record<string, Record<string, unknown>>
>();

export function setSentryErrorContext(
  error: Error,
  name: string,
  data: Record<string, unknown>,
): void {
  errorContexts.set(error, {
    ...errorContexts.get(error),
    [name]: data,
  });
}

const ignoredErrorMessages = [
  "CSRF token mismatch",
  "Connection closed before response fulfilled",
  "Query runner already released",
];

export function shouldIgnoreErrorByMessage(message: string) {
  return ignoredErrorMessages.some((pattern) => message.includes(pattern));
}

// Errors captured outside the Express pipeline need the same filtering.
export const beforeSend: NonNullable<NodeOptions["beforeSend"]> = (
  event,
  hint,
) => {
  const msg = event.exception?.values?.[0]?.value;
  if (msg && shouldIgnoreErrorByMessage(msg)) {
    return null;
  }
  if (hint.originalException instanceof Error) {
    const contexts = errorContexts.get(hint.originalException);
    if (contexts) {
      event.contexts = { ...event.contexts, ...contexts };
    }
  }
  return event;
};
