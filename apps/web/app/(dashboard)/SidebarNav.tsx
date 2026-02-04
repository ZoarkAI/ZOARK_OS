'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Users, GitBranch, Brain, Bot, Workflow, Building2, Settings, Key, LogOut } from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Dashboard',
    items: [
      { href: '/pulse', icon: Activity, label: 'The Pulse' },
      { href: '/directory', icon: Users, label: 'Proactive Directory' },
      { href: '/flow', icon: GitBranch, label: 'Flow Engine' },
      { href: '/intelligence', icon: Brain, label: 'Intelligence Hub' },
    ],
  },
  {
    title: 'Automation',
    items: [
      { href: '/agents', icon: Bot, label: 'Agent Builder' },
      { href: '/workflows', icon: Workflow, label: 'Workflows' },
      { href: '/departments', icon: Building2, label: 'Departments' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/settings', icon: Settings, label: 'Settings' },
      { href: '/settings/api-keys', icon: Key, label: 'API Keys' },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  return (
    <nav className="space-y-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'glass-card-hover text-gray-300 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Logout Button */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-300 hover:text-white hover:bg-white/5 w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
