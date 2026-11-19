import React from 'react';
import { Lock, Sparkles, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { GoogleSignInButton } from './GoogleSignInButton';
import { MicrosoftSignInButton } from './MicrosoftSignInButton';
import { signInWithGoogle, signInWithMicrosoft, CreatorFlowUser } from '../../lib/auth';

interface AuthGatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CreatorFlowUser) => void;
  featureTitle?: string;
  featureDescription?: string;
}

export const AuthGatedModal: React.FC<AuthGatedModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  featureTitle = 'Sign in to access your CreatorFlow Workspace',
  featureDescription = 'Sign in with your Google account to access your personal dashboard, saved projects, and AI creation tools.',
}) => {
  const [loadingProvider, setLoadingProvider] = React.useState<'google' | 'microsoft' | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    if (loadingProvider) return;
    setLoadingProvider('google');
    setErrorMessage(null);
    try {
      const { user } = await signInWithGoogle();
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleMicrosoftClick = async () => {
    if (loadingProvider) return;
    setLoadingProvider('microsoft');
    setErrorMessage(null);
    try {
      const { user } = await signInWithMicrosoft();
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl border border-black/[0.12] shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 relative font-sans text-center">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.05] rounded-md transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] text-[#d4a017] flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-6 h-6" />
        </div>

        {/* Messaging */}
        <div className="space-y-2">
          <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block">
            Sign-In Required
          </span>
          <h2 id="auth-gate-title" className="font-serif text-2xl font-normal text-[#1a1a1a]">
            {featureTitle}
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
            {featureDescription}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 text-left">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
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

        <div className="pt-2 border-t border-black/[0.06] text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Your private workspace, projects, and quotas are secured.</span>
        </div>
      </div>
    </div>
  );
};
