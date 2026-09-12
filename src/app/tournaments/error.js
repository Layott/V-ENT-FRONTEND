'use client';

// Every error boundary shows the same screen, and none of them shows a raw
// exception. See components/error-screen/ErrorScreen.js for why.
//
// CEO, 7 September 2026, on seeing "Something went wrong / MdSell is not
// defined": "what is this error that is not a good kind of error to show
// users".

import ErrorScreen from '@/components/error-screen/ErrorScreen';

export default function TournamentsError({ error, reset }) {
  return <ErrorScreen error={error} reset={reset}
      whatKey="error.what.tournaments"
      whatText='We could not load the tournaments just now.' />;
}
