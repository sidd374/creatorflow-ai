import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={generatedId} className="text-xs font-semibold text-neutral-800 tracking-tight">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-neutral-400">
            {leftIcon}
          </div>
        )}
        <input
          id={generatedId}
          className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-neutral-400 transition-colors focus:border-[#d4a017] focus:outline-none focus:ring-1 focus:ring-[#d4a017] disabled:bg-neutral-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon ? 'pr-10' : ''} ${
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500' : 'border-black/[0.12] hover:border-black/[0.22]'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-neutral-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-neutral-500">{helperText}</span>}
    </div>
  );
};
