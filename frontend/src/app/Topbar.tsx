import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { useToast } from '../components/ui';
import { Search, Bell, LogOut, User, Shield } from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user, organization, role, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dropdownOpen]);

  return (
    <header className="h-14 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)] px-6 flex items-center justify-between shrink-0 z-10">
      {/* Search Bar / Cmd+K Trigger */}
      <div className="flex items-center gap-3 w-72">
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              bubbles: true,
            });
            document.dispatchEvent(event);
          }}
          className="flex items-center justify-between w-full h-8 px-3 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]/50 text-[12px] text-[var(--color-text-muted)] hover:border-[var(--color-border-focus)] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search size={14} />
            <span>Search or jump to...</span>
          </span>
          <kbd className="font-mono text-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Tools & User Profile */}
      <div className="flex items-center gap-4">
        {/* Org & Role Badge */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="font-medium text-[var(--color-text-secondary)]">
            {organization?.name || 'IntelliCall Cloud'}
          </span>
          {role && (
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold font-mono bg-[var(--color-action-secondary-bg)] text-[var(--color-action-secondary-text)]">
              {role}
            </span>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)] rounded-[var(--radius-sm)] transition-colors cursor-pointer relative"
          title="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-action-primary)]" />
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[var(--color-border-default)] transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-blue)] text-white text-xs font-semibold flex items-center justify-center">
              {user?.avatarInitials || (user?.name || 'U').slice(0, 2).toUpperCase()}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-[var(--radius-md)] bg-white dark:bg-[#232327] border border-[var(--color-border-default)] shadow-xl py-2 z-50 animate-slide-up">
              <div className="px-4 py-2.5 border-b border-[var(--color-border-subtle)]">
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                  {user?.name || 'Authorized Member'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">
                  {user?.email || 'member@intellicall.ai'}
                </p>
              </div>

              <div className="py-1">
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--color-text-secondary)]">
                  <Shield size={14} className="text-[var(--color-text-muted)]" />
                  <span>Role: <strong className="capitalize text-[var(--color-text-primary)]">{role || 'Member'}</strong></span>
                </div>
              </div>

              <div className="border-t border-[var(--color-border-subtle)] pt-1 mt-1">
                <button
                  onClick={async () => {
                    setDropdownOpen(false);
                    await signOut();
                    localStorage.removeItem('intellicall_auth_token');
                    localStorage.removeItem('sb-wdmensuuqsbnxzecqlwz-auth-token');
                    queryClient.clear();
                    navigate('/', { replace: true });
                    toast('Signed out successfully', 'info');
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign out of Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
