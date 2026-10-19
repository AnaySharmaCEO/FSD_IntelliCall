import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  PhoneCall,
  Bot,
  Megaphone,
  Users,
  ShieldCheck,
  BarChart3,
  Palette,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../auth';
import { cn } from '../lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { to: '/calls', label: 'Calls', icon: <PhoneCall size={17} /> },
  { to: '/agents', label: 'AI Agents', icon: <Bot size={17} /> },
  { to: '/campaigns', label: 'Campaigns', icon: <Megaphone size={17} /> },
  { to: '/leads', label: 'Leads', icon: <Users size={17} /> },
  { to: '/compliance', label: 'Compliance', icon: <ShieldCheck size={17} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={17} /> },
  { to: '/__kit', label: 'Component Kit', icon: <Palette size={17} /> },
];

export const Sidebar: React.FC = () => {
  const { organization } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('ic-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ic-theme', next);
    setTheme(next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)] transition-all duration-200 select-none shrink-0 z-20',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-border-subtle)] shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-brand-blue)] text-white flex items-center justify-center font-bold text-sm shrink-0">
            IC
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[14px] tracking-tight text-[var(--color-text-primary)] truncate">
                IntelliCall
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] truncate">
                {organization?.name || 'Enterprise'}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-action-secondary-bg)] text-[var(--color-action-primary)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)]',
                collapsed ? 'justify-center px-0' : ''
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-muted)]">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Tools */}
      <div className="p-3 border-t border-[var(--color-border-subtle)] space-y-2 shrink-0">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-3 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)] transition-colors',
            collapsed ? 'justify-center px-0' : ''
          )}
          title="View Public Landing Page"
        >
          <ExternalLink size={15} className="shrink-0" />
          {!collapsed && <span>Public Landing</span>}
        </Link>

        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer',
            collapsed ? 'justify-center px-0' : ''
          )}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon size={15} className="shrink-0" /> : <Sun size={15} className="shrink-0 text-amber-400" />}
          {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
