"use client";
import { SessionProvider } from "next-auth/react";
import React from "react";
import SessionExpiryGuard from "./SessionExpiryGuard";

// The app talks to the real backend only. The mock fetch interceptor, the
// seeded mock session and the auto-login shim that used to live here have been
// removed - every page now reads live data or shows an honest empty state.

const SessionWrapper = ({ children }) => {
    return (
        // refetchOnWindowFocus is next-auth's default and it is the wrong
        // default here. Every time the tab regained focus the session was
        // re-fetched, and any screen that renders a loader while
        // status === "loading" tore its form down and built a new one, so
        // half-finished input disappeared for no reason the user could see.
        // The session is checked on mount and repaired by SessionExpiryGuard
        // when a real 401 comes back, which is when it actually matters.
        <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
            <SessionExpiryGuard />
            {children}
        </SessionProvider>
    );
};

export default SessionWrapper;
