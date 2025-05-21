import { authOptions } from 'lib/authOptions';
import NextAuth from 'next-auth';


const handler = NextAuth(authOptions)
export {handler as GET, handler as POST}


const BASE_URL = 'https://vermillionent.pythonanywhere.com';

export const VENT = {
  WAITLIST: `${BASE_URL}/auth/add-email-to-waitlist/`,
  SIGNUP: `${BASE_URL}/auth/signup/`,
  USER_VERIFICATION: `${BASE_URL}/auth/get-username-with-email/`,
  VERIFY: `${BASE_URL}/auth/get-user-status/`,
  LOGIN: `${BASE_URL}/auth/login/`,
  FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password/send-token/`,
  FORGOT_PASSWORD_TOKEN: `${BASE_URL}/auth/forgot-password/verify-token/`,
  RESET_PASSWORD: `${BASE_URL}/auth/forgot-password/change-password/`,
  USER_PROFILE: `${BASE_URL}/auth/get-user-informations/`,
  EDIT_PROFILE: `${BASE_URL}/auth/edit-profile-info/`,
  EDIT_LINKS: `${BASE_URL}/auth/update-web-and-social-links/`,
  CREATE_EVENT: `${BASE_URL}/event/create-event/`,
  GET_EVENTS: `${BASE_URL}/event/get-all-events/`,
  GET_TOURNAMENTS: `${BASE_URL}/tournament/get-all-tournaments/`,
  CREATE_TOURNAMENT: `${BASE_URL}/tournament/create-tournament/`,
};

