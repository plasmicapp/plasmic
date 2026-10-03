import { context } from "@opentelemetry/api";
import * as Sentry from "@sentry/node";

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
  // This happens whenever the client disconnects first, and the
  // server hasn't finished the response yet and attempts to make
  // a typeorm query. Nothing we can do about that.
  "Query runner already released",
];

export function shouldIgnoreErrorByMessage(message: string) {
  return ignoredErrorMessages.some((pattern) => message.includes(pattern));
}

function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT,
    skipOpenTelemetrySetup: true,
    // We need beforeSend because errors don't necessarily make their way
    // through the Express pipeline - they can be thrown from anywhere, in
    // Express or outside (or from random async event loop iterations).
    beforeSend(event, hint) {
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
    },
  });

  context.disable();
  context.setGlobalContextManager(new Sentry.SentryContextManager());
}

initSentry();
