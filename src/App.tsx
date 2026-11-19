/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from 'react';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MobileNav } from './components/common/MobileNav';
import { InteractiveDotField } from './components/common/InteractiveDotField';
import { LandingView } from './components/views/LandingView';
import type { LegalPageId } from './components/views/LegalSupportView';

const DashboardView = lazy(() => import('./components/views/DashboardView').then((m) => ({ default: m.DashboardView })));
const ToolsView = lazy(() => import('./components/views/ToolsView').then((m) => ({ default: m.ToolsView })));
const ContentPackView = lazy(() => import('./components/views/ContentPackView').then((m) => ({ default: m.ContentPackView })));
const SavedView = lazy(() => import('./components/views/SavedView').then((m) => ({ default: m.SavedView })));
const HistoryView = lazy(() => import('./components/views/HistoryView').then((m) => ({ default: m.HistoryView })));
const PricingView = lazy(() => import('./components/views/PricingView').then((m) => ({ default: m.PricingView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then((m) => ({ default: m.SettingsView })));
const IdeasView = lazy(() => import('./components/views/IdeasView').then((m) => ({ default: m.IdeasView })));
const VideoBuilderView = lazy(() => import('./components/views/VideoBuilderView').then((m) => ({ default: m.VideoBuilderView })));
const AnalyticsView = lazy(() => import('./components/views/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const SituationLabView = lazy(() => import('./components/views/SituationLabView').then((m) => ({ default: m.SituationLabView })));
const LegalSupportView = lazy(() => import('./components/views/LegalSupportView').then((m) => ({ default: m.LegalSupportView })));
import { SAMPLE_CONTENT_PACK } from './data/mockData';
import { LANGUAGES } from './data/languages';
import { 
  Language, 
  User, 
  Subscription,
  ContentPack, 
  PlatformType, 
  ToneType, 
  CreatorProfile,
  VideoIdea,
  RecommendedVideoIdea,
  VideoProject,
  BuilderTab
} from './types';
import { generateContentPack } from './lib/contentEngine';
import { executeIntelligence, IntelligenceClientError } from './lib/intelligenceClient';
import { getOrCreatePersonalizationProfile } from './lib/autonomousEngine/personalizationEngine';
import {
  getIsolatedContentPacks,
  saveIsolatedContentPacks,
  getAccountScopedKey,
  getActiveAccountId,
} from './lib/accountStorage';
import { 
  getCreatorProfile, 
  hasCompletedOnboarding, 
  saveCreatorProfile,
  getVideoProjects,
  saveVideoProject,
  createOrGetProjectFromIdea,
  getSavedIdeas,
  saveIdeas
} from './lib/creatorStorage';
import { 
  getGuidedWorkflowState, 
  saveGuidedWorkflowState, 
  clearGuidedWorkflowState, 
  initWorkflowFromTopic, 
  initWorkflowFromIdea 
} from './lib/guidedWorkflowStorage';
import { CreatorWorkflowState } from './types/guidedWorkflow';
const GuidedWorkflowShell = lazy(() => import('./components/guidedWorkflow/GuidedWorkflowShell').then((m) => ({ default: m.GuidedWorkflowShell })));
import { getDefaultRecommendations } from './lib/strategyEngine';
const OnboardingView = lazy(() => import('./components/views/OnboardingView').then((m) => ({ default: m.OnboardingView })));
import { 
  CreatorFlowUser, 
  getCurrentAccount, 
  isAuthenticated as checkIsAuthenticated,
  signOutUser,
  initializeAuthSessionListener,
  isAuthorizedOwner,
  getAuthStatus,
  AuthStatus,
  getAuthIdToken
} from './lib/auth';
import { AuthModal } from './components/auth/AuthModal';
import { AuthGatedModal } from './components/auth/AuthGatedModal';
import { checkWeeklyVideoQuota, recordWeeklyVideoGeneration, reserveVideoSlotServer, releaseVideoSlotServer } from './lib/videoQuota';
import { CreatorFlowAssistant } from './components/assistant/CreatorFlowAssistant';
import { getVideoAnalyticsList, DEFAULT_CREATOR_PROFILE } from './lib/creatorStorage';
const OwnerDashboardShell = lazy(() => import('./components/admin/OwnerDashboardShell').then((m) => ({ default: m.OwnerDashboardShell })));
const RadarView = lazy(() => import('./components/views/RadarView').then((m) => ({ default: m.RadarView })));
import { trackAdminEvent } from './lib/adminAnalyticsService';
import { trackEvent } from './lib/analyticsService';
import { recordGeneration, getStoredPlan, PLAN_DEFINITIONS, PlanId } from './lib/planEntitlements';
import { WelcomeTourModal } from './components/tour/WelcomeTourModal';
import { InteractiveGuidedTour } from './components/tour/InteractiveGuidedTour';
import { 
  shouldShowWelcomeModal, 
  dismissWelcomeModal, 
  markTourCompleted, 
  resetTourForReplay 
} from './lib/guidedTourStorage';
import { useSeoMetadata } from './lib/useSeoMetadata';

const PUBLIC_LEGAL_VIEWS = new Set(['privacy', 'terms', 'refund-policy', 'contact']);

const WorkspaceChunkFallback: React.FC = () => (
  <div className="min-h-[45vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
    <div className="w-7 h-7 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Loading studio module…</p>
  </div>
);

function buildUserFromAccount(account: CreatorFlowUser | null, profile: CreatorProfile, savedPacksCount = 0): User {
  const base: User = {
    id: account?.id || 'guest',
    name: account?.displayName || 'Creator',
    email: account?.email || '',
    avatarUrl: account?.photoURL || '/images/avatar_creator_1791099679133.jpg',
    channelName: profile.channelTopic ? `${profile.channelTopic.slice(0, 32)} Channel` : 'My YouTube Channel',
    channelUrl: '',
    channelNiche: profile.niche || profile.channelTopic || 'YouTube Strategy',
    defaultLanguage: profile.preferredLanguage || 'English',
    defaultTone: 'Educational',
    generationsUsedToday: 0,
    generationsLimitToday: 3,
    totalSavedPacks: savedPacksCount,
  };
  if (typeof window !== 'undefined' && account?.id) {
    try {
      const rawPrefs = localStorage.getItem(getAccountScopedKey(account.id, 'user_prefs'));
      if (rawPrefs) {
        const prefs = JSON.parse(rawPrefs);
        return { ...base, ...prefs, id: account.id, email: account.email || prefs.email || '' };
      }
    } catch {
      // ignore
    }
  }
  return base;
}

function buildSubscriptionForPlan(planId?: PlanId): Subscription {
  const resolved: PlanId = planId || getStoredPlan() || 'free';
  const def = PLAN_DEFINITIONS[resolved] || PLAN_DEFINITIONS.free;
  return {
    planId: resolved,
    planName: def.name,
    priceFormatted: def.priceMonthly > 0 ? `₹${def.priceMonthly}` : '₹0',
    cadence: 'monthly',
    renewalDate: resolved === 'free' ? 'Free Tier' : 'Early Access',
    status: 'active',
    features: def.highlights,
  };
}

const PROTECTED_VIEWS = new Set([
  'dashboard',
  'guided-workflow',
  'onboarding',
  'builder',
  'analytics',
  'situation-lab',
  'ideas',
  'radar',
  'content-pack',
  'creation-kits',
  'tools',
  'saved',
  'history',
  'settings',
  'admin',
]);
export const isProtectedView = (view: string): boolean => PROTECTED_VIEWS.has(view);

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => getAuthStatus());
  const [currentAccount, setCurrentAccount] = useState<CreatorFlowUser | null>(() => getCurrentAccount());
  const isAuthenticated = authStatus === 'authenticated' && Boolean(currentAccount && checkIsAuthenticated());
  const [pendingDestinationView, setPendingDestinationView] = useState<string | null>(null);
  const [isAuthGateModalOpen, setIsAuthGateModalOpen] = useState(false);
  const [authGateFeatureInfo, setAuthGateFeatureInfo] = useState<{ title: string; description: string }>({
    title: 'Sign in to access your CreatorFlow Workspace',
    description: 'Sign in with your Google account to access your personal dashboard, saved projects, and AI creation tools.',
  });
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile>(() => getCreatorProfile());
  const [guidedWorkflowState, setGuidedWorkflowState] = useState<CreatorWorkflowState | null>(() => getGuidedWorkflowState());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const pathName = window.location.pathname.replace(/\/$/, '');
      if (pathName === '/pricing') {
        return 'pricing';
      }
      if (pathName === '/privacy') return 'privacy';
      if (pathName === '/terms') return 'terms';
      if (pathName === '/refund-policy') return 'refund-policy';
      if (pathName === '/contact') return 'contact';
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      if (viewParam) {
        if (!isProtectedView(viewParam) || checkIsAuthenticated()) {
          return viewParam;
        }
        return 'landing';
      }
      if (
        window.location.hash === '#admin' || 
        window.location.hash.startsWith('#/admin') || 
        window.location.pathname === '/admin' || 
        window.location.search.includes('view=admin')
      ) {
        return checkIsAuthenticated() ? 'admin' : 'landing';
      }
      if (window.location.hash.startsWith('#')) {
        const hash = window.location.hash.slice(1);
        if (hash === 'pricing') {
          return 'pricing';
        }
        if (PUBLIC_LEGAL_VIEWS.has(hash)) {
          return hash;
        }
        if (['features', 'demo', 'how-it-works', 'faq'].includes(hash)) {
          return 'landing';
        }
      }
    }
    const activeWorkflow = getGuidedWorkflowState();
    if (activeWorkflow && !activeWorkflow.isFinished && activeWorkflow.currentStep >= 1 && checkIsAuthenticated()) {
      return 'guided-workflow';
    }
    return 'landing';
  });

  // Dynamically synchronize document title, meta tags, and canonical links
  useSeoMetadata({ currentView });
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    const pref = creatorProfile.preferredLanguage || 'English';
    return LANGUAGES.find((l) => l.name === pref) || LANGUAGES[0];
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [packs, setPacks] = useState<ContentPack[]>(() => getIsolatedContentPacks());
  const [user, setUser] = useState<User>(() =>
    buildUserFromAccount(currentAccount, creatorProfile, getIsolatedContentPacks().filter((p) => p.isSaved).length)
  );
  const [activePackId, setActivePackId] = useState<string>(() => {
    const initial = getIsolatedContentPacks();
    return initial.length > 0 ? initial[0].id : SAMPLE_CONTENT_PACK.id;
  });
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  // Sync auth state changes & cloud workspace hydration across windows/components
  React.useEffect(() => {
    initializeAuthSessionListener();

    const reloadAccountWorkspace = (activeUser: CreatorFlowUser | null) => {
      const nextProfile = getCreatorProfile();
      setCreatorProfile(nextProfile);
      const nextProjects = getVideoProjects();
      setProjects(nextProjects);
      setActiveProjectId(nextProjects.length > 0 ? nextProjects[0].id : null);
      const savedIdeas = getSavedIdeas();
      setIdeas(savedIdeas && savedIdeas.length > 0 ? savedIdeas : getDefaultRecommendations(nextProfile));
      const nextPacks = getIsolatedContentPacks(activeUser?.id);
      setPacks(nextPacks);
      if (nextPacks.length > 0) {
        setActivePackId(nextPacks[0].id);
      }
      setGuidedWorkflowState(getGuidedWorkflowState());
      setUser(buildUserFromAccount(activeUser, nextProfile, nextPacks.filter((p) => p.isSaved).length));
    };

    const handleAuthChange = (e: CustomEvent<{ user: CreatorFlowUser | null }>) => {
      const nextUser = e.detail?.user || null;
      setCurrentAccount(nextUser);
      setAuthStatus(getAuthStatus());
      reloadAccountWorkspace(nextUser);
    };

    const handleAuthInitialized = () => {
      setAuthStatus(getAuthStatus());
    };

    const handleWorkspaceHydrated = () => {
      reloadAccountWorkspace(getCurrentAccount());
    };

    const handlePacksCleared = () => {
      setPacks([]);
      setUser((prev) => ({ ...prev, totalSavedPacks: 0 }));
    };

    const handleWorkspaceCleared = () => {
      setPacks([]);
      setActivePackId(SAMPLE_CONTENT_PACK.id);
      setProjects([]);
      setActiveProjectId(null);
      setIdeas([]);
      setGuidedWorkflowState(null);
      setUser((prev) => ({ ...prev, totalSavedPacks: 0 }));
    };

    const handleProfileReset = () => {
      const freshProfile = getCreatorProfile();
      setCreatorProfile(freshProfile);
      const currentPacks = getIsolatedContentPacks(getCurrentAccount()?.id);
      setUser(buildUserFromAccount(getCurrentAccount(), freshProfile, currentPacks.filter((p) => p.isSaved).length));
    };

    const handleCustomNavigate = (e: CustomEvent<{ view?: string }>) => {
      const targetView = e.detail?.view;
      if (!targetView) return;
      if (isProtectedView(targetView) && !checkIsAuthenticated()) {
        setPendingDestinationView(targetView);
        setIsAuthGateModalOpen(true);
        return;
      }
      setCurrentView(targetView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('creatorflow_auth_changed' as any, handleAuthChange as any);
    window.addEventListener('creatorflow_auth_initialized' as any, handleAuthInitialized as any);
    window.addEventListener('creatorflow_workspace_hydrated' as any, handleWorkspaceHydrated as any);
    window.addEventListener('creatorflow_packs_cleared' as any, handlePacksCleared as any);
    window.addEventListener('creatorflow_workspace_cleared' as any, handleWorkspaceCleared as any);
    window.addEventListener('creatorflow_profile_reset' as any, handleProfileReset as any);
    window.addEventListener('creatorflow_navigate' as any, handleCustomNavigate as any);
    return () => {
      window.removeEventListener('creatorflow_auth_changed' as any, handleAuthChange as any);
      window.removeEventListener('creatorflow_auth_initialized' as any, handleAuthInitialized as any);
      window.removeEventListener('creatorflow_workspace_hydrated' as any, handleWorkspaceHydrated as any);
      window.removeEventListener('creatorflow_packs_cleared' as any, handlePacksCleared as any);
      window.removeEventListener('creatorflow_workspace_cleared' as any, handleWorkspaceCleared as any);
      window.removeEventListener('creatorflow_profile_reset' as any, handleProfileReset as any);
      window.removeEventListener('creatorflow_navigate' as any, handleCustomNavigate as any);
    };
  }, []);

  // Guard initial navigation / direct URL access if unauthenticated
  React.useEffect(() => {
    if (authStatus === 'unauthenticated' && isProtectedView(currentView)) {
      setPendingDestinationView(currentView);
      setCurrentView('landing');
      setIsAuthGateModalOpen(true);
    }
  }, [authStatus, currentView]);

  // Listen for hashchange (#admin, #/admin, #radar, #/radar)
  React.useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== 'undefined') {
        if (window.location.hash === '#admin' || window.location.hash.startsWith('#/admin')) {
          setCurrentView('admin');
        } else if (window.location.hash === '#radar' || window.location.hash.startsWith('#/radar')) {
          setCurrentView('radar');
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Track page view event on currentView changes
  React.useEffect(() => {
    trackAdminEvent('page_view', { view: currentView });
    if (currentView === 'landing') {
      trackEvent('session_started', { properties: { view: 'landing' } });
    }
    if (currentView === 'radar') {
      trackEvent('session_started', { feature: 'daily_content_radar', properties: { view: 'radar' } });
    }
    if (currentView === 'pricing') {
      trackAdminEvent('upgrade_page_viewed');
      trackEvent('upgrade_viewed', { properties: { fromView: 'pricing' } });
    }
    if (currentView === 'analytics') {
      trackEvent('creator_analytics_used', { feature: 'creator_analytics' });
    }
  }, [currentView]);

  const handleAuthSuccess = (newUser: CreatorFlowUser, isNewAccount?: boolean) => {
    setCurrentAccount(newUser);
    setAuthStatus('authenticated');
    if (isNewAccount) {
      trackAdminEvent('signup', { method: 'google', accountId: newUser.id });
      trackEvent('signup_completed', { accountId: newUser.id, properties: { method: 'google' } });
    } else {
      trackEvent('login_completed', { accountId: newUser.id, properties: { method: 'google' } });
    }
    const loadedPacks = getIsolatedContentPacks(newUser.id);
    setPacks(loadedPacks);
    if (loadedPacks.length > 0) {
      setActivePackId(loadedPacks[0].id);
    }

    const currentProf = getCreatorProfile();
    setCreatorProfile(currentProf);
    setUser(buildUserFromAccount(newUser, currentProf, loadedPacks.filter((p) => p.isSaved).length));
    const loadedProjects = getVideoProjects();
    setProjects(loadedProjects);
    setActiveProjectId(loadedProjects.length > 0 ? loadedProjects[0].id : null);
    const savedIdeas = getSavedIdeas();
    setIdeas(savedIdeas && savedIdeas.length > 0 ? savedIdeas : getDefaultRecommendations(currentProf));

    if (pendingDestinationView) {
      const destination = pendingDestinationView;
      setPendingDestinationView(null);
      setIsAuthGateModalOpen(false);
      setIsAuthModalOpen(false);
      setCurrentView(destination);
    } else if (shouldShowWelcomeModal(newUser.id)) {
      // First-login experience: land directly on dashboard and show Welcome Tour Modal
      setCurrentView('dashboard');
      setIsWelcomeModalOpen(true);
    } else if (!hasCompletedOnboarding()) {
      trackEvent('onboarding_started', { accountId: newUser.id });
      setCurrentView('onboarding');
    } else {
      setCurrentView('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentAccount(null);
    setIsWelcomeModalOpen(false);
    setIsGuidedTourOpen(false);
    const anonProfile = getCreatorProfile();
    setCreatorProfile(anonProfile);
    const anonPacks = getIsolatedContentPacks();
    setPacks(anonPacks);
    setUser(buildUserFromAccount(null, anonProfile, anonPacks.filter((p) => p.isSaved).length));
    setProjects(getVideoProjects());
    setActiveProjectId(null);
    setIdeas(getDefaultRecommendations(anonProfile));
    setGuidedWorkflowState(null);
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Phase 3 Video Projects & Ideas state
  const [projects, setProjects] = useState<VideoProject[]>(() => getVideoProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    const list = getVideoProjects();
    return list.length > 0 ? list[0].id : null;
  });
  const [ideas, setIdeas] = useState<RecommendedVideoIdea[]>(() => {
    const saved = getSavedIdeas();
    if (saved && saved.length > 0) return saved;
    return getDefaultRecommendations(creatorProfile);
  });
  const [analyticsPreselectedProjectId, setAnalyticsPreselectedProjectId] = useState<string | null>(null);
  const [packByokError, setPackByokError] = useState<{
    code: string;
    message: string;
    pendingRequest: { topic: string; platform: PlatformType; language: string; tone: ToneType };
  } | null>(null);
  const [isGeneratingAiPack, setIsGeneratingAiPack] = useState(false);

  const activePack = packs.find((p) => p.id === activePackId) || packs[0] || SAMPLE_CONTENT_PACK;

  const promptAuthForView = (targetView: string, title?: string, desc?: string) => {
    setPendingDestinationView(targetView);
    setAuthGateFeatureInfo({
      title: title || 'Sign in to access your CreatorFlow Workspace',
      description: desc || 'Sign in with your Google account to access your personal dashboard, saved projects, and AI creation tools.',
    });
    setIsAuthGateModalOpen(true);
  };

  const handleNavigate = (view: string) => {
    if (isProtectedView(view) && !isAuthenticated) {
      promptAuthForView(
        view,
        `Sign in to access ${view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')}`,
        'Sign in with your Google account to access your personal workspace, saved projects, and AI tools.'
      );
      return;
    }

    if (view === 'admin') {
      if (typeof window !== 'undefined' && window.location.hash !== '#admin') {
        window.location.hash = '#admin';
      }
    } else if (view === 'pricing' || PUBLIC_LEGAL_VIEWS.has(view)) {
      const targetPath = `/${view}`;
      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        try {
          window.history.pushState(null, '', targetPath);
        } catch {
          // ignore
        }
      }
    } else if (view === 'landing') {
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        try {
          window.history.pushState(null, '', '/');
        } catch {
          // ignore
        }
      }
    } else {
      if (typeof window !== 'undefined' && (window.location.hash === '#admin' || window.location.hash.startsWith('#/admin'))) {
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch {
          // ignore
        }
      }
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartGuidedWorkflow = async (topicOrIdea?: string | RecommendedVideoIdea) => {
    if (!isAuthenticated) {
      promptAuthForView('guided-workflow', 'Sign in to create a video', 'Sign in to start creating a new video production workflow.');
      return;
    }

    const topicString = typeof topicOrIdea === 'string'
      ? topicOrIdea
      : (topicOrIdea && typeof topicOrIdea === 'object' && 'title' in topicOrIdea)
      ? topicOrIdea.title
      : (creatorProfile.channelTopic || 'New Video');

    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Authoritative Server-Side Video Quota Reservation at the exact point generation starts
    const reservation = await reserveVideoSlotServer({
      workflowId,
      topic: topicString,
      accountId: currentAccount?.id,
    });

    if (!reservation.success) {
      const countdownNote = reservation.resetsInFormatted ? ` (Next slot resets in ${reservation.resetsInFormatted})` : '';
      window.dispatchEvent(
        new CustomEvent('creatorflow_toast', {
          detail: {
            title: 'Free Video Limit Reached',
            message: `${reservation.message || 'You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.'}${countdownNote}`,
            type: 'warning',
          },
        })
      );
      setPendingDestinationView('pricing');
      setCurrentView('pricing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let state: CreatorWorkflowState;
    if (typeof topicOrIdea === 'string') {
      state = initWorkflowFromTopic(topicOrIdea, creatorProfile);
    } else if (topicOrIdea && typeof topicOrIdea === 'object' && 'title' in topicOrIdea) {
      state = initWorkflowFromIdea(topicOrIdea as RecommendedVideoIdea, creatorProfile);
    } else {
      const defaultTopic = creatorProfile.channelTopic || 'How to grow a YouTube channel';
      state = initWorkflowFromTopic(defaultTopic, creatorProfile);
    }

    state.workflowId = reservation.workflowId || workflowId;
    state.reservationId = reservation.reservationId;
    setGuidedWorkflowState(state);
    setCurrentView('guided-workflow');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompleteGuidedWorkflow = (projectId: string) => {
    setProjects(getVideoProjects());
    setActiveProjectId(projectId);
    clearGuidedWorkflowState();
    setGuidedWorkflowState(null);
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitGuidedWorkflow = () => {
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAnalytics = (projectId?: string) => {
    if (projectId) {
      setAnalyticsPreselectedProjectId(projectId);
    }
    setCurrentView('analytics');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPack = (packId: string) => {
    setActivePackId(packId);
    setCurrentView('content-pack');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBuildIdea = (idea: VideoIdea | RecommendedVideoIdea) => {
    const project = createOrGetProjectFromIdea(idea, creatorProfile);
    const updatedProjects = getVideoProjects();
    setProjects(updatedProjects);
    setActiveProjectId(project.id);
    setCurrentView('builder');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProject = (projectId: string, tab?: BuilderTab) => {
    if (tab) {
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        const updated: VideoProject = { ...proj, lastActiveTab: tab };
        saveVideoProject(updated);
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      }
    }
    setActiveProjectId(projectId);
    setCurrentView('builder');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateIdeaStatus = (ideaId: string, status: 'Idea' | 'Planned' | 'In Production' | 'Published') => {
    const updated = ideas.map((i) => (i.id === ideaId ? { ...i, status } : i));
    setIdeas(updated);
    saveIdeas(updated);
  };

  const handleGeneratePack = async ({
    topic,
    platform,
    language,
    tone,
  }: {
    topic: string;
    platform: PlatformType;
    language: string;
    tone: ToneType;
  }) => {
    if (!isAuthenticated) {
      promptAuthForView(
        'content-pack',
        'Sign in to generate full video packages',
        'Sign in with your Google account to generate scripts, scene prompts, and production metadata with your CreatorFlow quota.'
      );
      return;
    }

    const packWorkflowId = `wf_pack_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Authoritative Server-Side Video Quota Reservation
    const reservation = await reserveVideoSlotServer({
      workflowId: packWorkflowId,
      topic,
      accountId: currentAccount?.id,
    });

    if (!reservation.success) {
      const countdownNote = reservation.resetsInFormatted ? ` (Next slot resets in ${reservation.resetsInFormatted})` : '';
      window.dispatchEvent(
        new CustomEvent('creatorflow_toast', {
          detail: {
            title: 'Free Video Limit Reached',
            message: `${reservation.message || 'You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.'}${countdownNote}`,
            type: 'warning',
          },
        })
      );
      setPendingDestinationView('pricing');
      setCurrentView('pricing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const personalization = getOrCreatePersonalizationProfile(currentAccount?.id || 'default_user');
    setIsGeneratingAiPack(true);
    setPackByokError(null);

    try {
      const intelRes = await executeIntelligence({
        task: 'content_pack',
        input: {
          topic,
          platform,
          language,
          tone,
          variationSeed: 0,
        },
        creatorProfileOverride: creatorProfile,
      });

      const fallbackPack = generateContentPack({
        topic,
        platform,
        language,
        tone,
        variationSeed: 0,
        creatorProfile,
        personalizationProfile: personalization,
      });

      const d = intelRes.data || {};
      const newPack: ContentPack = {
        ...fallbackPack,
        titles: Array.isArray(d.titles) && d.titles.length > 0 ? d.titles : fallbackPack.titles,
        hooks: Array.isArray(d.hooks) && d.hooks.length > 0 ? d.hooks : fallbackPack.hooks,
        description: d.description ? { ...fallbackPack.description, ...d.description } : fallbackPack.description,
        keywords: Array.isArray(d.keywords) && d.keywords.length > 0 ? d.keywords : fallbackPack.keywords,
        hashtags: Array.isArray(d.hashtags) && d.hashtags.length > 0 ? d.hashtags : fallbackPack.hashtags,
        shortsScript: d.shortsScript ? { ...fallbackPack.shortsScript, ...d.shortsScript } : fallbackPack.shortsScript,
        pinnedComment: d.pinnedComment ? { ...fallbackPack.pinnedComment, ...d.pinnedComment } : fallbackPack.pinnedComment,
        thumbnailConcept: d.thumbnailConcept ? { ...fallbackPack.thumbnailConcept, ...d.thumbnailConcept } : fallbackPack.thumbnailConcept,
        videoIdeas: Array.isArray(d.videoIdeas) && d.videoIdeas.length > 0 ? d.videoIdeas : fallbackPack.videoIdeas,
        aiPowered: true,
        aiModelUsed: intelRes.model,
        qualityReport: {
          score: intelRes.qualityReport.score,
          passed: intelRes.qualityReport.passed,
          warnings: intelRes.qualityReport.warnings,
          attempts: intelRes.qualityReport.attempts,
          repaired: intelRes.qualityReport.repaired,
        },
        researchSources: intelRes.researchBrief?.sources.map((s) => ({
          title: s.title,
          url: s.url,
          retrievedAt: s.retrievedAt,
        })),
        personalizationApplied: intelRes.personalizationSummary.appliedConstraints,
      };

      recordGeneration();
      setPacks((prev) => {
        const next = [newPack, ...prev];
        saveIsolatedContentPacks(next, currentAccount?.id);
        return next;
      });
      setActivePackId(newPack.id);
      setUser((prev) => ({
        ...prev,
        generationsUsedToday: prev.generationsUsedToday + 1,
      }));
      setCurrentView('content-pack');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      await releaseVideoSlotServer({
        workflowId: reservation.workflowId || packWorkflowId,
        topic,
        accountId: currentAccount?.id,
      });
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setPackByokError({
          code: err.code,
          message: err.message,
          pendingRequest: { topic, platform, language, tone },
        });
        setCurrentView('content-pack');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.dispatchEvent(
          new CustomEvent('creatorflow_toast', {
            detail: {
              title: 'Generation Failed',
              message: err?.message || 'Unable to generate your Content Pack. Your video slot was not consumed.',
              type: 'error',
            },
          })
        );
      }
    } finally {
      setIsGeneratingAiPack(false);
    }
  };

  const handleGenerateLocalPackFallback = async (req: {
    topic: string;
    platform: PlatformType;
    language: string;
    tone: ToneType;
  }) => {
    const personalization = getOrCreatePersonalizationProfile(currentAccount?.id || 'default_user');
    const packWorkflowId = `wf_pack_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const reservation = await reserveVideoSlotServer({
      workflowId: packWorkflowId,
      topic: req.topic,
      accountId: currentAccount?.id,
    });
    if (!reservation.success) {
      setCurrentView('pricing');
      return;
    }
    const localPack = generateContentPack({
      ...req,
      variationSeed: 0,
      creatorProfile,
      personalizationProfile: personalization,
    });
    setPackByokError(null);
    recordGeneration();
    setPacks((prev) => {
      const next = [localPack, ...prev];
      saveIsolatedContentPacks(next, currentAccount?.id);
      return next;
    });
    setActivePackId(localPack.id);
    setCurrentView('content-pack');
  };

  const handleRegenerateActivePack = async () => {
    if (!activePack) return;
    const personalization = getOrCreatePersonalizationProfile(currentAccount?.id || 'default_user');
    const nextSeed = (activePack.variationSeed ?? 0) + 1;
    setIsGeneratingAiPack(true);
    setPackByokError(null);

    try {
      const intelRes = await executeIntelligence({
        task: 'content_pack',
        bypassCache: true,
        input: {
          topic: activePack.topic,
          platform: activePack.platform,
          language: activePack.language,
          tone: activePack.tone,
          variationSeed: nextSeed,
        },
        creatorProfileOverride: creatorProfile,
      });

      const base = generateContentPack({
        topic: activePack.topic,
        platform: activePack.platform,
        language: activePack.language,
        tone: activePack.tone,
        variationSeed: nextSeed,
        creatorProfile,
        personalizationProfile: personalization,
      });

      const d = intelRes.data || {};
      const refreshedPack: ContentPack = {
        ...base,
        titles: Array.isArray(d.titles) && d.titles.length > 0 ? d.titles : base.titles,
        hooks: Array.isArray(d.hooks) && d.hooks.length > 0 ? d.hooks : base.hooks,
        description: d.description ? { ...base.description, ...d.description } : base.description,
        keywords: Array.isArray(d.keywords) && d.keywords.length > 0 ? d.keywords : base.keywords,
        hashtags: Array.isArray(d.hashtags) && d.hashtags.length > 0 ? d.hashtags : base.hashtags,
        shortsScript: d.shortsScript ? { ...base.shortsScript, ...d.shortsScript } : base.shortsScript,
        pinnedComment: d.pinnedComment ? { ...base.pinnedComment, ...d.pinnedComment } : base.pinnedComment,
        thumbnailConcept: d.thumbnailConcept ? { ...base.thumbnailConcept, ...d.thumbnailConcept } : base.thumbnailConcept,
        videoIdeas: Array.isArray(d.videoIdeas) && d.videoIdeas.length > 0 ? d.videoIdeas : base.videoIdeas,
        id: activePack.id,
        isSaved: activePack.isSaved,
        createdAt: activePack.createdAt,
        aiPowered: true,
        aiModelUsed: intelRes.model,
        qualityReport: {
          score: intelRes.qualityReport.score,
          passed: intelRes.qualityReport.passed,
          warnings: intelRes.qualityReport.warnings,
          attempts: intelRes.qualityReport.attempts,
          repaired: intelRes.qualityReport.repaired,
        },
        researchSources: intelRes.researchBrief?.sources.map((s) => ({
          title: s.title,
          url: s.url,
          retrievedAt: s.retrievedAt,
        })),
        personalizationApplied: intelRes.personalizationSummary.appliedConstraints,
      };

      setPacks((prev) => {
        const exists = prev.some((p) => p.id === activePack.id);
        const next = exists ? prev.map((p) => (p.id === activePack.id ? refreshedPack : p)) : [refreshedPack, ...prev];
        saveIsolatedContentPacks(next, currentAccount?.id);
        return next;
      });
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setPackByokError({
          code: err.code,
          message: err.message,
          pendingRequest: {
            topic: activePack.topic,
            platform: activePack.platform,
            language: activePack.language,
            tone: activePack.tone,
          },
        });
      } else {
        window.dispatchEvent(
          new CustomEvent('creatorflow_toast', {
            detail: {
              title: 'Regeneration Failed',
              message: err?.message || 'Unable to regenerate Content Pack with Gemini.',
              type: 'error',
            },
          })
        );
      }
    } finally {
      setIsGeneratingAiPack(false);
    }
  };

  const handleToggleSavePack = (packId: string) => {
    setPacks((prev) => {
      const next = prev.map((p) => {
        if (p.id === packId) {
          const nextSaved = !p.isSaved;
          setUser((u) => ({
            ...u,
            totalSavedPacks: Math.max(0, u.totalSavedPacks + (nextSaved ? 1 : -1)),
          }));
          return { ...p, isSaved: nextSaved };
        }
        return p;
      });
      saveIsolatedContentPacks(next, currentAccount?.id);
      return next;
    });
  };

  const handleRemoveSavedPack = (packId: string) => {
    setPacks((prev) => {
      const next = prev.filter((p) => p.id !== packId);
      saveIsolatedContentPacks(next, currentAccount?.id);
      return next;
    });
    setUser((prev) => ({
      ...prev,
      totalSavedPacks: Math.max(0, prev.totalSavedPacks - 1),
    }));
  };

  const handleUpdateUser = (updated: Partial<User>) => {
    setUser((prev) => {
      const merged = { ...prev, ...updated };
      if (typeof window !== 'undefined') {
        try {
          const accId = currentAccount?.id || getActiveAccountId();
          localStorage.setItem(
            getAccountScopedKey(accId, 'user_prefs'),
            JSON.stringify({
              name: merged.name,
              channelName: merged.channelName,
              channelUrl: merged.channelUrl,
              channelNiche: merged.channelNiche,
              defaultLanguage: merged.defaultLanguage,
              defaultTone: merged.defaultTone,
            })
          );
        } catch {
          // ignore
        }
      }
      return merged;
    });
    if (updated.defaultLanguage) {
      const matchLang = LANGUAGES.find((l) => l.name === updated.defaultLanguage);
      if (matchLang) setSelectedLanguage(matchLang);
    }
  };

  const handleSelectToolFromLanding = (toolId: string) => {
    setSelectedToolId(toolId);
    setCurrentView('tools');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToFullPackFromTools = (topic?: string, lang?: string, tone?: ToneType) => {
    if (topic && topic.trim()) {
      handleGeneratePack({
        topic: topic.trim(),
        platform: 'YouTube',
        language: lang || selectedLanguage.name,
        tone: tone || 'Viral',
      });
    } else {
      setCurrentView('content-pack');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRetakeOnboarding = () => {
    setCreatorProfile(getCreatorProfile());
    setCurrentView('onboarding');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartTour = () => {
    setIsWelcomeModalOpen(false);
    if (currentView !== 'dashboard') {
      setCurrentView('dashboard');
    }
    setIsGuidedTourOpen(true);
  };

  const handleSkipTour = async () => {
    setIsWelcomeModalOpen(false);
    await dismissWelcomeModal(currentAccount?.id);
  };

  const handleFinishTour = async () => {
    setIsGuidedTourOpen(false);
    await markTourCompleted(currentAccount?.id);
  };

  const handleCloseTour = () => {
    setIsGuidedTourOpen(false);
  };

  const handleReplayTour = async () => {
    await resetTourForReplay(currentAccount?.id);
    if (currentView !== 'dashboard') {
      setCurrentView('dashboard');
    }
    setIsGuidedTourOpen(true);
  };

  const activeSubscription = buildSubscriptionForPlan(currentAccount?.plan);
  const isLegalView = PUBLIC_LEGAL_VIEWS.has(currentView);
  const isStudioView =
    currentView !== 'landing' &&
    currentView !== 'onboarding' &&
    currentView !== 'guided-workflow' &&
    currentView !== 'admin' &&
    !isLegalView;

  if (authStatus === 'loading' && isProtectedView(currentView)) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] flex flex-col items-center justify-center p-4">
        <InteractiveDotField
          dotSpacing={16}
          dotSize={1.2}
          baseOpacity={0.14}
          interactionRadius={90}
          interactionStrength={22}
          returnSpeed={0.12}
        />
        <div className="bg-white p-8 rounded-2xl border border-black/[0.1] shadow-lg max-w-sm w-full text-center space-y-4 relative z-10 font-sans">
          <div className="w-8 h-8 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-serif text-lg font-medium text-[#1a1a1a]">Verifying CreatorFlow session…</h3>
          <p className="text-xs text-neutral-500 font-mono">Securing your private creator workspace</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] flex flex-col font-sans relative">
        {/* Interactive Matrix Dot Field Background */}
        <InteractiveDotField
          dotSpacing={16}
          dotSize={1.2}
          baseOpacity={0.14}
          interactionRadius={90}
          interactionStrength={22}
          returnSpeed={0.12}
        />

        {/* Universal Top Bar */}
        {currentView !== 'guided-workflow' && currentView !== 'admin' && (
          <Header
            currentView={currentView}
            onNavigate={handleNavigate}
            selectedLanguage={selectedLanguage.name}
            onSelectLanguage={setSelectedLanguage}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            user={currentAccount}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSignOut={handleSignOut}
            onStartTour={handleReplayTour}
          />
        )}

        {/* Studio Shell vs Guided Workflow vs Landing vs Onboarding */}
        {isStudioView ? (
          <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 lg:pb-12 relative z-10">
            {/* Desktop Left Sidebar */}
            <Sidebar
              currentView={currentView}
              onNavigate={handleNavigate}
              user={user}
              subscription={activeSubscription}
              creatorProfile={creatorProfile}
              activeProjectsCount={projects.length}
              onRetakeOnboarding={handleRetakeOnboarding}
              onStartTour={handleReplayTour}
            />

            {/* Main Studio Viewport */}
            <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-8 relative z-10">
              <Suspense fallback={<WorkspaceChunkFallback />}>
              {currentView === 'dashboard' && (
                (!creatorProfile.onboardingCompleted && !hasCompletedOnboarding() && !isWelcomeModalOpen && !isGuidedTourOpen) ? (
                  <OnboardingView
                    initialProfile={creatorProfile}
                    onComplete={(savedProfile) => {
                      setCreatorProfile(savedProfile);
                      saveCreatorProfile(savedProfile);
                      setCurrentView('dashboard');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      if (shouldShowWelcomeModal(currentAccount?.id)) {
                        setIsWelcomeModalOpen(true);
                      }
                    }}
                    onCancel={() => {
                      setCurrentView('dashboard');
                    }}
                  />
                ) : (
                  <DashboardView
                    user={user}
                    creatorProfile={creatorProfile}
                    projects={projects}
                    onNavigate={handleNavigate}
                    onOpenPack={handleOpenPack}
                    onGeneratePack={handleGeneratePack}
                    onBuildIdea={handleBuildIdea}
                    onOpenProject={handleOpenProject}
                    onOpenAnalytics={handleOpenAnalytics}
                    onStartGuidedWorkflow={handleStartGuidedWorkflow}
                    onRetakeOnboarding={() => {
                      setCurrentView('onboarding');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    recentPacks={packs}
                    onStartTour={handleReplayTour}
                  />
                )
              )}

              {currentView === 'radar' && (
                <RadarView
                  creatorProfile={creatorProfile}
                  projects={projects}
                  ideas={ideas}
                  analyticsList={getVideoAnalyticsList()}
                  onNavigate={handleNavigate}
                  onOpenProject={handleOpenProject}
                  onStartGuidedWorkflow={handleStartGuidedWorkflow}
                  onBuildIdea={handleBuildIdea}
                />
              )}

              {currentView === 'analytics' && (
                <AnalyticsView
                  creatorProfile={creatorProfile}
                  projects={projects}
                  onOpenProject={(projId) => handleOpenProject(projId)}
                  preselectedProjectId={analyticsPreselectedProjectId}
                  onClearPreselectedProject={() => setAnalyticsPreselectedProjectId(null)}
                />
              )}

              {currentView === 'situation-lab' && (
                <SituationLabView
                  creatorProfile={creatorProfile}
                  analyticsList={getVideoAnalyticsList()}
                  projects={projects}
                  onNavigate={handleNavigate}
                />
              )}

              {currentView === 'ideas' && (
                <IdeasView
                  ideas={ideas}
                  creatorProfile={creatorProfile}
                  onBuildIdea={handleBuildIdea}
                  onUpdateIdeaStatus={handleUpdateIdeaStatus}
                  onAnalyzeNewTopic={() => {
                    setCurrentView('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentView === 'builder' && (
                (() => {
                  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0];
                  if (!currentProject) {
                    return (
                      <div className="text-center py-16 space-y-4">
                        <h3 className="text-lg font-bold text-neutral-900">No project selected</h3>
                        <p className="text-xs text-neutral-500">Pick an idea from your dashboard or content planner to start building.</p>
                        <button
                          onClick={() => setCurrentView('dashboard')}
                          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold"
                        >
                          Go to Dashboard
                        </button>
                      </div>
                    );
                  }
                  return (
                    <VideoBuilderView
                      project={currentProject}
                      creatorProfile={creatorProfile}
                      onBack={() => {
                        setCurrentView('dashboard');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onOpenFullContentPack={(topic, platform) => {
                        handleGeneratePack({
                          topic,
                          platform: platform || 'YouTube',
                          language: creatorProfile.preferredLanguage || selectedLanguage.name,
                          tone: 'Educational',
                        });
                      }}
                      onUpdateProject={(updated) => {
                        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                      }}
                      onOpenAnalytics={handleOpenAnalytics}
                      onQuotaExceeded={() => handleNavigate('pricing')}
                    />
                  );
                })()
              )}

              {currentView === 'tools' && (
                <ToolsView
                  onGoToFullPack={handleGoToFullPackFromTools}
                  selectedToolId={selectedToolId}
                />
              )}

              {currentView === 'content-pack' && (
                <ContentPackView
                  pack={activePack}
                  isGenerating={isGeneratingAiPack}
                  byokError={packByokError}
                  onRetryPendingPack={() => {
                    if (packByokError?.pendingRequest) {
                      const req = packByokError.pendingRequest;
                      setPackByokError(null);
                      handleGeneratePack(req);
                    } else {
                      setPackByokError(null);
                      handleRegenerateActivePack();
                    }
                  }}
                  onUseLocalFallback={() => {
                    if (packByokError?.pendingRequest) {
                      handleGenerateLocalPackFallback(packByokError.pendingRequest);
                    }
                  }}
                  onBack={() => setCurrentView('dashboard')}
                  onSaveToggle={handleToggleSavePack}
                  onRegenerate={handleRegenerateActivePack}
                />
              )}

              {currentView === 'saved' && (
                <SavedView
                  packs={packs.filter((p) => p.isSaved)}
                  onOpenPack={handleOpenPack}
                  onRemovePack={handleRemoveSavedPack}
                  onNavigate={handleNavigate}
                />
              )}

              {currentView === 'history' && (
                <HistoryView
                  packs={packs}
                  onOpenPack={handleOpenPack}
                  onNavigate={handleNavigate}
                />
              )}

              {currentView === 'pricing' && <PricingView onNavigate={handleNavigate} />}

              {currentView === 'settings' && (
                <SettingsView
                  user={user}
                  subscription={activeSubscription}
                  creatorProfile={creatorProfile}
                  onUpdateUser={handleUpdateUser}
                  onNavigate={handleNavigate}
                  onRetakeOnboarding={handleRetakeOnboarding}
                />
              )}
              </Suspense>
            </main>
          </div>
        ) : currentView === 'admin' ? (
          /* CreatorFlow Owner & Product Intelligence Console */
          <main className="flex-1 relative z-10">
            <Suspense fallback={<WorkspaceChunkFallback />}>
              <OwnerDashboardShell
                onExitOwner={() => handleNavigate('dashboard')}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            </Suspense>
          </main>
        ) : currentView === 'guided-workflow' && guidedWorkflowState ? (
          /* Guided Creator Workflow (Full Viewport Journey) */
          <main className="flex-1 relative z-10">
            <Suspense fallback={<WorkspaceChunkFallback />}>
              <GuidedWorkflowShell
                initialState={guidedWorkflowState}
                creatorProfile={creatorProfile}
                onExit={handleExitGuidedWorkflow}
                onComplete={handleCompleteGuidedWorkflow}
              />
            </Suspense>
          </main>
        ) : currentView === 'onboarding' ? (
          /* Onboarding View (Full Width Focused Experience) */
          <main className="flex-1 pb-16 relative z-10">
            <Suspense fallback={<WorkspaceChunkFallback />}>
              <OnboardingView
                initialProfile={creatorProfile}
                onComplete={(savedProfile) => {
                  setCreatorProfile(savedProfile);
                  saveCreatorProfile(savedProfile);
                  setCurrentView('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onCancel={() => {
                  setCurrentView('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </Suspense>
          </main>
        ) : isLegalView ? (
          /* Public Legal & Support Pages */
          <main className="flex-1 pb-16 relative z-10">
            <Suspense fallback={<WorkspaceChunkFallback />}>
              <LegalSupportView
                page={currentView as LegalPageId}
                onNavigate={handleNavigate}
              />
            </Suspense>
          </main>
        ) : (
          /* Landing View (Full Width) */
          <main className="flex-1 pb-16 relative z-10">
            <LandingView
              onNavigate={handleNavigate}
              onSelectTool={handleSelectToolFromLanding}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              user={currentAccount}
            />
          </main>
        )}

        {/* Editorial Minimal Footer */}
        {currentView !== 'guided-workflow' && currentView !== 'admin' && (
          <footer className="bg-[#f8f7f4]/90 backdrop-blur-xs border-t border-black/[0.06] py-8 px-4 sm:px-6 font-mono text-[11px] text-[#1a1a1a]/60 relative z-10">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 tracking-wider">
                <span className="font-bold text-[#1a1a1a]">CREATORFLOW AI</span>
                <span>&bull;</span>
                <span>CREATOR STRATEGY &amp; PRODUCTION WORKSPACE</span>
              </div>
              <div className="flex items-center gap-6 tracking-widest text-[10px]">
                <button onClick={() => handleNavigate('dashboard')} className="hover:text-[#1a1a1a] transition-colors">
                  DASHBOARD
                </button>
                <button onClick={() => handleNavigate('radar')} className="hover:text-[#1a1a1a] transition-colors">
                  RADAR
                </button>
                <button onClick={() => handleNavigate('tools')} className="hover:text-[#1a1a1a] transition-colors">
                  TOOLS
                </button>
                <button onClick={() => handleNavigate('analytics')} className="hover:text-[#1a1a1a] transition-colors">
                  ANALYTICS
                </button>
                <button onClick={() => handleNavigate('pricing')} className="hover:text-[#1a1a1a] transition-colors">
                  PRICING
                </button>
                <button onClick={() => handleNavigate('settings')} className="hover:text-[#1a1a1a] transition-colors">
                  SETTINGS
                </button>
                {isAuthorizedOwner(currentAccount) && (
                  <button 
                    onClick={() => handleNavigate('admin')} 
                    className="hover:text-[#1a1a1a] transition-colors text-amber-700 hover:text-amber-900 font-bold"
                    title="Owner Analytics Console"
                  >
                    OWNER ANALYTICS
                  </button>
                )}
              </div>
            </div>
          </footer>
        )}

        {/* Responsive Mobile Bottom Navigation */}
        {isStudioView && (
          <MobileNav
            currentView={currentView}
            onNavigate={handleNavigate}
          />
        )}

        {/* Auth Modal with Google Sign In & Local Data Migration */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          onNavigate={handleNavigate}
        />

        {/* Feature & Route Gating Auth Modal */}
        <AuthGatedModal
          isOpen={isAuthGateModalOpen}
          onClose={() => {
            setIsAuthGateModalOpen(false);
            setPendingDestinationView(null);
          }}
          onSuccess={handleAuthSuccess}
          featureTitle={authGateFeatureInfo.title}
          featureDescription={authGateFeatureInfo.description}
        />

        {/* First-Login Welcome Tour Modal */}
        <WelcomeTourModal
          isOpen={isWelcomeModalOpen}
          onStartTour={handleStartTour}
          onSkipTour={handleSkipTour}
        />

        {/* Interactive Step-by-Step Guided Tour */}
        <InteractiveGuidedTour
          isOpen={isGuidedTourOpen}
          currentView={currentView}
          onNavigate={handleNavigate}
          onClose={handleCloseTour}
          onFinish={handleFinishTour}
          userPlan={currentAccount?.plan}
        />

        {/* CreatorFlow AI Assistant (Universal Floating Companion - Requires Signed In Account) */}
        {currentView !== 'admin' && isAuthenticated && (
          <CreatorFlowAssistant
            currentPage={currentView}
            creatorProfile={creatorProfile}
            workflowState={guidedWorkflowState}
            activeProject={projects.find((p) => p.id === activeProjectId) || projects[0] || null}
            activeIdea={ideas[0] || null}
            ideas={ideas}
            projects={projects}
            analyticsList={getVideoAnalyticsList()}
          />
        )}
      </div>
    </ToastProvider>
  );
}
