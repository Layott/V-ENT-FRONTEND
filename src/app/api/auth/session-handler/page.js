'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SessionHandler() {
  const router = useRouter();
  const { data: session } = useSession();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function processBackendOAuth() {
      try {
        // If already has session, redirect to profile
        if (session) {
          router.push('/home');
          return;
        }

        setStatus('Retrieving OAuth data...');
        
        // Get the auth data from cookies via the API route
        const response = await fetch('/api/auth/get-oauth-data');
        
        if (!response.ok) {
          throw new Error('Failed to retrieve OAuth data');
        }
        
        const oauthData = await response.json();
        
        if (!oauthData || !oauthData.token) {
          throw new Error('Invalid OAuth data');
        }
        
        setStatus('Verifying token with backend...');
        
        // Verify the token with your backend
        const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-oauth-token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: oauthData.token, 
            provider: oauthData.provider 
          }),
        });

        if (!verifyResponse.ok) {
          throw new Error('Token verification failed');
        }
        
        const authData = await verifyResponse.json();
        
        if (!authData.session_token) {
          throw new Error('Invalid authentication data');
        }
        
        setStatus('Creating session...');
        
        // Create a NextAuth session with the backend-provided token
        const result = await signIn('credentials', {
          redirect: false,
          session_token: authData.session_token,
          email: authData.email || '',
          name: authData.name || '',
          user_id: authData.user_id,
          backend_oauth: true
        });
        
        if (result?.error) {
          throw new Error(result.error);
        }
        
        setStatus('Authentication successful!');
        
        // Short delay before redirect
        setTimeout(() => {
          router.push('/home');
        }, 1000);
      } catch (error) {
        console.error('Session creation error:', error);
        setStatus('Authentication failed');
        setError(error.message);
        
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(error.message)}`);
        }, 3000);
      }
    }
    
    processBackendOAuth();
  }, [router, session]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="p-8 bg-white rounded shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Authentication</h1>
        <div className="text-center">
          <p className="mb-2">{status}</p>
          {error && (
            <p className="text-red-500 mb-4">{error}</p>
          )}
          {error && (
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Return to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}