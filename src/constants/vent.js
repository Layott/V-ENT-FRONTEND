import { authOptions } from 'lib/authOptions';
import NextAuth from 'next-auth';


const handler = NextAuth(authOptions)
export {handler as GET, handler as POST}


const BASE_URL = 'https://vermillionent.pythonanywhere.com';

export const VENTT = {
    EMAIL_VERIFICATION: `${BASE_URL}/auth/verify`, 
  };
  