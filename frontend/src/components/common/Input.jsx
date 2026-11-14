import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, helperText, id, required = false, className = '', containerClassName = '', ...props },
  ref
) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-text-primary mb-1.5">
          {label} {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
        className={`input-field ${error ? 'border-error focus:border-error focus:ring-error' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-error font-medium" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-help`} className="mt-1.5 text-xs text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;
