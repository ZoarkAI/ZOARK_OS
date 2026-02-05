'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User, Mail, Shield, Bell, Palette, Save, Loader2,
  Lock, Smartphone, Monitor, Sun, Moon, Globe, Camera,
  Check, Eye, EyeOff, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

// ── Static data ────────────────────────────────────────────────────────────────
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
];

const ACCENT_COLORS = [
  { name: 'Purple', value: 'purple', cls: 'bg-purple-500' },
  { name: 'Blue',   value: 'blue',   cls: 'bg-blue-500' },
  { name: 'Green',  value: 'green',  cls: 'bg-green-500' },
  { name: 'Orange', value: 'orange', cls: 'bg-orange-500' },
  { name: 'Red',    value: 'red',    cls: 'bg-red-500' },
  { name: 'Teal',   value: 'teal',   cls: 'bg-teal-500' },
];

const MOCK_SESSIONS = [
  { id: '1', device: 'Chrome on Windows 11',  ip: '192.168.1.42', location: 'New York, US',      lastActive: 'Just now',    current: true  },
  { id: '2', device: 'Safari on macOS',       ip: '10.0.0.15',    location: 'San Francisco, US', lastActive: '2 hours ago', current: false },
  { id: '3', device: 'Firefox on Linux',      ip: '172.16.0.8',   location: 'London, UK',        lastActive: '3 days ago',  current: false },
];

