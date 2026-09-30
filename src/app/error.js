'use client';

// The boundary for every page that has no error.js of its own. Before
// 30 September 2026 there was none at the root, so a failure outside the
// thirteen covered sections fell through to Next's bare default. Same screen
// as every other boundary: see components/error-screen/ErrorScreen.js.
import ErrorScreen from '@/components/error-screen/ErrorScreen';

export default function RootError({ error, reset }) {
  return <ErrorScreen error={error} reset={reset} />;
}
