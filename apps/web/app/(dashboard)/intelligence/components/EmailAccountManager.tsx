'use client';

import { useState } from 'react';
import { Mail, Trash2, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  isConnected: boolean;
}

interface EmailAccountManagerProps {
  accounts: EmailAccount[];
  onConnect: (provider: string) => void;
  onDisconnect: (accountId: string) => void;
  onSync: (accountId: string) => void;
}

export function EmailAccountManager({
  accounts,
  onConnect,
  onDisconnect,
  onSync,
}: EmailAccountManagerProps) {
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('GMAIL');

  const providers = ['GMAIL', 'OUTLOOK', 'YAHOO'];

  const handleConnect = () => {
    onConnect(selectedProvider);
    setShowConnectForm(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Connected Email Accounts
          </div>
          <Button
            size="sm"
            onClick={() => setShowConnectForm(!showConnectForm)}
            className="gap-1"
          >
            <Plus className="w-4 h-4" /> Connect Account
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connect Form */}
        {showConnectForm && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Email Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConnect} className="flex-1">
                Connect {selectedProvider}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConnectForm(false)}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              You'll be redirected to {selectedProvider} to authorize access
            </p>
          </div>
        )}

        {/* Connected Accounts */}
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-sm">{account.email}</span>
                  {account.isConnected ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{account.provider}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSync(account.id)}
                  className="text-xs"
                >
                  Sync
                </Button>
                <button
                  onClick={() => onDisconnect(account.id)}
                  className="p-2 hover:bg-red-500/20 rounded transition-colors"
                  title="Disconnect"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No email accounts connected</p>
            <p className="text-xs mt-1">Connect an account to enable email features</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
