import React from 'react';

interface MicrosoftSignInButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const MicrosoftSignInButton: React.FC<MicrosoftSignInButtonProps> = ({
  onClick,
  isLoading = false,
  className = '',
  size = 'md',
  text = 'Continue with Microsoft',
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-5 py-2.5 text-xs sm:text-sm',
    lg: 'px-6 py-3.5 text-sm font-semibold',
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 text-neutral-800 font-sans font-medium border border-black/[0.12] hover:border-black/[0.24] rounded-lg shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
    >
      {/* Official Microsoft 4-Square Vector */}
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
      <span>{isLoading ? 'Connecting to Microsoft...' : text}</span>
    </button>
  );
};
