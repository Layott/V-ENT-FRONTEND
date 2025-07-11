import { authOptions } from 'lib/authOptions';
import NextAuth from 'next-auth';


const handler = NextAuth(authOptions)
export {handler as GET, handler as POST}


const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}`;

export const VENTT = {
    EMAIL_VERIFICATION: `${BASE_URL}/auth/verify`, 
  };
  