'use client';

import { useEffect } from 'react';
import '../../app/globals.css';
import { useT } from '@/i18n/LanguageProvider';

// The admin portal talks to the real backend only.
//
// This layout used to render its own <html>, <head> and <body>. A route group
// like (admin) does NOT start a new document - it is still nested inside the
// root layout in src/app/layout.js - so the browser received <html><body>
// wrapped in another <html><body>. That is invalid, React could not match the
// server markup to the DOM, and hydration bailed out for the whole console.
//
// The visible symptom was that nothing in the admin dashboard responded: links
// still worked because anchors need no JavaScript, but every button was inert,
// so no modal opened, no filter applied and no action ran. It looked like the
// pages had loaded fine.
//
// The root layout already sets lang, viewport and the icons, so the only thing
// worth keeping here is the console's own document title.
export default function AdminLayout({
  children
}) {
  const tt = useT();
  const title = tt("ui.v.ent.admin.1b2e", "V-ENT Admin");
  useEffect(() => {
    document.title = title;
  }, [title]);
  return children;
}
