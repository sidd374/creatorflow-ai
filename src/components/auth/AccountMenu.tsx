import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Settings, LogOut, Crown, ChevronDown, BarChart3, ShieldCheck, Compass } from 'lucide-react';
import { CreatorFlowUser, isAuthorizedOwner } from '../../lib/auth';
import { getStoredPlan, PLAN_DEFINITIONS } from '../../lib/planEntitlements';

interface AccountMenuProps {
  user: CreatorFlowUser | null;
  onNavigate: (view: string) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onStartTour?: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  user,
  onNavigate,
  onOpenAuth,
  onSignOut,
  onStartTour,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentPlan = getStoredPlan();
  const planMeta = PLAN_DEFINITIONS[currentPlan] || PLAN_DEFINITIONS.free;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-black/[0.12] hover:border-black/[0.24] bg-white hover:bg-neutral-50 text-neutral-800 font-sans text-xs font-medium transition-all cursor-pointer shadow-2xs"
      >
        <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
        <span>Sign In</span>
      </button>
    );
  }

  const isOwner = isAuthorizedOwner(user);

  return (
    <div ref={menuRef} className="relative select-none font-sans">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-black/[0.04] border border-transparent hover:border-black/[0.08] transition-all cursor-pointer"
        aria-label="Account menu"
      >
        <img
          src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.displayName)}`}
          alt={user.displayName}
          className="w-7 h-7 rounded-full object-cover border border-black/[0.12]"
        />
        <span className="text-xs font-medium text-neutral-800 hidden sm:inline-block max-w-[110px] truncate">
          {user.displayName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-black/[0.12] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User Profile Header */}
          <div className="px-4 py-2.5 border-b border-black/[0.06] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-[#1a1a1a] truncate">
                {user.displayName}
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-[#eeeae3] text-[#1a1a1a] rounded font-semibold border border-[#ded8cd]">
                {planMeta.badge}
              </span>
            </div>
            <div className="text-[11px] text-neutral-500 truncate font-mono">
              {user.email}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono capitalize">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Signed in via {user.provider}</span>
            </div>
          </div>

          {/* Current Plan Row */}
          <div className="px-4 py-2 border-b border-black/[0.06] flex items-center justify-between bg-[#f8f7f4]">
            <div className="flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-[#d4a017]" />
              <span className="text-xs font-serif font-medium text-[#1a1a1a]">
                CreatorFlow {planMeta.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('pricing');
              }}
              className="text-[10px] font-mono uppercase font-semibold text-[#d4a017] hover:underline cursor-pointer"
            >
              Manage
            </button>
          </div>

          {/* Navigation Links */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('settings');
              }}
              className="w-full px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-400" />
              <span>Studio Settings</span>
            </button>

            {onStartTour && (
              <button
                type="button"
                data-tour="help-tour-button"
                onClick={() => {
                  setIsOpen(false);
                  onStartTour();
                }}
                className="w-full px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
              >
                <Compass className="w-3.5 h-3.5 text-[#d4a017]" />
                <span>Take Guided Tour</span>
              </button>
            )}

            {/* Owner Analytics Access — strictly visible only to authorized owner/admin accounts */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('admin');
                }}
                className="w-full px-4 py-2 text-xs text-amber-900 bg-amber-50/70 hover:bg-amber-100/70 flex items-center justify-between transition-colors cursor-pointer text-left font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Owner Analytics</span>
                </div>
                <span className="text-[9px] font-mono uppercase bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                  Owner
                </span>
              </button>
            )}
          </div>

          {/* Sign Out */}
          <div className="pt-1 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
