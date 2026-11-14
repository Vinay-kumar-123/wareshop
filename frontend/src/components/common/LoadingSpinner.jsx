import React from 'react';

export default function LoadingSpinner({
  size = 'md',
  className = '',
  label = 'Loading content...',
  showLabel = false,
}) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-10 h-10 border-[3px]',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}
      role="status"
    >
      <div
        className={`${
          sizes[size] || sizes.md
        } border-slate-200 border-t-[#F36B21] rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className={showLabel ? 'text-xs font-semibold text-slate-500' : 'sr-only'}>
        {label}
      </span>
    </div>
  );
}
