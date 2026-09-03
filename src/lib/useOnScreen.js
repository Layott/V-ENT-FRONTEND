'use client';

// Is this element actually in front of somebody.
//
// Written for the studio previews. Each one is a real overlay page in an
// iframe, polling the feed every four seconds and reloading itself every ten,
// and there can be eight of them on the elements panel plus one per uploaded
// overlay. Rendering the ones nobody has scrolled to costs an organiser their
// data and their battery, and costs the API a burst of requests from a single
// address, which is what got the console rate limited on 3 September.
//
// Returns true when at least a sliver of the element is on screen, and stays
// true for `keepAlive` after it leaves, so scrolling a card just past the edge
// and back does not tear the overlay down and build it again.

import { useEffect, useRef, useState } from 'react';

export default function useOnScreen(ref, { rootMargin = '200px', keepAlive = 3000 } = {}) {
  const [onScreen, setOnScreen] = useState(false);
  const leaving = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    // No IntersectionObserver: an old browser, or a test environment. Show it
    // rather than hide it, because a preview that never appears is a bug and a
    // preview that costs a little too much is not.
    if (typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (leaving.current) { clearTimeout(leaving.current); leaving.current = null; }
        setOnScreen(true);
      } else if (!leaving.current) {
        leaving.current = setTimeout(() => {
          leaving.current = null;
          setOnScreen(false);
        }, keepAlive);
      }
    }, { rootMargin });

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (leaving.current) { clearTimeout(leaving.current); leaving.current = null; }
    };
  }, [ref, rootMargin, keepAlive]);

  return onScreen;
}
