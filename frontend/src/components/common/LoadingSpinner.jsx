import React from 'react';

export default function LoadingSpinner({ size = 'md', className = '', label = 'Loading content...' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`} role="status">
      <div
        className={`${sizes[size] || sizes.md} border-accent/20 border-t-accent rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
