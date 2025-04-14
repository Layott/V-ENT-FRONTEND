import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
// Remove cookies import that's causing issues
// import { cookies } from "next/headers";

// Change this to use document.cookie instead
const deleteSession = () => {
  // This will run client-side during signOut process
  if (typeof document !== 'undefined') {
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }
};

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const res = await fetch("https://vermillionent.pythonanywhere.com/auth/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username_or_email: credentials.email,
              password: credentials.password,
            })
          });

          const data = await res.json();
          console.log("🔍 Login response from backend:", data);

          if (res.ok && data.session_token) {
            return {
              session_token: data.session_token,
              email: credentials.email,
              id: data.user_id,
            };
          } else {
            throw new Error(data.message || 'Login failed');
          }
        } catch (error) {
          console.error('Error during form login:', error);
          return null; // Authentication failed
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
    })
  ],

  pages: {
    signIn: '/login',
    error: '/login', // Add this to handle errors better
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async session({ session, token }) {
      console.log("Session callback - token:", token);
      
      if (token.session_token) {
        session.user = {
          ...session.user,
          id: token.user_id,
          sessionToken: token.session_token,
        };
      }
      console.log("Session callback - modified session:", session);
      return session;
    },
    
    async jwt({ token, user, account }) {
      console.log("JWT callback - user:", user);
      console.log("JWT callback - token before:", token);
      
      // If this is coming from a sign-in
      if (user?.session_token) {
        token.session_token = user.session_token;
        token.user_id = user.id;
      }
      
      console.log("JWT callback - token after:", token);
      return token;
    },
  
    async signIn({ user, account, profile }) {
      if (account.provider === 'credentials') {
        return true;
      }
      
      if (account.provider === 'google' || account.provider === 'facebook') {
        try {
          const email = profile.email;
          const name = profile.name || profile.full_name || '';
          const profile_pic = profile.picture || profile.image || profile.picture_url || '';
          
          if (!email || !account.provider || !account.providerAccountId) {
            console.error("❌ Missing required fields:", { email, provider: account.provider, providerId: account.providerAccountId });
            return false;
          }
          
          const oauthResponse = {
            provider: account.provider,
            provider_id: account.providerAccountId,
            profile_pic,
            full_name: name,
            email,
          };
          
          console.log("📤 Sending to backend /auth/social-auth/:", oauthResponse);
          
          const backendResponse = await fetch(
            "https://vermillionent.pythonanywhere.com/auth/social-auth/",
            {
              method: 'POST',
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(oauthResponse),
              signal: AbortSignal.timeout(10000)
            }
          );
          
          console.log("📤 Backend response status:", backendResponse.status);
          
          const data = await backendResponse.json();
          console.log("📤 Backend response data:", data);
          
          if (!backendResponse.ok || data.status !== 'success' || !data.data?.session_token) {
            console.error("❌ Social auth failed:", data);
            return false;
          }
          
          console.log("✅ Social auth successful:", data);
          
          user.session_token = data.data.session_token;
          user.id = data.data.user_id || data.data.username; // Use username as fallback
          
          return true;
        } catch (error) {
          console.error('Error during OAuth backend login:', error);
          return false;
        }
      }
      
      return false;
    },
    
    async redirect({ url, baseUrl }) {
      // Fix for production redirects
      console.log("Redirect callback - URL:", url);
      console.log("Redirect callback - BaseURL:", baseUrl);
      
      // Get the production URL from env or use the baseUrl
      const productionUrl = process.env.NEXTAUTH_URL || baseUrl;
      
      // Replace localhost URLs with production URL
      if (url.includes('localhost')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const search = urlObj.search;
        return `${productionUrl}${path}${search}`;
      }
      
      // Standard NextAuth redirect logic
      if (url.startsWith(baseUrl) || url.startsWith(productionUrl)) {
        return url;
      }
      if (url.startsWith('/')) {
        return `${productionUrl}${url}`;
      }
      return productionUrl;
    },
  },

  events: {
    async signOut() {
      // Document cookie is set in the deleteSession function
      await deleteSession();
    }
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);