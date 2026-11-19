import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
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
      <div className="relative">
        <select
          id={generatedId}
          className={`w-full appearance-none rounded-md border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#1a1a1a] transition-colors focus:border-[#d4a017] focus:outline-none focus:ring-1 focus:ring-[#d4a017] disabled:bg-neutral-50 disabled:cursor-not-allowed ${
            error ? 'border-rose-400 focus:border-rose-500' : 'border-black/[0.12] hover:border-black/[0.22]'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-neutral-500">{helperText}</span>}
    </div>
  );
};
