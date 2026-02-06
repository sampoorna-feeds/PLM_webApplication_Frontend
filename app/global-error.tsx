"use client";

/**
 * Global Error Boundary
 * This component handles errors that occur in the root layout or other global components.
 * It must NOT use any context providers (ThemeProvider, etc.) as it replaces the root layout.
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error | Sampoorna Feeds</title>
      </head>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                marginBottom: "1rem",
                color: "#dc2626",
              }}
            >
              Something went wrong!
            </h1>
            <p
              style={{
                fontSize: "1rem",
                color: "#6b7280",
                marginBottom: "2rem",
              }}
            >
              An unexpected error occurred. Please try again.
            </p>
            {process.env.NODE_ENV === "development" && error.message && (
              <details
                style={{
                  marginBottom: "2rem",
                  padding: "1rem",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "0.5rem",
                  textAlign: "left",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    fontSize: "0.875rem",
                    color: "#dc2626",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                color: "white",
                backgroundColor: "#2563eb",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#1d4ed8";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#2563eb";
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
