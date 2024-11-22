import { authOptions } from 'lib/authOptions';
import NextAuth from 'next-auth';


const handler = NextAuth(authOptions)
export {handler as GET, handler as POST}


export const VENT= {
  WAITLIST: 'https://vermillionent.pythonanywhere.com/auth/add-email-to-waitlist/',
  SIGNUP: 'https://vermillionent.pythonanywhere.com/auth/signup/',
  USER_VERIFICATION: 'https://vermillionent.pythonanywhere.com/auth/get-username-with-email/',
  VERIFY: 'https://vermillionent.pythonanywhere.com/auth/get-user-status/',
  LOGIN: 'https://vermillionent.pythonanywhere.com/auth/login/',
  FORGOT_PASSWORD:'https://vermillionent.pythonanywhere.com/auth/forgot-password/send-token/',
  FORGOT_PASSWORD_TOKEN:'https://vermillionent.pythonanywhere.com/auth/forgot-password/verify-token/',
  RESET_PASSWORD:'',
  USER_PROFILE:'https://vermillionent.pythonanywhere.com/auth/get-user-informations/',
  EDIT_PROFILE:'https://vermillionent.pythonanywhere.com/auth/edit-profile-info/',
  CREATE_EVENT:'https://vermillionent.pythonanywhere.com/event/create-event/',
  GET_EVENTS:'https://vermillionent.pythonanywhere.com/event/get-all-events/',
} 

