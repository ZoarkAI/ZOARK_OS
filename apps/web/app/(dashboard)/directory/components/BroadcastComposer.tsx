'use client';

import { useState } from 'react';
import { Send, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BroadcastComposerProps {
  onSend: (broadcast: any) => void;
}

export function BroadcastComposer({ onSend }: BroadcastComposerProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [sending, setSending] = useState(false);

  const handleAddRecipient = () => {
    if (recipientInput.trim() && !recipients.includes(recipientInput.trim())) {
      setRecipients([...recipients, recipientInput.trim()]);
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) {
      alert('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      await onSend({
        subject,
        body,
        recipients,
        scheduledFor: scheduledFor || null,
      });
      setSubject('');
      setBody('');
      setRecipients([]);
      setScheduledFor('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-400" />
          Broadcast Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Subject</label>
          <Input
            placeholder="Email subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Message</label>
          <textarea
            placeholder="Email body..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 min-h-[150px]"
          />
        </div>

        {/* Recipients */}
        <div>
          <label className="text-sm text-gray-400 block mb-2 flex items-center gap-1">
            <Users className="w-4 h-4" /> Recipients
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="recipient@example.com"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
              className="bg-white/5 border-white/10"
            />
            <Button onClick={handleAddRecipient} variant="outline" size="sm">
              Add
            </Button>
          </div>
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipients.map((email) => (
                <div
                  key={email}
                  className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {email}
                  <button
                    onClick={() => handleRemoveRecipient(email)}
                    className="hover:text-purple-300 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div>
          <label className="text-sm text-gray-400 block mb-2 flex items-center gap-1">
            <Calendar className="w-4 h-4" /> Schedule (Optional)
          </label>
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="bg-white/5 border-white/10"
          />
          {scheduledFor && (
            <p className="text-xs text-gray-500 mt-1">
              Will send at {new Date(scheduledFor).toLocaleString()}
            </p>
          )}
        </div>

        {/* Send Button */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim() || recipients.length === 0}
            className="flex-1"
          >
            {sending ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
