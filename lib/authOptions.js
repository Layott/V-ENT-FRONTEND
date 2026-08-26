import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"; // For form-based login
import GoogleProvider from 'next-auth/providers/google';

// Helper function to handle backend authentication
async function handleBackendAuth(userData, client = {}) {
  // The mock-mode bypass that used to sit here minted a session token without
  // ever calling the backend. The mock layer was deleted in August; leaving the
  // branch in meant one stray environment variable could sign anybody in.
  try {
    const endpoint = userData.provider
      ? `${process.env.NEXT_PUBLIC_API_URL}/auth/social-auth/`
      : `${process.env.NEXT_PUBLIC_API_URL}/auth/login/`;
      
    const payload = userData.provider 
      ? {
          provider: userData.provider,
          provider_id: userData.providerId,
          profile_pic: userData.picture || '',
          full_name: userData.name || '',
          email: userData.email
        }
      : {
          username_or_email: userData.email,
          password: userData.password
        };

    // This call is made by our own server, so without these the backend sees
    // 127.0.0.1 and a Node user agent - which is what the Security page was
    // reporting as the device that signed in. Forward the real client.
    const headers = { "Content-Type": "application/json" };
    if (client.ip) headers["X-Forwarded-For"] = client.ip;
    if (client.userAgent) headers["User-Agent"] = client.userAgent;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();

    // Always set the redirect URL to the profile page
    data.redirectUrl = "/home";
    
    return data;
  } catch (error) {
    // Never log `error` here — it can carry request payloads / tokens.
    throw error;
  }
}

export const authOptions = {
  providers: [
    // A session that was established somewhere else: signing in with an
    // African Free Fire Community account hands the browser a V-ENT session
    // token, and this turns it into a NextAuth session. The token is not
    // trusted on sight - it is spent against the backend, which only answers
    // for a token it issued itself.
    CredentialsProvider({
      id: "external-token",
      name: "External sign-in",
      credentials: {
        token: { label: "Session token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token) return null;
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/get-user-informations/`,
            { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) },
          );
          if (!res.ok) return null;
          const body = await res.json();
          const profile = body?.data || body;
          if (!profile?.username) return null;
          return {
            id: String(profile.user_id ?? profile.username),
            name: profile.full_name || profile.username,
            username: profile.username,
            email: profile.email,
            session_token: token,
            redirectUrl: "/home",
          };
        } catch {
          return null;
        }
      },
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      // Modify in [...nextauth]/route.js
async authorize(credentials, req) {
  try {
    // next-auth hands the incoming request in, which is the only place the
    // browser's address and user agent still exist by this point.
    const headers = req?.headers || {};
    const forwarded = headers['x-forwarded-for'] || '';
    const client = {
      ip: (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim(),
      userAgent: headers['user-agent'] || '',
    };

    const data = await handleBackendAuth({
      email: credentials.email,
      password: credentials.password
    }, client);

    // Check for successful authentication - NORMALIZE RESPONSE STRUCTURE
    const sessionToken = data.session_token || 
                        (data.data && data.data.session_token) || 
                        data.token || 
                        (data.data && data.data.token);
                        
    const userId = data.user_id ||
                  (data.data && data.data.user_id) ||
                  data.id ||
                  (data.data && data.data.id);

    const username = data.username ||
                  (data.data && data.data.username);

    if (sessionToken) {
      // Store the session token exactly as returned from backend
      const user = {
        session_token: sessionToken,
        email: credentials.email,
        id: userId,
        username: username,
        redirectUrl: "/home"
      };
      
      return user;
    } else {
      throw new Error(data.message || 'Login failed - No session token');
    }
  } catch (error) {
    return null; // Authentication failed
  }
}
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account consent",
          access_type: "online",
          response_type: "code",
          scope: "openid email profile"
        },
        httpOptions: {
          timeout: 10000, // Increase to 10 seconds
        },
      },
    }),
  ],

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: "jwt", // Required for getToken() in middleware
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // Consistently structure the session object
    async session({ session, token }) {
      if (token.session_token) {
        session.user = {
          ...session.user,
          id: token.user_id || token.sub,
          username: token.username,
          sessionToken: token.session_token, // Make sure we use the exact key expected in profile
        };
        
        // Pass the redirect URL to the session if available
        if (token.redirectUrl) {
          session.redirectUrl = token.redirectUrl;
        }
      }
      return session;
    },
    
    // Consistently structure the JWT token
    async jwt({ token, user, account }) {
      // If this is coming from a sign-in (either credentials or OAuth)
      if (user?.session_token) {
        // Store the session token exactly as received from the backend
        token.session_token = user.session_token;
        token.user_id = user.id;
        token.username = user.username;

        // Always set redirect to home dashboard
        token.redirectUrl = "/home";
      }
      
      return token;
    },
  
    // Integrated sign-in callback for both authentication methods
    async signIn({ user, account, profile }) {
      // Form-based login was already handled in authorize
      if (account.provider === 'credentials') {
        return true;
      }
      
      // Handle social login. Facebook was removed 2026-08-17 (CEO: keep Google only).
      if (account.provider === 'google') {
        try {
          if (!profile.email || !account.provider || !account.providerAccountId) {
            return `/login?error=auth-failed&message=${encodeURIComponent("Missing required fields.")}`;
          }
          
          // Use the shared authentication handler
          const data = await handleBackendAuth({
            provider: account.provider,
            providerId: account.providerAccountId,
            picture: profile.picture || profile.image || profile.picture_url || '',
            name: profile.name || profile.full_name || '',
            email: profile.email
          });
          
          // Check for successful authentication
          if (!data.data?.session_token) {
            return `/login?error=auth-failed&message=${encodeURIComponent(data.message || "Authentication failed")}`;
          }
          
          // Store session token and user ID EXACTLY as returned from backend
          // This is critical for the profile API to work correctly
          user.session_token = data.data.session_token;
          user.id = data.data.user_id || data.data.username; // Use username as fallback
          user.username = data.data.username;
          
          // Always redirect to home dashboard
          user.redirectUrl = "/home";
          
          return true;
        } catch (error) {
          return `/login?error=auth-failed&message=${encodeURIComponent("Server error occurred")}`;
        }
      }
      
      return false;
    },
    
    // Redirect strictly within NextAuth's own origin.
    //
    // This used to prefer process.env.CLIENT_URL over baseUrl, so a stale value
    // in .env (it still says http://localhost:3000) sent every successful login
    // to a completely different host — the user authenticated, then landed on
    // whatever was serving that origin. baseUrl comes from NEXTAUTH_URL, which
    // is by definition this deployment.
    async redirect({ url, baseUrl }) {
      // Post-authentication: straight to the dashboard.
      if (url.includes('callback') || url.includes('signin') || url.includes('api/auth')) {
        return `${baseUrl}/home`;
      }

      // Relative paths stay on this origin.
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // Absolute URLs are only honoured when they point at this origin.
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) {
          return url;
        }
      } catch {
        // Malformed URL — fall through to the safe default.
      }

      return `${baseUrl}/home`;
    },
  },

  events: {
    async signOut({ token }) {
      // Call backend to invalidate the session
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout/`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token.session_token}` 
          }
        });
      } catch (error) {
        // Swallow logout errors — session is cleared client-side regardless.
      }
    }
  },
  
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);