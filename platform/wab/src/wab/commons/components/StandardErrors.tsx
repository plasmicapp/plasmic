import * as Sentry from "@sentry/browser";
import { Alert } from "antd";
import React, { ReactNode, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

export function StandardErrorFallback({ error }: { error: Error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <Alert
      message="Error"
      description={`Unexpected error: ${error}`}
      type="error"
      showIcon
    />
  );
}

export function StandardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={StandardErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
