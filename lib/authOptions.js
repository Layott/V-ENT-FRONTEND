import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"; // For form-based login
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';

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
          // Send the email and password to your backend for form-based authentication
          const res = await fetch("https://vermillionent.pythonanywhere.com/auth/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username_or_email: credentials.email,
              password: credentials.password
            })
          });

          const data = await res.json();

          if (res.ok && data.session_token) {
            // Return user object with session token and user ID from the backend
            return {
              session_token: data.session_token,
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
          scope: 'email',
        },
      },
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'credentials') {
        // For form-based login, the user object already contains session_token and user_id
        return true; // Allow sign-in
      }

      // OAuth login: Send OAuth response to the backend
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        const oauthResponse = {
          provider: account.provider,
          providerId: account.providerAccountId,
          profile_pic: profile.picture || profile.image || profile.picture_url,
          name: profile.name || profile.full_name,
          email: profile.email,
        };
        

        try {
          const backendResponse = await fetch("https://vermillionent.pythonanywhere.com/auth/social-auth/", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(oauthResponse),
          });

          const data = await backendResponse.json();

          if (backendResponse.ok) {
            // Attach session token and user ID from backend response
            user.session_token = data.session_token;
            user.id = data.user_id;
            return true; // Allow sign-in
            console.log("OAuth signIn data:", { user, account, profile });
          } else {
            console.error('OAuth backend login failed:', data.message);
            return false; // Deny sign-in
          }
        } catch (error) {
          console.error('Error during OAuth backend login:', error);
          return false; // Deny sign-in
        }
      }
    },

    async session({ session, token }) {
      // Attach form-based or OAuth-based session data to the session object
      if (token.session_token) {
        session.user = {
          id: token.user_id,
          sessionToken: token.session_token
        };
      } else {
        session.user = {
          name: token.name,
          email: token.email,
          image: token.picture
        };
      }
      return session;
    },

    async jwt({ token, user }) {
      // For form-based login, user will have session_token and user_id
      if (user?.session_token) {
        token.session_token = user.session_token;
        token.user_id = user.id;
      }

      return token;
    }
  },

  // Additional configuration options
};

export default NextAuth(authOptions);