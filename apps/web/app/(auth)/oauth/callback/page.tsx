'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const provider = searchParams.get('provider');
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error}`);
        return;
      }

      if (!provider || !code || !state) {
        setStatus('error');
        setMessage('Missing authentication parameters');
        return;
      }

      try {
        const token = localStorage.getItem('access_token');

        if (!token) {
          setStatus('error');
          setMessage('Please login first to connect OAuth accounts');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/oauth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ provider, code, state }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'OAuth callback failed');
        }

        setStatus('success');
        setMessage(`Successfully connected ${provider} account!`);

        setTimeout(() => router.push('/settings/oauth'), 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to complete authentication');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <Card className="bg-white/10 backdrop-blur-xl border-white/20">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-white text-lg">{message}</p>
              <p className="text-gray-400 mt-2">Redirecting...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white text-lg">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="mt-4 text-purple-400 hover:text-purple-300"
              >
                Return to login
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <Card className="bg-white/10 backdrop-blur-xl border-white/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Processing authentication...</p>
          </div>
        </CardContent>
      </Card>
    }>
      <OAuthCallbackInner />
    </Suspense>
  );
}
