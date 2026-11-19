import React from 'react';
import { Sparkles, Menu, X, ArrowUpRight, Crown, LogOut, Compass } from 'lucide-react';
import { Button } from '../ui/Button';
import { LanguageSelector } from './LanguageSelector';
import { Language } from '../../types';
import { CreatorFlowUser } from '../../lib/auth';
import { AccountMenu } from '../auth/AccountMenu';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: Language) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user?: CreatorFlowUser | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onStartTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  selectedLanguage,
  onSelectLanguage,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  user = null,
  onOpenAuth = () => {},
  onSignOut = () => {},
  onStartTour,
}) => {
  const isLanding = currentView === 'landing';

  const handleScrollTo = (sectionId: string) => {
    if (currentView !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#f8f7f4]/95 backdrop-blur-md border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Editorial text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              if (currentView === 'landing') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                onNavigate('landing');
              }
            }}
            className="flex items-center gap-2 text-left group focus-visible:outline-none cursor-pointer whitespace-nowrap"
            aria-label="CreatorFlow AI Home"
          >
            <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[#1a1a1a]">
              CreatorFlow
            </span>
            <span className="font-mono text-[10px] font-medium tracking-wider bg-[#1a1a1a] text-[#f8f7f4] px-1.5 py-0.5">
              AI
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        {isLanding ? (
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-[#1a1a1a] shrink-0">
            <button
              type="button"
              onClick={() => handleScrollTo('features')}
              className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('demo')}
              className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              Interactive Demo
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('how-it-works')}
              className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('pricing')}
              className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('faq')}
              className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>
        ) : (
          <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-[#1a1a1a] shrink-0">
            <button
              onClick={() => onNavigate('landing')}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className={`transition-opacity hover:opacity-100 cursor-pointer ${
                currentView === 'dashboard' ? 'opacity-100 font-semibold' : 'opacity-60'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('ideas')}
              className={`transition-opacity hover:opacity-100 cursor-pointer ${
                currentView === 'ideas' ? 'opacity-100 font-semibold' : 'opacity-60'
              }`}
            >
              Planner
            </button>
            <button
              onClick={() => onNavigate('builder')}
              className={`transition-opacity hover:opacity-100 cursor-pointer ${
                currentView === 'builder' ? 'opacity-100 font-semibold' : 'opacity-60'
              }`}
            >
              Video Builder
            </button>
            <button
              onClick={() => onNavigate('analytics')}
              className={`transition-opacity hover:opacity-100 cursor-pointer ${
                currentView === 'analytics' ? 'opacity-100 font-semibold' : 'opacity-60'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => onNavigate('tools')}
              className={`transition-opacity hover:opacity-100 cursor-pointer ${
                currentView === 'tools' ? 'opacity-100 font-semibold' : 'opacity-60'
              }`}
            >
              YouTube Tools
            </button>
            <button
              onClick={() => onNavigate('content-pack')}
              className={`transition-opacity hover:opacity-100 cursor-pointer ${
                currentView === 'content-pack' ? 'opacity-100 font-semibold' : 'opacity-60'
              }`}
            >
              Content Pack
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className={`transition-opacity hover:opacity-100 cursor-pointer ${
                currentView === 'pricing' ? 'opacity-100 font-semibold' : 'opacity-60'
              }`}
            >
              Pricing
            </button>
          </nav>
        )}

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:block shrink-0">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onSelectLanguage={onSelectLanguage}
              variant="compact"
            />
          </div>

          {isLanding ? (
            <div className="flex items-center gap-2 shrink-0">
              {!user && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-[11px] font-semibold tracking-wider px-3.5 py-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>{user ? 'Studio' : 'Get Started'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {onStartTour && (
                <button
                  type="button"
                  data-tour="help-tour-button"
                  onClick={onStartTour}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 border border-black/[0.12] hover:border-black/[0.24] bg-white text-neutral-700 hover:text-[#1a1a1a] text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Guided Studio Tour"
                >
                  <Compass className="w-3.5 h-3.5 text-[#d4a017]" />
                  <span>Tour</span>
                </button>
              )}
              <button
                onClick={() => onNavigate('pricing')}
                className="inline-flex items-center gap-1 bg-[#d4a017] hover:bg-[#b8890f] text-white font-mono text-[11px] font-semibold tracking-widest uppercase px-3 py-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>UPGRADE</span>
              </button>
            </div>
          )}

          {/* Account Menu or Sign In */}
          <div className="shrink-0">
            <AccountMenu
              user={user}
              onNavigate={onNavigate}
              onOpenAuth={onOpenAuth}
              onSignOut={onSignOut}
              onStartTour={onStartTour}
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Account Bar in Mobile Drawer */}
          {user ? (
            <div className="p-3 bg-[#f8f7f4] rounded-lg border border-black/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.displayName)}`}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full object-cover border border-black/[0.12]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#1a1a1a]">{user.displayName}</div>
                  <div className="text-[10px] text-neutral-500 font-mono">{user.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSignOut();
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full py-2 px-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#f8f7f4] rounded-lg text-xs font-medium text-center"
              >
                Sign In with Google
              </button>
            </div>
          )}

          {isLanding ? (
            <div className="space-y-1">
              <button
                onClick={() => {
                  handleScrollTo('features');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Features &amp; Workflow
              </button>
              <button
                onClick={() => {
                  handleScrollTo('demo');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Interactive Transformation Demo
              </button>
              <button
                onClick={() => {
                  handleScrollTo('how-it-works');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                How It Works (6 Steps)
              </button>
              <button
                onClick={() => {
                  handleScrollTo('pricing');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Pricing &amp; Plans
              </button>
              <button
                onClick={() => {
                  handleScrollTo('faq');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Frequently Asked Questions
              </button>

              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 bg-[#1a1a1a] hover:bg-[#d4a017] text-white rounded-lg text-xs font-mono font-semibold tracking-wider text-center uppercase cursor-pointer"
                >
                  Start Creating Free
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => {
                  onNavigate('landing');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'landing' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Home (Landing)
              </button>
              <button
                onClick={() => {
                  onNavigate('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'dashboard' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Dashboard
              </button>
              {onStartTour && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onStartTour();
                  }}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg font-medium text-[#1a1a1a] hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-[#d4a017]" />
                  <span>Take Studio Tour</span>
                </button>
              )}
              <button
                onClick={() => {
                  onNavigate('ideas');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'ideas' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Content Planner (Ideas)
              </button>
              <button
                onClick={() => {
                  onNavigate('builder');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'builder' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Video Builder
              </button>
              <button
                onClick={() => {
                  onNavigate('analytics');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'analytics' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Creator Analytics
              </button>
              <button
                onClick={() => {
                  onNavigate('tools');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'tools' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                YouTube Tools (9 Tools)
              </button>
              <button
                onClick={() => {
                  onNavigate('content-pack');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'content-pack' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Content Pack Studio
              </button>
              <button
                onClick={() => {
                  onNavigate('saved');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'saved' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Saved Packs
              </button>
              <button
                onClick={() => {
                  onNavigate('history');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'history' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Generation History
              </button>
              <button
                onClick={() => {
                  onNavigate('pricing');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'pricing' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Pricing &amp; Plans
              </button>
              <button
                onClick={() => {
                  onNavigate('settings');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium cursor-pointer ${
                  currentView === 'settings' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Settings
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-500 font-medium mb-1.5 block">Active Language:</span>
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onSelectLanguage={(lang) => {
                onSelectLanguage(lang);
                setIsMobileMenuOpen(false);
              }}
              variant="simple"
            />
          </div>
        </div>
      )}
    </header>
  );
};
