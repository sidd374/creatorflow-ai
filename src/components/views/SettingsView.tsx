import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Globe, 
  BarChart3, 
  Crown, 
  Sliders, 
  Shield, 
  Check, 
  Save, 
  ExternalLink,
  CheckCircle2,
  Key
} from 'lucide-react';
import { ByokGeminiSettingsPanel } from '../settings/ByokGeminiSettingsPanel';
import { consumePendingByokSettingsTab } from '../../lib/intelligenceClient';
import { User, Subscription, Language, CreatorProfile } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardContent } from '../ui/Card';
import { LanguageSelector } from '../common/LanguageSelector';
import { LANGUAGES } from '../../data/languages';
import { useToast } from '../ui/Toast';
import { resetCreatorProfile, getCreatorProfile, saveCreatorProfile } from '../../lib/creatorStorage';
import {
  clearAllAccountWorkspaceData,
  getActiveAccountId,
  getAccountScopedKey,
} from '../../lib/accountStorage';
import { 
  getStoredPlan, 
  PLAN_DEFINITIONS, 
  getUsageCounters, 
  getLimit, 
  PlanId 
} from '../../lib/planEntitlements';
import { DevPlanSwitcher } from '../common/DevPlanSwitcher';
import { isAuthorizedOwner, getCurrentAccount, linkAccountProvider, deleteCurrentAccount, AuthProvider } from '../../lib/auth';
import {
  getOrCreatePersonalizationProfile,
  setPersonalizationEnabled,
  resetPersonalizationProfile,
} from '../../lib/autonomousEngine/personalizationEngine';

