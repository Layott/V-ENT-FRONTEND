// Mock NextAuth session + localStorage seed for mock mode.
// Used by SessionWrapper when NEXT_PUBLIC_USE_MOCK=true so the UI behaves as
// if a real user is already authenticated — i.e. the header avatar renders,
// protected pages don't bounce to /login, and admin pages don't bounce to
// /admin/login.

import { mockUser } from './mockData';

// A NextAuth-shaped session object, the same shape useSession() returns when
// the strategy is JWT and the session callback in lib/authOptions.js has run.
// Consumers read session.user.sessionToken; keep the id/email/username fields
// aligned with what the real backend returns on login.
export const MOCK_SESSION = {
  data: {
    user: {
      id: mockUser.id,
      email: mockUser.email,
      username: mockUser.username,
      name: mockUser.full_name,
      sessionToken: mockUser.session_token,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  status: 'authenticated',
};

// Seed the localStorage slots the UI reads on first paint. Safe to call every
// mount — only writes if not already present so it doesn't trample an
// already-persisted real session.
export function seedMockSessionStorage() {
  if (typeof window === 'undefined') return;

  try {
    if (!localStorage.getItem('userProfile')) {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({
          profile_picture: mockUser.profile_picture,
          full_name: mockUser.full_name,
          username: mockUser.username,
        })
      );
    }

    // Admin dashboard reads these and bounces to /admin/login otherwise.
    if (!localStorage.getItem('adminToken')) {
      localStorage.setItem('adminToken', 'mock_admin_token');
      document.cookie = `adminToken=mock_admin_token; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
    if (!localStorage.getItem('adminUser')) {
      localStorage.setItem(
        'adminUser',
        JSON.stringify({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: 'super',
          role_label: 'Super Admin',
        })
      );
    }

    // Generic auth token fallback — some components look for `authToken`.
    if (!localStorage.getItem('authToken')) {
      localStorage.setItem('authToken', mockUser.session_token);
    }
  } catch {
    // localStorage may be unavailable (private mode, SSR, etc.) — fail quiet.
  }
}
