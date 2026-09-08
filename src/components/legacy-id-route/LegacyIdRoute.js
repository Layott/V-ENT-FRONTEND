'use client';

// The old `?id=` address, kept alive as a redirect to the named one.
//
// CEO, 7 September 2026: "Duplicate routes from the slug migration - fix them."
//
// They were never duplicate IMPLEMENTATIONS, which is the first thing worth
// saying: `/events/[slug]/manage/page.js` is fifteen lines that import
// `ManageEventContent` from `/events/manage/page.js`. There is one component.
//
// What was duplicated is the ADDRESS. `/events/manage?id=12` still rendered
// the whole page, so the platform had two ways to reach the same screen and
// one of them carries a primary key in the URL - which the slug rule
// prohibits, because a visible id lets anybody walk the table by counting.
//
// Deleting the old address is not the answer either. The slug rule's second
// clause is that every address a thing has ever had keeps working, and these
// have been shared in messages and bookmarked by organisers.
//
// So the old address resolves the record, learns its slug, and replaces itself
// with the named address. One implementation, one canonical address, and no
// broken link.
//
// `router.replace`, never `push`: a redirect that stacks in history means Back
// bounces the reader between the two addresses, which is worse than either.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * @param resolve  async (id) => slug | null. How this kind of record is looked
 *                 up. Given the id from the query string.
 * @param to       (slug) => the named address to land on.
 * @param fallback where to go when the record cannot be found or has no slug,
 *                 so somebody following a dead link lands on a real page
 *                 rather than a spinner that never stops.
 */
const LegacyIdRoute = ({ resolve, to, fallback }) => {
  const router = useRouter();
  const params = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const id = params.get('id');
    if (!id) {
      router.replace(fallback);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const slug = await resolve(id);
        if (cancelled) return;
        if (slug) router.replace(to(slug));
        else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
    // `resolve` and `to` are defined inline by each route and would restart
    // this on every render if they were listed. The id is what decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, router]);

  useEffect(() => {
    if (failed) router.replace(fallback);
  }, [failed, router, fallback]);

  // Deliberately blank rather than a spinner: this is a redirect, and it
  // resolves in one request. A loading state that flashes for 200ms reads as
  // the page being slow rather than as it moving.
  return <div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />;
};

export default LegacyIdRoute;