interface SettingsViewProps {
  user: User;
  subscription: Subscription;
  creatorProfile?: CreatorProfile;
  onUpdateUser: (updated: Partial<User>) => void;
  onNavigate: (view: string) => void;
  onRetakeOnboarding?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  subscription,
  creatorProfile,
  onUpdateUser,
  onNavigate,
  onRetakeOnboarding,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ai-key' | 'language' | 'usage' | 'subscription' | 'appearance' | 'account' | 'readiness'>(() =>
    consumePendingByokSettingsTab() ? 'ai-key' : 'profile'
  );
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    channelName: user.channelName,
    channelUrl: user.channelUrl,
    channelNiche: user.channelNiche,
    defaultLanguage: user.defaultLanguage,
  });
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('creatorflow_ui_density') === 'compact' ? 'compact' : 'comfortable';
    }
    return 'comfortable';
  });
  const [dialectMode, setDialectMode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem(getAccountScopedKey(getActiveAccountId(), 'dialect_mode')) ||
        'Native Script + Romanized Mix (Tanglish / Hinglish)'
      );
    }
    return 'Native Script + Romanized Mix (Tanglish / Hinglish)';
  });
  const [personalizationTick, setPersonalizationTick] = useState(0);
  const [pendingDangerAction, setPendingDangerAction] = useState<'reset_profile' | 'clear_library' | 'delete_account' | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('cf-density-compact', density === 'compact');
      try {
        localStorage.setItem('creatorflow_ui_density', density);
      } catch {
        // ignore
      }
    }
  }, [density]);

  React.useEffect(() => {
    const openByok = () => {
      consumePendingByokSettingsTab();
      setActiveTab('ai-key');
    };
    window.addEventListener('creatorflow_open_byok_settings', openByok);
    return () => window.removeEventListener('creatorflow_open_byok_settings', openByok);
  }, []);

  React.useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      channelName: user.channelName,
      channelUrl: user.channelUrl,
      channelNiche: user.channelNiche,
      defaultLanguage: user.defaultLanguage,
    });
  }, [user.name, user.email, user.channelName, user.channelUrl, user.channelNiche, user.defaultLanguage]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name: formData.name,
      channelName: formData.channelName,
      channelUrl: formData.channelUrl,
      channelNiche: formData.channelNiche,
      defaultLanguage: formData.defaultLanguage,
    });
    const currentProf = creatorProfile || getCreatorProfile();
    saveCreatorProfile({
      ...currentProf,
      channelTopic: formData.channelNiche || currentProf.channelTopic,
      niche: formData.channelNiche || currentProf.niche,
      preferredLanguage: formData.defaultLanguage || currentProf.preferredLanguage,
    });
    toast('Settings Saved', 'Your creator preferences have been updated.', 'success');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'ai-key', label: 'Gemini API (BYOK)', icon: <Key className="w-4 h-4 text-[#d4a017]" /> },
    { id: 'language', label: 'Language', icon: <Globe className="w-4 h-4" /> },
    { id: 'usage', label: 'Usage', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'subscription', label: 'Subscription', icon: <Crown className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Sliders className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <Shield className="w-4 h-4" /> },
    { id: 'readiness', label: 'Workspace Health', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="pb-4 border-b border-black/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
            Studio Configuration
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-sans">
          Manage your creator channel identity, output languages, subscription and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Tabs */}
        <div className="space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#1a1a1a] text-[#f8f7f4] font-semibold shadow-xs'
                    : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/[0.04]'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-neutral-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3">
          <Card className="bg-white border-black/[0.08] shadow-xs rounded-lg">
            <CardContent className="p-6 sm:p-8">
              {activeTab === 'ai-key' && <ByokGeminiSettingsPanel />}

              {/* 1. PROFILE */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">Creator Profile</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Your channel context helps calibrate the tone of future generations.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pb-4 border-b border-neutral-100">
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-neutral-200"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <div className="text-sm font-bold text-neutral-900">{formData.name}</div>
                      <div className="text-xs text-neutral-400 font-mono">{formData.email}</div>
                      <span className="text-[11px] text-neutral-500 mt-1 block">
                        Verified Creator Profile
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Creator Display Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                      label="YouTube Channel Name"
                      value={formData.channelName}
                      onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="YouTube Channel URL"
                      value={formData.channelUrl}
                      onChange={(e) => setFormData({ ...formData, channelUrl: e.target.value })}
                    />
                    <Input
                      label="Channel Niche / Category"
                      value={formData.channelNiche}
                      onChange={(e) => setFormData({ ...formData, channelNiche: e.target.value })}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      Save Profile Changes
                    </Button>
                  </div>

                  {creatorProfile && (
                    <div className="mt-8 pt-6 border-t border-neutral-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-neutral-900">Your Current Creator Plan</h3>
                          <p className="text-xs text-neutral-500">
                            Derived from your onboarding questions. Used to power your CreatorFit recommendation score.
                          </p>
                        </div>
                        {onRetakeOnboarding && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onRetakeOnboarding}
                            className="text-xs"
                          >
                            Retake Onboarding
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80">
                          <div className="text-[10px] text-neutral-400 font-semibold uppercase">Stage</div>
                          <div className="font-bold text-neutral-900 mt-0.5">{creatorProfile.creatorStage}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80">
                          <div className="text-[10px] text-neutral-400 font-semibold uppercase">Primary Goal</div>
                          <div className="font-bold text-neutral-900 mt-0.5 truncate">{creatorProfile.primaryGoal}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80">
                          <div className="text-[10px] text-neutral-400 font-semibold uppercase">Timeline</div>
                          <div className="font-bold text-neutral-900 mt-0.5">{creatorProfile.goalTimeline}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80">
                          <div className="text-[10px] text-neutral-400 font-semibold uppercase">Daily Time</div>
                          <div className="font-bold text-neutral-900 mt-0.5">{creatorProfile.dailyTimeAvailable}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80">
                          <div className="text-[10px] text-neutral-400 font-semibold uppercase">Tool Budget</div>
                          <div className="font-bold text-neutral-900 mt-0.5">{creatorProfile.monthlyBudget}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80">
                          <div className="text-[10px] text-neutral-400 font-semibold uppercase">Creator Style</div>
                          <div className="font-bold text-neutral-900 mt-0.5 truncate">{creatorProfile.creatorStyle}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* 2. LANGUAGE */}
              {activeTab === 'language' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">Language System Preferences</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Configure your default generation dialect, Romanization style, and interface language.
                    </p>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <LanguageSelector
                      label="Default Generation Language (20 Supported)"
                      selectedLanguage={formData.defaultLanguage}
                      onSelectLanguage={(l) => {
                        setFormData({ ...formData, defaultLanguage: l.name });
                        onUpdateUser({ defaultLanguage: l.name });
                        const currentProf = creatorProfile || getCreatorProfile();
                        saveCreatorProfile({
                          ...currentProf,
                          preferredLanguage: l.name,
                        });
                        toast('Language Updated', `Default generation language set to ${l.name}.`, 'success');
                      }}
                      variant="popover"
                      className="w-full"
                    />

                    <div>
                      <label htmlFor="dialect-mode-select" className="text-xs font-semibold text-neutral-700 block mb-1.5">
                        Indian Regional Dialect Mode
                      </label>
                      <select
                        id="dialect-mode-select"
                        value={dialectMode}
                        onChange={(e) => {
                          const nextMode = e.target.value;
                          setDialectMode(nextMode);
                          try {
                            localStorage.setItem(getAccountScopedKey(getActiveAccountId(), 'dialect_mode'), nextMode);
                          } catch {
                            // ignore
                          }
                          toast('Dialect Mode Saved', `Generation framing set to "${nextMode}".`, 'success');
                        }}
                        className="w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      >
                        <option value="Native Script + Romanized Mix (Tanglish / Hinglish)">Native Script + Romanized Mix (Tanglish / Hinglish)</option>
                        <option value="Pure Native Script Only">Pure Native Script Only</option>
                        <option value="Pure English Only">Pure English Only</option>
                      </select>
                      <span className="text-[11px] text-neutral-400 mt-1 block">
                        Tanglish uses Roman English letters to express colloquial Tamil for high YouTube CTR.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. USAGE */}
              {activeTab === 'usage' && (() => {
                const currentPlan = getStoredPlan();
                const usage = getUsageCounters();
                const kitLimit = getLimit('creationKitsPerMonth', currentPlan);
                const projectsLimit = getLimit('activeProjects', currentPlan);
                const channelsLimit = getLimit('channels', currentPlan);

                return (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">Usage & Entitlement Metrics</h2>
                      <p className="text-xs text-neutral-500 mt-0.5 font-sans">
                        Real-time tracking of your verified studio usage counters for the current billing cycle.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border border-black/[0.08] bg-[#f8f7f4]">
                        <span className="text-xs text-neutral-500 font-mono uppercase">Creation Kits (Monthly)</span>
                        <div className="text-2xl font-serif font-normal text-[#1a1a1a] mt-1">
                          {usage.creationKitsUsed} / {kitLimit === 'unlimited' ? '∞' : kitLimit}
                        </div>
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden mt-3">
                          <div
                            className="h-full bg-[#1a1a1a] rounded-full"
                            style={{ width: `${kitLimit === 'unlimited' ? 10 : Math.min(100, (usage.creationKitsUsed / (kitLimit as number)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono mt-2 block">
                          Cycle: {usage.month}
                        </span>
                      </div>

                      <div className="p-4 rounded-lg border border-black/[0.08] bg-[#f8f7f4]">
                        <span className="text-xs text-neutral-500 font-mono uppercase">Active Project Slots</span>
                        <div className="text-2xl font-serif font-normal text-[#1a1a1a] mt-1">
                          {usage.projectsCreated} / {projectsLimit}
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono mt-2 block">
                          Concurrent active blueprints
                        </span>
                      </div>

                      <div className="p-4 rounded-lg border border-black/[0.08] bg-[#f8f7f4]">
                        <span className="text-xs text-neutral-500 font-mono uppercase">Channel Slots</span>
                        <div className="text-2xl font-serif font-normal text-[#1a1a1a] mt-1">
                          1 / {channelsLimit}
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono mt-2 block">
                          Calibrated YouTube profiles
                        </span>
                      </div>
                    </div>

                    {currentPlan === 'free' && (
                      <div className="p-4 rounded-lg border border-[#ded8cd] bg-[#eeeae3] flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-serif font-bold text-[#1a1a1a]">Need more Creation Kits & Strategy depth?</h4>
                          <p className="text-xs text-neutral-600 mt-0.5 font-sans">
                            Upgrade to Creator (₹499/mo) for 75 Creation Kits, tool-aware workflows, and series planning.
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onNavigate('pricing')}
                          className="text-xs font-mono uppercase shrink-0"
                        >
                          View Plans
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 4. SUBSCRIPTION */}
              {activeTab === 'subscription' && (() => {
                const currentPlan = getStoredPlan();
                const planMeta = PLAN_DEFINITIONS[currentPlan];

                return (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">Current Subscription</h2>
                      <p className="text-xs text-neutral-500 mt-0.5 font-sans">
                        Active entitlement details, included workflows, and developer plan switching.
                      </p>
                    </div>

                    <div className="p-6 rounded-lg border border-black/[0.08] bg-[#f8f7f4] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                              Active Tier
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-[#eeeae3] text-[#1a1a1a] rounded font-semibold border border-[#ded8cd]">
                              {planMeta.badge}
                            </span>
                          </div>
                          <div className="text-3xl font-serif font-normal text-[#1a1a1a] mt-0.5">
                            CreatorFlow {planMeta.name}
                          </div>
                          <div className="text-xs text-[#d4a017] font-mono font-semibold mt-0.5">
                            {planMeta.position}
                          </div>
                        </div>
                        <span className="text-base font-serif font-normal text-[#1a1a1a] bg-white px-3.5 py-1.5 rounded border border-black/[0.08] shadow-xs font-mono">
                          ₹{planMeta.priceMonthly}/mo
                        </span>
                      </div>

                      <p className="text-xs text-neutral-600 font-sans leading-relaxed">
                        {planMeta.tagline}
                      </p>

                      <div className="pt-3 border-t border-black/[0.06]">
                        <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 block mb-2 font-semibold">
                          Included Entitlements:
                        </span>
                        <ul className="space-y-1.5 text-xs text-neutral-700 font-sans">
                          {planMeta.highlights.map((f: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <Check className="w-3.5 h-3.5 text-[#d4a017] shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onNavigate('pricing')}
                          className="text-xs font-mono uppercase tracking-wider shadow-xs"
                        >
                          {currentPlan === 'max' ? 'Manage Plan' : 'Upgrade Plan'}
                        </Button>
                        <span className="text-xs text-neutral-400 font-mono">
                          Local-First Entitlement Architecture
                        </span>
                      </div>
                    </div>

                    {/* Developer Plan Switcher */}
                    <div className="pt-2">
                      <DevPlanSwitcher />
                    </div>
                  </div>
                );
              })()}

              {/* 5. APPEARANCE */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">Appearance & Typography</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      CreatorFlow is strictly calibrated for maximum daylight clarity with a crisp white UI.
                    </p>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                        UI Theme Mode
                      </label>
                      <div className="p-3 bg-neutral-100 rounded-xl text-xs font-medium text-neutral-800 flex items-center justify-between">
                        <span>Modern Minimalist Light (Strict)</span>
                        <span className="text-[11px] font-mono text-neutral-400">Fixed</span>
                      </div>
                      <span className="text-[11px] text-neutral-400 mt-1 block">
                        Crafted specifically for crisp reading contrast, zero eye fatigue, and creator focus.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                        Layout Density
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDensity('comfortable');
                            toast('Layout Updated', 'Switched studio spacing to Spacious mode.', 'info');
                          }}
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                            density === 'comfortable'
                              ? 'border-neutral-900 bg-white shadow-xs'
                              : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                          }`}
                        >
                          <div>Spacious</div>
                          <div className="text-[11px] text-neutral-400 font-normal">Standard editorial spacing</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDensity('compact');
                            toast('Layout Updated', 'Switched studio spacing to Compact mode.', 'info');
                          }}
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                            density === 'compact'
                              ? 'border-neutral-900 bg-white shadow-xs'
                              : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                          }`}
                        >
                          <div>Compact</div>
                          <div className="text-[11px] text-neutral-400 font-normal">Higher data density</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. ACCOUNT */}
              {activeTab === 'account' && (() => {
                const currentAccount = getCurrentAccount();
                const linkedList = currentAccount?.linkedProviders || (currentAccount?.provider ? [currentAccount.provider] : []);
                const hasGoogle = linkedList.includes('google');
                const hasMicrosoft = linkedList.includes('microsoft');

                const handleLinkProvider = async (providerToLink: AuthProvider) => {
                  try {
                    await linkAccountProvider(providerToLink);
                    toast('Provider Linked', `Successfully linked ${providerToLink === 'microsoft' ? 'Microsoft' : 'Google'} identity to your CreatorFlow account.`, 'success');
                  } catch (err: any) {
                    toast('Provider Link Failed', err.message || 'Could not link provider.', 'error');
                  }
                };

                return (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-neutral-900">Account Security &amp; Identity</h2>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Verified account identity, linked OAuth providers, and workspace controls.
                      </p>
                    </div>

                    <div className="space-y-4 max-w-lg">
                      {currentAccount ? (
                        <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/70 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500 font-medium">Account ID</span>
                            <code className="font-mono text-[11px] text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">
                              {currentAccount.id}
                            </code>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500 font-medium">Verified Email</span>
                            <span className="font-mono text-neutral-900 font-semibold">{currentAccount.email}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500 font-medium">Primary Provider</span>
                            <span className="font-mono uppercase text-[11px] font-semibold text-emerald-700">
                              {currentAccount.provider}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500 font-medium">Role Authority</span>
                            <span className="font-mono uppercase text-[11px] font-semibold text-neutral-800">
                              {currentAccount.role || 'user'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900">
                          You are currently using an unauthenticated local session. Sign in with Google or Microsoft from the top bar to bind your workspace to a verified CreatorFlow account.
                        </div>
                      )}

                      {currentAccount && (
                        <div className="pt-2 space-y-2.5">
                          <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                            Linked Authentication Providers
                          </h4>
                          <p className="text-[11px] text-neutral-500">
                            Link both Google and Microsoft to sign in seamlessly with either provider to the same CreatorFlow account.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-3 rounded-lg border border-neutral-200 bg-white flex items-center justify-between">
                              <div>
                                <div className="text-xs font-semibold text-neutral-900">Google OAuth</div>
                                <div className="text-[10px] text-neutral-500">
                                  {hasGoogle ? 'Connected & Verified' : 'Not linked'}
                                </div>
                              </div>
                              {hasGoogle ? (
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                  Linked
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLinkProvider('google')}
                                  className="text-[11px]"
                                >
                                  Link Google
                                </Button>
                              )}
                            </div>

                            <div className="p-3 rounded-lg border border-neutral-200 bg-white flex items-center justify-between">
                              <div>
                                <div className="text-xs font-semibold text-neutral-900">Microsoft OAuth</div>
                                <div className="text-[10px] text-neutral-500">
                                  {hasMicrosoft ? 'Connected & Verified' : 'Not linked'}
                                </div>
                              </div>
                              {hasMicrosoft ? (
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                  Linked
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLinkProvider('microsoft')}
                                  className="text-[11px]"
                                >
                                  Link Microsoft
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Personalization & Privacy Controls */}
                      {(() => {
                        const accountId = getActiveAccountId();
                        const pProfile = getOrCreatePersonalizationProfile(accountId);
                        const isEnabled = pProfile.enabled !== false;
                        const signalCount = pProfile.totalGenerationsEvaluated || 0;
                        const implicitCount = pProfile.implicitSignalsCount || 0;
                        void personalizationTick;

                        return (
                          <div className="pt-6 border-t border-neutral-100 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                                  Personalization &amp; Privacy
                                </h4>
                                <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                                  CreatorFlow tunes strategy rankings locally using only aggregate strategy weights ({signalCount} signals recorded, {implicitCount} implicit). Raw scripts, video topics, and private prompts are never stored inside personalization profiles.
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold shrink-0 border ${
                                  isEnabled
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                }`}
                              >
                                {isEnabled ? 'Active' : 'Paused'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPersonalizationEnabled(accountId, !isEnabled);
                                  setPersonalizationTick((t) => t + 1);
                                  toast(
                                    !isEnabled ? 'Personalization Resumed' : 'Personalization Paused',
                                    !isEnabled
                                      ? 'CreatorFlow will resume tuning strategy rankings based on your preferences.'
                                      : 'Personalization paused. Outputs now use balanced baseline weights.',
                                    'info'
                                  );
                                }}
                                className="text-xs bg-white"
                              >
                                {isEnabled ? 'Pause Personalization' : 'Resume Personalization'}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  resetPersonalizationProfile(accountId);
                                  setPersonalizationTick((t) => t + 1);
                                  toast(
                                    'Personalization Reset',
                                    'All learned strategy weights and signal counts have been reset to baseline defaults.',
                                    'info'
                                  );
                                }}
                                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                              >
                                Reset Learned Weights
                              </Button>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="pt-6 border-t border-neutral-100">
                        <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
                          Danger Zone
                        </h4>
                        <p className="text-xs text-neutral-500 mb-3">
                          Reset your creator profile to run onboarding from scratch, purge saved workspace data, or permanently delete your account.
                        </p>
                        {pendingDangerAction ? (
                          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 space-y-3">
                            <p className="text-xs font-medium text-rose-900">
                              {pendingDangerAction === 'reset_profile'
                                ? 'Confirm resetting your creator profile? Your onboarding preferences will be restored to defaults and you will return to onboarding.'
                                : pendingDangerAction === 'clear_library'
                                ? 'Confirm purging all saved workspace data for this account? Saved content packs, projects, ideas, and local analytics for the active account will be permanently removed.'
                                : 'Permanently delete your CreatorFlow AI account and all associated cloud and local workspace data? This action cannot be undone. Type DELETE below to confirm.'}
                            </p>
                            {pendingDangerAction === 'delete_account' && (
                              <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                                aria-label="Type DELETE to confirm permanent account deletion"
                                className="w-full max-w-xs rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-mono text-neutral-900 focus:border-rose-600 focus:outline-none"
                              />
                            )}
                            <div className="flex flex-wrap items-center gap-2.5">
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                disabled={
                                  (pendingDangerAction === 'delete_account' && deleteConfirmText.trim() !== 'DELETE') ||
                                  isDeletingAccount
                                }
                                onClick={async () => {
                                  if (pendingDangerAction === 'reset_profile') {
                                    resetCreatorProfile();
                                    window.dispatchEvent(new CustomEvent('creatorflow_profile_reset'));
                                    setPendingDangerAction(null);
                                    toast('Profile Reset', 'Creator profile has been reset. Returning to onboarding.', 'info');
                                    if (onRetakeOnboarding) {
                                      onRetakeOnboarding();
                                    } else {
                                      onNavigate('onboarding');
                                    }
                                  } else if (pendingDangerAction === 'clear_library') {
                                    clearAllAccountWorkspaceData();
                                    window.dispatchEvent(new CustomEvent('creatorflow_workspace_cleared'));
                                    window.dispatchEvent(new CustomEvent('creatorflow_packs_cleared'));
                                    setPendingDangerAction(null);
                                    toast(
                                      'Workspace Data Purged',
                                      'All saved packs, projects, ideas, and local analytics for this account have been cleared.',
                                      'info'
                                    );
                                  } else if (pendingDangerAction === 'delete_account') {
                                    setIsDeletingAccount(true);
                                    try {
                                      const res = await deleteCurrentAccount();
                                      window.dispatchEvent(new CustomEvent('creatorflow_workspace_cleared'));
                                      window.dispatchEvent(new CustomEvent('creatorflow_packs_cleared'));
                                      setPendingDangerAction(null);
                                      setDeleteConfirmText('');
                                      toast('Account Deleted', res.message, 'info');
                                      onNavigate('landing');
                                    } catch (err: any) {
                                      toast('Account Deletion Failed', err?.message || 'Unable to delete account right now.', 'error');
                                    } finally {
                                      setIsDeletingAccount(false);
                                    }
                                  }
                                }}
                                className="text-xs"
                              >
                                {pendingDangerAction === 'reset_profile'
                                  ? 'Confirm Profile Reset'
                                  : pendingDangerAction === 'clear_library'
                                  ? 'Confirm Purge Workspace Data'
                                  : isDeletingAccount
                                  ? 'Deleting Account...'
                                  : 'Permanently Delete Account'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isDeletingAccount}
                                onClick={() => {
                                  setPendingDangerAction(null);
                                  setDeleteConfirmText('');
                                }}
                                className="text-xs bg-white"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => setPendingDangerAction('reset_profile')}
                              className="text-xs"
                            >
                              Reset Profile &amp; Retake Onboarding
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPendingDangerAction('clear_library')}
                              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              Clear Saved Library
                            </Button>
                            {currentAccount && (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setDeleteConfirmText('');
                                  setPendingDangerAction('delete_account');
                                }}
                                className="text-xs bg-rose-700 hover:bg-rose-800 text-white"
                              >
                                Delete Account Permanently
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 7. WORKSPACE HEALTH & STANDARDS */}
              {activeTab === 'readiness' && (
                <div className="space-y-6 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active &amp; Verified
                        </span>
                        <h2 className="text-base font-bold text-neutral-900">Workspace Health &amp; Standards</h2>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Overview of active studio capabilities, data isolation, and creator privacy protections.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Core Lifecycle Modules */}
                    <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 space-y-3">
                      <div className="font-bold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Core Lifecycle Modules</span>
                      </div>
                      <div className="space-y-2 text-neutral-700 text-xs">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Onboarding & Profile</strong> · Persists locally, handles zero-budget creators</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Strategy Dashboard</strong> · Next Best Video, Multi-language topic analyzer</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Content Planner & Ideas</strong> · CreatorFit scoring, non-destructive status</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Video Builder (10 Steps)</strong> · Script, visuals, voice, editing, tools, publishing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Tool Recommendations</strong> · 10 categories, ₹0 free-first stacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Publishing Studio</strong> · Titles, descriptions, keywords, hashtags, thumbnails, chapters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Manual Analytics</strong> · Real YouTube Studio entries, personal channel baseline</span>
                        </div>
                      </div>
                    </div>

                    {/* Reliability & Privacy Standards */}
                    <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 space-y-3">
                      <div className="font-bold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Reliability & Privacy Standards</span>
                      </div>
                      <div className="space-y-2 text-neutral-700 text-xs">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Zero Telemetry</strong> · No fake analytics or external channel scraping</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Defensive Storage</strong> · LocalStorage corruption protection and safe fallback</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Isolated Demo Data</strong> · Demo analytics tagged and removable with 1 click</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Comparative Insights</strong> · Replaced unsupported claims with channel baselines</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Missing Metrics Safety</strong> · Unentered numbers display as "—", never fake 0%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Lightweight Architecture</strong> · 100% browser-based, zero heavy external models</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-100 rounded-xl flex items-center justify-between text-neutral-600">
                    <span className="font-mono text-[11px]">Workspace Integrity: Online</span>
                    <span className="font-semibold text-neutral-900">Privacy &amp; Safety Checks Active ✓</span>
                  </div>

                  {isAuthorizedOwner() && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                      <div>
                        <span className="font-semibold text-xs text-amber-950 block">Owner Analytics & Product Intelligence</span>
                        <span className="text-[11px] text-amber-800 block">Authorized owner console: conversion funnels, registered accounts, and platform telemetry.</span>
                      </div>
                      <button
                        onClick={() => onNavigate('admin')}
                        className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-xs shrink-0"
                      >
                        Open Owner Dashboard
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
