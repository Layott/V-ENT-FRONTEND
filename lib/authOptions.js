import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"; // For form-based login
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';

// Helper function to handle backend authentication
async function handleBackendAuth(userData) {
  try {
    const endpoint = userData.provider 
      ? "https://vermillionent.pythonanywhere.com/auth/social-auth/"
      : "https://vermillionent.pythonanywhere.com/auth/login/";
      
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

    console.log(`📤 Sending to backend ${endpoint}:`, payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();
    console.log(`📤 Backend response data:`, data);
    
    // Always set the redirect URL to the profile page
    data.redirectUrl = "/user-profile";
    
    return data;
  } catch (error) {
    console.error('Error during backend authentication:', error);
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
      async authorize(credentials) {
        try {
          // Use the shared authentication handler
          const data = await handleBackendAuth({
            email: credentials.email,
            password: credentials.password
          });

          // Check for successful authentication
          if (data.session_token || (data.data && data.data.session_token)) {
            // Normalize the response structure
            const sessionToken = data.session_token || (data.data && data.data.session_token);
            const userId = data.user_id || (data.data && data.data.user_id);
            
            const user = {
              session_token: sessionToken,
              email: credentials.email,
              id: userId,
              // Force redirect to profile
              redirectUrl: "/user-profile"
            };
            
            return user;
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
      authorization: {
        params: {
          prompt: "select_account consent",
          access_type: "online",
          response_type: "code",
          scope: "openid email profile"
        },
      },
    }),
    
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent", // Forces account selection
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        },
      },
    })
  ],

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: "jwt", // Required for getToken() in middleware
  },

  callbacks: {
    // Consistently structure the session object
    async session({ session, token }) {
      console.log("Session callback - token:", token);
      
      if (token.session_token) {
        session.user = {
          ...session.user,
          id: token.user_id || token.sub,
          sessionToken: token.session_token,
        };
        
        // Pass the redirect URL to the session if available
        if (token.redirectUrl) {
          session.redirectUrl = token.redirectUrl;
        }
      }
      console.log("Session callback - modified session:", session);
      return session;
    },
    
    // Consistently structure the JWT token
    async jwt({ token, user, account }) {
      console.log("JWT callback - user:", user);
      console.log("JWT callback - token before:", token);
      
      // If this is coming from a sign-in (either credentials or OAuth)
      if (user?.session_token) {
        token.session_token = user.session_token;
        token.user_id = user.id;
        
        // Always set redirect to profile page
        token.redirectUrl = "/user-profile";
      }
      
      console.log("JWT callback - token after:", token);
      return token;
    },
  
    // Integrated sign-in callback for both authentication methods
    async signIn({ user, account, profile }) {
      // Form-based login was already handled in authorize
      if (account.provider === 'credentials') {
        return true;
      }
      
      // Handle social logins (Google, Facebook)
      if (account.provider === 'google' || account.provider === 'facebook') {
        try {
          if (!profile.email || !account.provider || !account.providerAccountId) {
            console.error("❌ Missing required fields:", { 
              email: profile.email, 
              provider: account.provider, 
              providerId: account.providerAccountId 
            });
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
            console.error("❌ Social auth failed:", data);
            return `/login?error=auth-failed&message=${encodeURIComponent(data.message || "Authentication failed")}`;
          }
          
          console.log("✅ Social auth successful:", data);
          
          // Store session token and user ID in the same format as credentials provider
          user.session_token = data.data.session_token;
          user.id = data.data.user_id || data.data.username; // Use username as fallback
          
          // Always redirect to profile page
          user.redirectUrl = "/user-profile";
          
          return true;
        } catch (error) {
          console.error('Error during OAuth backend login:', error);
          return `/login?error=auth-failed&message=${encodeURIComponent("Server error occurred")}`;
        }
      }
      
      return false;
    },
    
    // Simplified redirect callback that always prioritizes the profile page
    async redirect({ url, baseUrl }) {
      console.log("Redirect callback - url:", url);
      console.log("Redirect callback - baseUrl:", baseUrl);

      const clientUrl = process.env.CLIENT_URL;
      
      // Always redirect to user profile after successful authentication
      if (url.includes('callback') || url.includes('signin') || url.includes('api/auth')) {
        const profileUrl = clientUrl.startsWith('http') 
          ? `${clientUrl}/user-profile` 
          : `https://${clientUrl}/user-profile`;
          
        console.log("Redirecting to profile:", profileUrl);
        return profileUrl;
      }
      
      // For error cases and other URLs, maintain standard behavior
      if (url.startsWith('/')) {
        return `${clientUrl}${url}`;
      }
      
      if (url.startsWith('http')) {
        const urlHostname = new URL(url).hostname;
        const baseHostname = new URL(clientUrl).hostname;
        
        if (urlHostname === baseHostname) {
          return url;
        }
      }
      
      // Default to clientUrl
      return clientUrl;
    },
  },

  events: {
    async signOut({ token }) {
      console.log("User signed out");
      
      // Call backend to invalidate the session
      try {
        await fetch("https://vermillionent.pythonanywhere.com/auth/logout/", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token.session_token}` 
          }
        });
      } catch (error) {
        console.error("Error during backend logout:", error);
      }
    }
  },
  
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);