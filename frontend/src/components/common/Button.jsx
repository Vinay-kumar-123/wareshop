import React, { forwardRef } from 'react';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

const sizes = {
  sm: 'text-xs py-2 px-3.5',
  md: 'text-sm py-3 px-6',
  lg: 'text-base py-3.5 px-8',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    loading = false,
    disabled = false,
    as: Component = 'button',
    ...props
  },
  ref
) {
  return (
    <Component
      ref={ref}
      className={`${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </Component>
  );
});

export default Button;
