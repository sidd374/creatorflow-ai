import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a017] focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-[0.99] select-none rounded-md cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2 h-9 sm:h-10',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5 h-11 sm:h-12',
  };

  const variantStyles = {
    primary: 'bg-[#1a1a1a] text-[#f8f7f4] hover:bg-[#d4a017] hover:text-white shadow-xs border border-[#1a1a1a] hover:border-[#d4a017]',
    secondary: 'bg-[#d4a017] text-white hover:bg-[#b8890f] shadow-xs border border-[#d4a017] hover:border-[#b8890f]',
    outline: 'bg-white text-[#1a1a1a] border border-black/[0.12] hover:border-[#d4a017] hover:bg-[#f8f7f4] shadow-xs',
    ghost: 'text-neutral-600 hover:text-[#1a1a1a] hover:bg-black/[0.04]',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
