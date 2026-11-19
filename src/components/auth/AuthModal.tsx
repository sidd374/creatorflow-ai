import React, { useState } from 'react';
import { X, Sparkles, ShieldCheck, Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';
import { MicrosoftSignInButton } from './MicrosoftSignInButton';
import { 
  signInWithGoogle, 
  signInWithMicrosoft,
  hasExistingLocalData, 
  hasPromptedMigration,
  handleLocalDataMigrationChoice, 
  CreatorFlowUser 
} from '../../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CreatorFlowUser, isNewAccount?: boolean) => void;
  onNavigate?: (view: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, onNavigate }) => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'microsoft' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<{ user: CreatorFlowUser; isNewAccount: boolean } | null>(null);
  const [showMigrationStep, setShowMigrationStep] = useState(false);

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    if (loadingProvider) return;
    setLoadingProvider('google');
    setErrorMessage(null);
    try {
      const { user, isNewAccount } = await signInWithGoogle();
      if (hasExistingLocalData() && !hasPromptedMigration()) {
        setPendingUser({ user, isNewAccount });
        setShowMigrationStep(true);
      } else {
        onSuccess(user, isNewAccount);
        onClose();
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setErrorMessage(err.message || 'Google sign-in encountered an issue. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleMicrosoftClick = async () => {
    if (loadingProvider) return;
    setLoadingProvider('microsoft');
    setErrorMessage(null);
    try {
      const { user, isNewAccount } = await signInWithMicrosoft();
      if (hasExistingLocalData() && !hasPromptedMigration()) {
        setPendingUser({ user, isNewAccount });
        setShowMigrationStep(true);
      } else {
        onSuccess(user, isNewAccount);
        onClose();
      }
    } catch (err: any) {
      console.error('Microsoft sign-in error:', err);
      setErrorMessage(err.message || 'Microsoft sign-in encountered an issue. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleMigrationDecision = (choice: 'keep' | 'fresh') => {
    handleLocalDataMigrationChoice(choice);
    if (pendingUser) {
      onSuccess(pendingUser.user, pendingUser.isNewAccount);
    }
    setShowMigrationStep(false);
    setPendingUser(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-black/[0.12] shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 relative font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.05] rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {!showMigrationStep ? (
          /* STEP 1: Sign in with Google or Microsoft */
          <div className="space-y-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] text-[#d4a017] flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block">
                CreatorFlow Account
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
                Welcome to CreatorFlow
              </h2>
              <p className="text-xs text-neutral-500 font-sans max-w-xs mx-auto">
                Build better YouTube content, faster.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <GoogleSignInButton
                onClick={handleGoogleClick}
                isLoading={loadingProvider === 'google'}
                className="w-full justify-center py-3"
                size="md"
              />

              <MicrosoftSignInButton
                onClick={handleMicrosoftClick}
                isLoading={loadingProvider === 'microsoft'}
                className="w-full justify-center py-3"
                size="md"
              />
            </div>

            <div className="pt-4 border-t border-black/[0.06] space-y-2 text-[11px] text-neutral-500 font-sans">
              <div className="flex items-center justify-center gap-1.5 text-neutral-600 flex-wrap">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  By continuing, you agree to CreatorFlow&apos;s{' '}
                  {onNavigate ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate('terms');
                        }}
                        className="underline text-[#1a1a1a] hover:text-[#d4a017] cursor-pointer"
                      >
                        Terms
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate('privacy');
                        }}
                        className="underline text-[#1a1a1a] hover:text-[#d4a017] cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                    </>
                  ) : (
                    'Terms and Privacy Policy'
                  )}
                  .
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: Existing Local Data Migration */
          <div className="space-y-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#eeeae3] text-[#1a1a1a] flex items-center justify-center mx-auto border border-[#ded8cd]">
              <Database className="w-6 h-6 text-[#d4a017]" />
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[10px] tracking-widest text-emerald-600 uppercase font-semibold block">
                Local Data Found
              </span>
              <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                Existing CreatorFlow Data
              </h2>
              <p className="text-xs text-neutral-600 font-sans leading-relaxed">
                Found existing CreatorFlow profile and project data on this device. Would you like to migrate and keep your existing work or start fresh?
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleMigrationDecision('keep')}
                className="w-full p-3.5 rounded-lg border-2 border-[#1a1a1a] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white flex items-center justify-between text-left transition-all cursor-pointer shadow-xs"
              >
                <div>
                  <div className="font-serif text-sm font-semibold text-[#f8f7f4]">
                    Keep & Migrate
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    Preserve existing video ideas, active projects, and channel profile
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-[#d4a017] shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleMigrationDecision('fresh')}
                className="w-full p-3.5 rounded-lg border border-black/[0.12] bg-white hover:bg-neutral-50 text-neutral-800 flex items-center justify-between text-left transition-all cursor-pointer"
              >
                <div>
                  <div className="font-serif text-sm font-semibold text-[#1a1a1a]">
                    Start Fresh
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Reset local workspace and launch new channel onboarding
                  </div>
                </div>
                <RefreshCw className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
