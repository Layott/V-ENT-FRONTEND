"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";

// When NEXT_PUBLIC_USE_MOCK=true and the user hits a protected route without
// a session, silently sign in as the demo user and reload. Prevents the
// friction of having to click "Try demo account" every time a deep-link is
// opened. Guarded with a per-session flag so a failed sign-in doesn't loop.
const PROTECTED = [
  "/home",
  "/events",
  "/anime",
  "/user-profile",
  "/edit-user-profile",
  "/teams",
  "/edit-team-profile",
  "/tournaments/create-tournament",
  "/tournaments/drafts",
  "/tournaments/register-tournament",
  "/wallets",
  "/production",
  "/settings",
  "/wager",
  "/community",
  "/marketplace",
  "/shop",
  "/organizations",
];

const ATTEMPT_KEY = "__ventMockAutoLoginAttempted";

export default function MockAutoLogin() {
  const { status } = useSession();
  const pathname = usePathname() || "";

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") return;
    if (status !== "unauthenticated") return;

    const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!isProtected) return;

    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ATTEMPT_KEY) === "1") return;

    sessionStorage.setItem(ATTEMPT_KEY, "1");

    signIn("credentials", {
      redirect: false,
      email: "demo@v-ent.co",
      password: "demo1234",
    }).then((res) => {
      if (res?.ok) {
        window.location.reload();
      }
    }).catch(() => {
      // Swallow — user can still click "Try demo account" manually.
    });
  }, [status, pathname]);

  return null;
}
