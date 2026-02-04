'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, Link2, Unlink } from 'lucide-react';

interface OAuthAccount {
  id: string;
  provider: string;
  email: string;
  isConnected: boolean;
  createdAt: string;
}

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    description: 'Connect your Google account for Gmail integration',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
    color: 'bg-white border-gray-200',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your GitHub account for repository access',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    color: 'bg-gray-900 text-white',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    description: 'Connect your Microsoft account for Outlook integration',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path fill="#f25022" d="M1 1h10v10H1z" />
        <path fill="#00a4ef" d="M1 13h10v10H1z" />
        <path fill="#7fba00" d="M13 1h10v10H13z" />
        <path fill="#ffb900" d="M13 13h10v10H13z" />
      </svg>
    ),
    color: 'bg-white border-gray-200',
  },
];

export default function OAuthSettingsPage() {
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/oauth/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching OAuth accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/oauth/connect/${provider}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to OAuth provider
        window.location.href = data.oauth_url;
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to start OAuth flow');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      alert('Failed to connect. Please try again.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/oauth/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const getAccountForProvider = (providerId: string) => {
    return accounts.find(a => a.provider === providerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connected Accounts</h1>
        <p className="text-gray-500 mt-2">Connect external accounts for enhanced functionality</p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const account = getAccountForProvider(provider.id);
          const isConnected = account?.isConnected;
          
          return (
            <Card key={provider.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${provider.color} border`}>
                      {provider.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      <p className="text-sm text-gray-500">{provider.description}</p>
                      {isConnected && account && (
                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Connected as {account.email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    {isConnected ? (
                      <Button
                        variant="outline"
                        onClick={() => handleDisconnect(account!.id)}
                        className="gap-2 text-red-500 hover:text-red-700"
                      >
                        <Unlink className="w-4 h-4" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleConnect(provider.id)}
                        disabled={connecting === provider.id}
                        className="gap-2"
                      >
                        {connecting === provider.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                        {connecting === provider.id ? 'Connecting...' : 'Connect'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-800 mb-2">Why connect accounts?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Google:</strong> Send emails via Gmail, access Google Calendar, and sync contacts</li>
            <li>• <strong>GitHub:</strong> Access repository data for development workflows</li>
            <li>• <strong>Microsoft:</strong> Send emails via Outlook and access Microsoft 365 data</li>
          </ul>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Setup Required</h3>
          <p className="text-sm text-yellow-700 mb-2">
            OAuth connections require configuration in your environment:
          </p>
          <ul className="text-sm text-yellow-700 space-y-1 font-mono">
            <li>GOOGLE_CLIENT_ID=your_google_client_id</li>
            <li>GOOGLE_CLIENT_SECRET=your_google_client_secret</li>
            <li>GITHUB_CLIENT_ID=your_github_client_id</li>
            <li>GITHUB_CLIENT_SECRET=your_github_client_secret</li>
            <li>MICROSOFT_CLIENT_ID=your_microsoft_client_id</li>
            <li>MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
