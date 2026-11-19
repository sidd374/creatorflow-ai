import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxCharacters?: number;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  maxCharacters,
  className = '',
  id,
  value,
  ...props
}) => {
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={generatedId} className="text-xs font-semibold text-neutral-800 tracking-tight">
            {label}
          </label>
        )}
        {maxCharacters && (
          <span className="text-[11px] font-mono tabular-nums text-neutral-400">
            {currentLength}/{maxCharacters}
          </span>
        )}
      </div>
      <textarea
        id={generatedId}
        value={value}
        className={`w-full rounded-md border bg-white px-3.5 py-3 text-sm text-[#1a1a1a] placeholder:text-neutral-400 transition-colors focus:border-[#d4a017] focus:outline-none focus:ring-1 focus:ring-[#d4a017] disabled:bg-neutral-50 disabled:cursor-not-allowed resize-y min-h-[100px] ${
          error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500' : 'border-black/[0.12] hover:border-black/[0.22]'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-neutral-500">{helperText}</span>}
    </div>
  );
};
