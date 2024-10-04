import { authOptions } from 'lib/authOptions';
import NextAuth from 'next-auth';


const handler = NextAuth(authOptions)
export {handler as GET, handler as POST}


export const VENT= {
  SIGNUP: 'https://vermillionent.pythonanywhere.com/auth/signup/',
  USER_VERIFICATION: 'https://vermillionent.pythonanywhere.com/auth/get-username-with-email/',
  VERIFY: 'https://vermillionent.pythonanywhere.com/auth/get-user-status/',
  LOGIN: 'https://vermillionent.pythonanywhere.com/auth/login/',
  FORGOT_PASSWORD:' ',
  FORGOT_PASSWORD_TOKEN:' ',
  RESET_PASSWORD:' ',
  EDIT_PROFILE:'',
}