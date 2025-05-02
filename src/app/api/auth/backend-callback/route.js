import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const provider = searchParams.get('provider') || 'google';
  
  console.log('🔑 Received backend callback with token:', token ? 'Token present' : 'No token', 'Provider:', provider);
  
  if (!token) {
    console.error('❌ Missing token in backend callback');
    return NextResponse.redirect(`${process.env.CLIENT_URL}/login?error=missing-token`);
  }

  try {
    // Store token in temporary cookie for session handler
    const cookieData = {
      token,
      provider
    };
    
    // Redirect to client-side page that will handle token verification and session creation
    const response = NextResponse.redirect(`${process.env.CLIENT_URL}/auth/session-handler`);
    
    // Set cookie with minimal data needed for session handling
    response.cookies.set('backend_oauth_data', JSON.stringify(cookieData), {
      maxAge: 300, 
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    console.log('✅ Redirecting to session handler with oauth data in cookie');
    return response;
  } catch (error) {
    console.error('❌ Error processing backend callback:', error);
    return NextResponse.redirect(`${process.env.CLIENT_URL}/login?error=server-error`);
  }
}