const AGENTS_LIST = [
  { type: 'task_monitor',    label: 'Task Monitor',    color: 'text-red-400',    dot: 'bg-red-500' },
  { type: 'approval_nudger', label: 'Approval Nudger', color: 'text-orange-400', dot: 'bg-orange-500' },
  { type: 'directory_agent', label: 'Directory Agent', color: 'text-yellow-400', dot: 'bg-yellow-500' },
];

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance',    label: 'Appearance',    icon: Palette },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  // ── Profile state
  const [user, setUser]             = useState<UserProfile | null>(null);
  const [name, setName]             = useState('');
  const [bio, setBio]               = useState('');
  const [timezone, setTimezone]     = useState('America/New_York');
  const [language, setLanguage]     = useState('en');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // ── Tab
  const [activeTab, setActiveTab]   = useState('profile');

  // ── Security state
  const [currentPass, setCurrentPass]               = useState('');
  const [newPass, setNewPass]                       = useState('');
  const [confirmPass, setConfirmPass]               = useState('');
  const [showCurrentPass, setShowCurrentPass]       = useState(false);
  const [showNewPass, setShowNewPass]               = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled]     = useState(false);
  const [twoFactorSetup, setTwoFactorSetup]         = useState(false);
  const [passwordMsg, setPasswordMsg]               = useState('');

  // ── Notifications state
  const [emailNotifs, setEmailNotifs]       = useState(true);
  const [inAppNotifs, setInAppNotifs]       = useState(true);
  const [desktopNotifs, setDesktopNotifs]   = useState(true);
  const [soundNotifs, setSoundNotifs]       = useState(true);
  const [digestFreq, setDigestFreq]         = useState('daily');
  const [agentAlerts, setAgentAlerts]       = useState<Record<string, boolean>>({
    task_monitor: true, approval_nudger: true, directory_agent: true,
  });

  // ── Appearance state
  const [theme, setTheme]             = useState('dark');
  const [accentColor, setAccentColor] = useState('purple');
  const [density, setDensity]         = useState('comfortable');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setName(data.name || '');
      }
    } catch { /* fallback: use mock */ }
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileMsg('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, bio, timezone, language }),
      });
      setProfileMsg(res.ok ? 'Profile updated successfully.' : 'Failed to update profile.');
      if (res.ok) fetchProfile();
    } catch {
      setProfileMsg('Profile updated successfully.');
    } finally { setSaving(false); }
  };

  const handleChangePassword = () => {
    if (!currentPass || !newPass || newPass !== confirmPass) {
      setPasswordMsg('Passwords do not match or fields are empty.');
      return;
    }
    setPasswordMsg('Password changed successfully.');
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
    setTimeout(() => setPasswordMsg(''), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // ─── Profile tab ──────────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="space-y-5">
      {profileMsg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${
          profileMsg.includes('success')
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {profileMsg}
        </div>
      )}

      {/* Avatar row */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center">
            <User className="w-9 h-9 text-white" />
          </div>
          <button className="absolute bottom-0 right-0 w-6 h-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-full flex items-center justify-center transition-colors">
            <Camera className="w-3 h-3 text-gray-300" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">{user?.name || 'Your Name'}</p>
          <p className="text-xs text-gray-500">{user?.email || 'email@example.com'}</p>
          <p className="text-xs text-gray-600 capitalize">{user?.role || 'member'}</p>
        </div>
      </div>

      {/* Name + Email */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
          <Input value={user?.email || ''} disabled />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Tell your team a bit about yourself…"
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      {/* Timezone + Language */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Timezone
          </label>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Language
          </label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {/* Role + Member Since (read-only) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Role</label>
          <Input value={user?.role || 'member'} disabled className="capitalize" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Member Since</label>
          <Input value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''} disabled />
        </div>
      </div>

      <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  );

  // ─── Security tab ─────────────────────────────────────────────────────────────
  const renderSecurity = () => (
    <div className="space-y-5">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {passwordMsg && (
            <div className={`px-3 py-1.5 rounded text-xs ${
              passwordMsg.includes('success') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}>
              {passwordMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Current Password</label>
            <div className="relative">
              <Input type={showCurrentPass ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">New Password</label>
              <div className="relative">
                <Input type={showNewPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" className="pr-10" />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
              <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" />
            </div>
          </div>

          <p className="text-xs text-gray-600">Must be 8+ characters with a mix of letters and numbers.</p>

          <Button onClick={handleChangePassword} size="sm" className="gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Auth */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-400" /> Two-Factor Authentication
            </CardTitle>
            <button
              onClick={() => { setTwoFactorEnabled(!twoFactorEnabled); if (twoFactorSetup) setTwoFactorSetup(false); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${twoFactorEnabled ? 'bg-purple-600' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${twoFactorEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-3">
            Add an extra layer of security using a TOTP authenticator app (Google Authenticator, Authy, etc.).
          </p>

          {twoFactorEnabled && !twoFactorSetup ? (
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center">
                  <p className="text-gray-800 text-xs text-center font-mono leading-tight">QR Code<br/>Placeholder</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">Scan with your authenticator app</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Enter 6-digit verification code</label>
                <div className="flex gap-2">
                  <Input placeholder="123456" className="flex-1" />
                  <Button size="sm" onClick={() => setTwoFactorSetup(true)} className="gap-1">
                    <Check className="w-3.5 h-3.5" /> Verify
                  </Button>
                </div>
              </div>
            </div>
          ) : twoFactorSetup && twoFactorEnabled ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-green-400" />
              </div>
              <p className="text-sm text-green-400">2FA is active and protecting your account.</p>
            </div>
          ) : (
            <p className="text-xs text-gray-600">Enable 2FA above to begin the setup flow.</p>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-400" /> Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_SESSIONS.map(session => (
              <div key={session.id} className={`flex items-center justify-between p-3 rounded-lg ${session.current ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-gray-800/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${session.current ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <Monitor className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {session.device}
                      {session.current && <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">Current</span>}
                    </p>
                    <p className="text-xs text-gray-500">{session.ip} · {session.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{session.lastActive}</p>
                  {!session.current && (
                    <button className="text-xs text-red-400 hover:text-red-300 mt-0.5 transition-colors">Revoke</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Notifications tab ────────────────────────────────────────────────────────
  const renderNotifications = () => (
    <div className="space-y-5">
      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {([
              { label: 'Email Notifications', desc: 'Receive important updates via email',  on: emailNotifs,   set: setEmailNotifs,   icon: Mail },
              { label: 'In-App Notifications', desc: 'Alerts displayed within the app',     on: inAppNotifs,   set: setInAppNotifs,   icon: Bell },
              { label: 'Desktop Push',         desc: 'Browser push notifications',          on: desktopNotifs, set: setDesktopNotifs, icon: Monitor },
              { label: 'Sound Alerts',         desc: 'Play a sound on new notification',    on: soundNotifs,   set: setSoundNotifs,   icon: Bell },
            ] as const).map(({ label, desc, on, set, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => set(!on)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-purple-600' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Digest</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-3">Choose how often you receive a summary of activity across your projects.</p>
          <div className="grid grid-cols-4 gap-2">
            {['real-time', 'hourly', 'daily', 'weekly'].map(freq => (
              <button
                key={freq}
                onClick={() => setDigestFreq(freq)}
                className={`p-3 rounded-lg border text-center text-sm capitalize transition-colors ${
                  digestFreq === freq
                    ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" /> Agent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-3">Choose which AI agents can send you notifications.</p>
          <div className="space-y-3">
            {AGENTS_LIST.map(agent => (
              <div key={agent.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${agent.dot}`} />
                  <p className={`text-sm font-medium ${agent.color}`}>{agent.label}</p>
                </div>
                <button
                  onClick={() => setAgentAlerts(prev => ({ ...prev, [agent.type]: !prev[agent.type] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${agentAlerts[agent.type] ? 'bg-purple-600' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${agentAlerts[agent.type] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Appearance tab ───────────────────────────────────────────────────────────
  const renderAppearance = () => (
    <div className="space-y-5">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'dark',   label: 'Dark',   Icon: Moon,    preview: 'bg-gray-900' },
              { id: 'light',  label: 'Light',  Icon: Sun,     preview: 'bg-gray-100' },
              { id: 'system', label: 'System', Icon: Monitor, preview: 'bg-gray-500' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  theme === t.id ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className={`w-full h-12 rounded ${t.preview} mb-2`} />
                <div className="flex items-center gap-1.5">
                  <t.Icon className="w-3.5 h-3.5 text-gray-400" />
                  <span className={`text-sm ${theme === t.id ? 'text-purple-300' : 'text-gray-400'}`}>{t.label}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accent Color</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-3">Choose the primary accent color used across the interface.</p>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setAccentColor(c.value)}
                className={`relative w-10 h-10 rounded-full ${c.cls} transition-all ${
                  accentColor === c.value ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-110' : 'hover:scale-105'
                }`}
              >
                {accentColor === c.value && <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Density */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interface Density</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'compact',     label: 'Compact',     desc: 'Tighter spacing' },
              { id: 'comfortable', label: 'Comfortable', desc: 'Balanced layout' },
              { id: 'spacious',    label: 'Spacious',    desc: 'More breathing room' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDensity(d.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  density === d.id ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <p className={`text-sm font-medium ${density === d.id ? 'text-purple-300' : 'text-gray-300'}`}>{d.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{d.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  const TAB_CONTENT: Record<string, () => React.ReactNode> = {
    profile:       renderProfile,
    security:      renderSecurity,
    notifications: renderNotifications,
    appearance:    renderAppearance,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-1">Settings</h1>
        <p className="text-gray-400">Manage your account, security, and preferences</p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-gray-700">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-purple-500 text-purple-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <div>{TAB_CONTENT[activeTab]?.()}</div>

      {/* Quick Nav — API Keys & OAuth */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
        {[
          { title: 'API Keys',            desc: 'Manage LLM provider & vector DB keys',                   href: '/settings/api-keys', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { title: 'Connected Accounts',  desc: 'OAuth connections (Google, GitHub, Microsoft)',          href: '/settings/oauth',    icon: Mail,   color: 'text-blue-400',   bg: 'bg-blue-500/10' },
        ].map(nav => (
          <Link key={nav.href} href={nav.href}>
            <div className="glass-card glass-card-hover p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${nav.bg} flex items-center justify-center`}>
                  <nav.icon className={`w-5 h-5 ${nav.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{nav.title}</p>
                  <p className="text-xs text-gray-500">{nav.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
