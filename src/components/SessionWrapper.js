"use client";
import { SessionProvider } from "next-auth/react";
import React from "react";
import SessionExpiryGuard from "./SessionExpiryGuard";

// The app talks to the real backend only. The mock fetch interceptor, the
// seeded mock session and the auto-login shim that used to live here have been
// removed - every page now reads live data or shows an honest empty state.

const SessionWrapper = ({ children }) => {
    return (
        <SessionProvider>
            <SessionExpiryGuard />
            {children}
        </SessionProvider>
    );
};

export default SessionWrapper;
