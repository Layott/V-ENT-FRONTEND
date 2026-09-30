// Every server-side error the frontend meets, as one line in the log (owner
// rule R81, inbox 402, 1 October 2026).
//
// Until now a page that failed while rendering on the server left nothing a
// person could find: the visitor saw the error page and the pm2 log held
// whatever the framework happened to print. Next 15 calls onRequestError for
// every such failure. Each becomes one JSON line on stderr, which pm2 writes to
// the frontend's error log on the box, beside the backend's Django log.
//
// What is written is the address WITHOUT its query string, the method, the
// kind of route and the error's message and digest. Never a header, a cookie,
// a query string or a body: a sign-in link or a reset token can ride in any of
// them, and a log is not a place a credential may land (R81).

export function register() {
  // Nothing to start: the log is stderr, which the process manager collects.
}

export async function onRequestError(error, request, context) {
  const path = String(request?.path || '').split('?')[0];
  const line = {
    at: new Date().toISOString(),
    level: 'error',
    source: 'frontend',
    method: request?.method || '',
    path,
    route: context?.routePath || '',
    kind: context?.routeType || '',
    render: context?.renderSource || '',
    message: String(error?.message || error || '').slice(0, 500),
    digest: error?.digest || '',
  };
  try {
    process.stderr.write(JSON.stringify(line) + '\n');
  } catch {
    // Logging must never be the reason a request fails twice.
  }
}
