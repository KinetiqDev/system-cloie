"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "system-ui, sans-serif",
          background: "var(--surface-secondary, #f8fafc)",
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: "28rem",
            width: "100%",
            border: "1px solid var(--border-default, #e2e8f0)",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            background: "var(--surface-primary, #ffffff)",
            color: "var(--text-primary, #0f172a)",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Critical Error
          </h1>
          <p style={{ color: "var(--text-secondary, #334155)", marginBottom: "1rem" }}>
            The application hit an unexpected problem and this page could not finish loading. Try
            again, or return home if the problem persists.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "0.75rem",
                color: "var(--text-muted, #64748b)",
                marginBottom: "1rem",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "var(--primary, #2563eb)",
                color: "var(--on-primary, #ffffff)",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.assign("/")}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "var(--surface-primary, #ffffff)",
                color: "var(--text-primary, #0f172a)",
                border: "1px solid var(--border-default, #e2e8f0)",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
