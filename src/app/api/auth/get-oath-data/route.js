import { NextResponse } from 'next/server';

export async function GET(request) {
  const cookieStore = request.cookies;
  const oauthData = cookieStore.get('backend_oauth_data');
  
  if (!oauthData?.value) {
    return NextResponse.json({ error: 'No OAuth data found' }, { status: 400 });
  }
  
  try {
    // Parse the JSON data from the cookie
    const data = JSON.parse(oauthData.value);
    
    // Create a response with the data
    const response = NextResponse.json(data);
    
    // Clear the cookie since we've used it
    response.cookies.set('backend_oauth_data', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true
    });
    
    return response;
  } catch (error) {
    console.error('Error processing OAuth data:', error);
    return NextResponse.json({ error: 'Invalid OAuth data' }, { status: 400 });
  }
}