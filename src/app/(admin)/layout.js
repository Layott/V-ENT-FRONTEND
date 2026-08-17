'use client'

import '../../app/globals.css'

// The admin portal talks to the real backend only.

export default function AdminLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>V-ENT Admin</title>
        <meta name="description" content="V-ENT Admin Portal - restricted access" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/logo_mark_red.svg" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
