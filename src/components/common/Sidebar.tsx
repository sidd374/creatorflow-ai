import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  Layers, 
  Bookmark, 
  History, 
  Crown, 
  Settings,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Compass,
  Film,
  BarChart3,
  Radar,
  FlaskConical
} from 'lucide-react';
import { User, Subscription, CreatorProfile } from '../../types';
import { getStoredPlan, PlanId, PLAN_DEFINITIONS } from '../../lib/planEntitlements';
import { checkWeeklyVideoQuota, WeeklyQuotaStatus } from '../../lib/videoQuota';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: User;
  subscription: Subscription;
  creatorProfile?: CreatorProfile;
  activeProjectsCount?: number;
  onRetakeOnboarding?: () => void;
  onStartTour?: () => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number | string;
  highlight?: boolean;
  external?: boolean;
}

interface NavSection {
  title: string;
  items: NavItemConfig[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  user,
  subscription,
  creatorProfile,
  activeProjectsCount,
  onRetakeOnboarding,
  onStartTour,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [canScrollTop, setCanScrollTop] = useState(false);
  const [canScrollBottom, setCanScrollBottom] = useState(false);
  const [activePlanId, setActivePlanId] = useState<PlanId>(() => getStoredPlan());
  const [weeklyQuota, setWeeklyQuota] = useState<WeeklyQuotaStatus>(() => checkWeeklyVideoQuota());

  useEffect(() => {
    const handlePlanChange = () => {
      setActivePlanId(getStoredPlan());
      setWeeklyQuota(checkWeeklyVideoQuota());
    };
    const handleQuotaChange = () => {
      setWeeklyQuota(checkWeeklyVideoQuota());
    };
    window.addEventListener('creatorflow_plan_changed', handlePlanChange);
    window.addEventListener('creatorflow_weekly_quota_changed', handleQuotaChange);
    return () => {
      window.removeEventListener('creatorflow_plan_changed', handlePlanChange);
      window.removeEventListener('creatorflow_weekly_quota_changed', handleQuotaChange);
    };
  }, []);

  const planDef = PLAN_DEFINITIONS[activePlanId] || PLAN_DEFINITIONS.free;
  const planLabel = activePlanId === 'free' 
    ? 'Upgrade to Pro' 
    : activePlanId === 'max'
      ? 'MAX Plan (Active)'
      : `${planDef.name} Active • Manage`;

  // Grouped Navigation Sections according to SaaS information hierarchy
  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      ]
    },
    {
      title: 'Create & Plan',
      items: [
        { id: 'radar', label: 'Daily Radar', icon: <Radar className="w-4 h-4 text-amber-500" /> },
        { id: 'ideas', label: 'Content Planner', icon: <Compass className="w-4 h-4" /> },
        ...(activeProjectsCount !== undefined || currentView === 'builder' ? [
          { 
            id: 'builder', 
            label: 'Video Builder', 
            icon: <Film className="w-4 h-4" />, 
            count: activeProjectsCount && activeProjectsCount > 0 ? activeProjectsCount : undefined 
          }
        ] : []),
      ]
    },
    {
      title: 'Studio Tools',
      items: [
        { id: 'tools', label: 'YouTube Tools', icon: <Wrench className="w-4 h-4" />, count: 9 },
        { id: 'content-pack', label: 'Content Packs', icon: <Layers className="w-4 h-4" /> },
      ]
    },
    {
      title: 'Insights & Library',
      items: [
        { id: 'analytics', label: 'Creator Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'situation-lab', label: 'Situation Lab', icon: <FlaskConical className="w-4 h-4 text-[#d4a017]" /> },
        { id: 'saved', label: 'Saved Packs', icon: <Bookmark className="w-4 h-4" />, count: user.totalSavedPacks },
        { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
      ]
    },
    {
      title: 'Account & Plan',
      items: [
        { id: 'pricing', label: planLabel, icon: <Crown className="w-4 h-4 text-amber-500" />, highlight: activePlanId === 'free' },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        ...(onStartTour ? [{ id: 'tour', label: 'Studio Guided Tour', icon: <Compass className="w-4 h-4 text-[#d4a017]" /> }] : []),
        { id: 'landing', label: 'Product Overview', icon: <Sparkles className="w-4 h-4 text-[#d4a017]" />, external: true },
      ]
    }
  ];

  // Flattened items list for keyboard navigation
  const allItems = navSections.flatMap(s => s.items);

  // Check scroll position to control top/bottom fade hints
  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const hasOverflow = scrollHeight > clientHeight + 4;

    setCanScrollTop(hasOverflow && scrollTop > 10);
    setCanScrollBottom(hasOverflow && scrollTop + clientHeight < scrollHeight - 10);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollability();

    const handleScroll = () => {
      checkScrollability();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkScrollability);

    // Also observe size changes inside scrollable contents
    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkScrollability);
      resizeObserver.disconnect();
    };
  }, [checkScrollability, currentView, activeProjectsCount]);

  // Smoothly keep the active item in view inside the sidebar container ONLY (prevent window jumping)
  useEffect(() => {
    const activeEl = buttonRefs.current.get(currentView);
    const container = scrollContainerRef.current;

    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();

      // Check if element is outside top or bottom boundary of container
      if (elRect.top < containerRect.top + 30) {
        container.scrollTo({
          top: container.scrollTop + (elRect.top - containerRect.top) - 24,
          behavior: 'smooth'
        });
      } else if (elRect.bottom > containerRect.bottom - 30) {
        container.scrollTo({
          top: container.scrollTop + (elRect.bottom - containerRect.bottom) + 24,
          behavior: 'smooth'
        });
      }
    }
  }, [currentView]);

  // Keyboard navigation handler for Up/Down arrow keys
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % allItems.length;
      const nextId = allItems[nextIndex].id;
      buttonRefs.current.get(nextId)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + allItems.length) % allItems.length;
      const prevId = allItems[prevIndex].id;
      buttonRefs.current.get(prevId)?.focus();
    }
  };

  const handleScrollToBottom = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <aside 
      className="w-64 shrink-0 hidden lg:flex flex-col bg-[#f8f7f4] border-r border-black/[0.06] h-[calc(100vh-4rem)] sticky top-16 select-none"
      role="navigation"
      aria-label="Main Studio Navigation"
    >
      {/* Fixed Sidebar Header / Channel Kicker */}
      <div className="px-4 py-3 border-b border-black/[0.04] bg-[#f8f7f4] shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase font-semibold">
            STUDIO WORKSPACE
          </span>
        </div>
        {creatorProfile?.creatorStage && (
          <span className="text-[9px] font-mono uppercase bg-black/[0.05] text-neutral-600 px-1.5 py-0.5 rounded-sm">
            {creatorProfile.creatorStage}
          </span>
        )}
      </div>

      {/* Main Scrollable Navigation Area with Relative Container for Fade Hints */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* Subtle Top Fade indicator when scrolled down */}
        <div 
          className={`pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#f8f7f4] to-transparent z-20 transition-opacity duration-200 ${
            canScrollTop ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain sidebar-scroll-container px-3 py-3 space-y-4"
          tabIndex={-1}
        >
          {/* Navigation Sections */}
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="px-2.5 text-[10px] font-mono tracking-wider text-neutral-400 uppercase block mb-1 font-semibold">
                {section.title}
              </span>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = currentView === item.id;
                  const itemGlobalIndex = allItems.findIndex(i => i.id === item.id);

                  const tourAttribute = 
                    item.id === 'dashboard' ? 'nav-dashboard' :
                    item.id === 'tools' ? 'nav-tools' :
                    item.id === 'analytics' ? 'nav-analytics' :
                    item.id === 'radar' ? 'nav-radar' :
                    item.id === 'tour' ? 'help-tour-button' : undefined;

                  return (
                    <button
                      key={item.id}
                      data-tour={tourAttribute}
                      ref={(el) => {
                        if (el) buttonRefs.current.set(item.id, el);
                        else buttonRefs.current.delete(item.id);
                      }}
                      onClick={() => {
                        if (item.id === 'tour' && onStartTour) {
                          onStartTour();
                        } else {
                          onNavigate(item.id);
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, itemGlobalIndex)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-md transition-all group focus-visible:ring-2 focus-visible:ring-[#d4a017] focus-visible:ring-offset-1 focus-visible:outline-none ${
                        isActive
                          ? 'bg-[#1a1a1a] text-[#f8f7f4] shadow-xs font-semibold'
                          : item.highlight
                          ? 'text-[#1a1a1a] bg-[#eeeae3] hover:bg-[#e4dfd6] border border-[#ded8cd]'
                          : 'text-[#1a1a1a]/75 hover:text-[#1a1a1a] hover:bg-black/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`shrink-0 transition-colors ${
                          isActive 
                            ? 'text-white' 
                            : item.highlight 
                            ? 'text-[#d4a017]' 
                            : 'text-[#1a1a1a]/50 group-hover:text-[#1a1a1a]'
                        }`}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.count !== undefined && (
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                              isActive ? 'bg-[#2a2a2a] text-[#f8f7f4]' : 'bg-black/[0.05] text-[#1a1a1a]/60'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                        {item.external && (
                          <ExternalLink className="w-3 h-3 text-[#1a1a1a]/30 group-hover:text-[#1a1a1a]/60 transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Creator Profile Focus Card */}
          {creatorProfile && (
            <div className="pt-2 border-t border-black/[0.05]">
              <div className="p-3 bg-white border border-black/[0.07] rounded-md shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-[#1a1a1a] bg-[#eeeae3] px-1.5 py-0.5 rounded-sm border border-[#e2ddd4]">
                    {creatorProfile.creatorStage}
                  </span>
                  {onRetakeOnboarding && (
                    <button
                      onClick={onRetakeOnboarding}
                      className="text-[10px] font-mono uppercase text-[#d4a017] hover:text-[#b8890f] transition-colors font-semibold focus-visible:outline-none focus-visible:underline"
                    >
                      EDIT
                    </button>
                  )}
                </div>
                <div className="text-xs font-serif font-semibold text-[#1a1a1a] truncate mt-1">
                  {creatorProfile.primaryGoal || 'Grow YouTube Channel'}
                </div>
                <div className="text-[10px] font-mono text-neutral-500 truncate mt-0.5">
                  {creatorProfile.dailyTimeAvailable || '1-2 hrs/day'} &bull; {creatorProfile.monthlyBudget || 'Bootstrap'}
                </div>
              </div>
            </div>
          )}

          {/* Weekly Video Quota Card inside the scroll container */}
          <div data-tour="sidebar-plan" className="pt-1">
            <div className="p-3 bg-white border border-black/[0.07] rounded-md shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-xs font-semibold text-[#1a1a1a] block">
                    {activePlanId === 'free' ? 'Weekly Video Quota' : 'Video Creation Quota'}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {activePlanId === 'free' ? 'Rolling 7 days' : 'Plan allowance'}
                  </span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-neutral-600 font-medium">
                  {weeklyQuota.used} / {weeklyQuota.limit === 'unlimited' ? '∞' : weeklyQuota.limit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    weeklyQuota.used >= (typeof weeklyQuota.limit === 'number' ? weeklyQuota.limit : 999)
                      ? 'bg-amber-600'
                      : 'bg-[#1a1a1a]'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (weeklyQuota.used / Math.max(1, typeof weeklyQuota.limit === 'number' ? weeklyQuota.limit : 1)) * 100
                    )}%`,
                  }}
                />
              </div>
              {weeklyQuota.resetsInFormatted && weeklyQuota.used > 0 && (
                <div className={`text-[10px] font-mono px-2 py-1 rounded mb-2 ${
                  weeklyQuota.used >= (typeof weeklyQuota.limit === 'number' ? weeklyQuota.limit : 999)
                    ? 'text-amber-800 bg-amber-50 font-medium'
                    : 'text-neutral-500 bg-black/[0.03]'
                }`}>
                  {weeklyQuota.used >= (typeof weeklyQuota.limit === 'number' ? weeklyQuota.limit : 999)
                    ? `Quota releases in ${weeklyQuota.resetsInFormatted}`
                    : `Next reset: ${weeklyQuota.resetsInFormatted}`}
                </div>
              )}
              <button
                onClick={() => onNavigate('pricing')}
                className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#d4a017] hover:text-[#b8890f] flex items-center justify-between w-full transition-colors pt-0.5 focus-visible:outline-none"
              >
                <span>{activePlanId === 'free' ? 'UPGRADE PRO' : 'MANAGE PLAN'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Subtle Bottom Fade indicator when more content exists below */}
        <div 
          onClick={handleScrollToBottom}
          className={`cursor-pointer absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-[#f8f7f4] via-[#f8f7f4]/85 to-transparent z-20 flex items-end justify-center pb-1 transition-opacity duration-200 ${
            canScrollBottom ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          title="Scroll down for more items"
          aria-hidden="true"
        >
          <div className="flex items-center gap-1 text-[9px] font-mono tracking-wider text-neutral-400 bg-[#f8f7f4]/90 px-2 py-0.5 rounded-full border border-black/[0.05] shadow-xs hover:text-neutral-700 transition-colors">
            <span>MORE</span>
            <ChevronDown className="w-2.5 h-2.5 animate-bounce" />
          </div>
        </div>
      </div>

      {/* User Mini Profile Footer (Fixed at the bottom of the sidebar) */}
      <div className="shrink-0 p-3 border-t border-black/[0.06] bg-[#f8f7f4]">
        <button
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-2.5 p-1.5 rounded-md hover:bg-black/[0.04] text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#d4a017] focus-visible:outline-none group"
          title="Account Settings"
        >
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover border border-neutral-300 shrink-0"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-neutral-900 truncate group-hover:text-black">
              {user.name}
            </div>
            <div className="text-[11px] font-mono text-neutral-500 truncate">
              {user.channelName}
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-colors shrink-0" />
        </button>
      </div>
    </aside>
  );
};
