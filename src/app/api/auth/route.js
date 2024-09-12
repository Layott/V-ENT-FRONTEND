import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, 
});


export const VENT= {
  SIGNUP: 'https://vermillionent.pythonanywhere.com/auth/signup/',
  USER_VERIFICATION: 'https://vermillionent.pythonanywhere.com/auth/get-username-with-email/',
  VERIFY: ' ',
  LOGIN: ' ',
  FORGOT_PASSWORD:' ',
  FORGOT_PASSWORD_TOKEN:' ',
  RESET_PASSWORD:' '
}