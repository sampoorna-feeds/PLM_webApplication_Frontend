'use client';

/**
 * Global error boundary for the application
 * This component is used by Next.js to handle errors that occur outside of the normal error boundary
 * It must be a client component and should not use any contexts to avoid SSR issues
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <h1>Something went wrong!</h1>
          <p>{error.message}</p>
          {error.digest && (
            <p style={{ fontSize: '0.875rem', color: '#666' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

