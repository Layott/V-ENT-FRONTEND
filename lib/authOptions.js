import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"; // For form-based login
import GoogleProvider from 'next-auth/providers/google';

// Helper function to handle backend authentication
async function handleBackendAuth(userData) {
  // Mock-mode bypass: skip backend fetch entirely (server-side Node fetch is not
  // intercepted by lib/mockFetch which only patches window.fetch).
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    const username = (userData.email || 'demo@v-ent.co').split('@')[0];
    return {
      status: 'success',
      session_token: 'mock_session_token_demo',
      user_id: 'user_001',
      data: {
        session_token: 'mock_session_token_demo',
        user_id: 'user_001',
        username,
      },
      redirectUrl: '/home',
    };
  }

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

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      // Modify in [...nextauth]/route.js
async authorize(credentials) {
  try {
    // Use the shared authentication handler
    const data = await handleBackendAuth({
      email: credentials.email,
      password: credentials.password
    });

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