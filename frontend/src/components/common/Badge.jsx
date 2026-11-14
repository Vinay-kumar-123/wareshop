import React from 'react';

const variants = {
  teal: 'badge-teal',
  navy: 'badge-navy',
  grey: 'badge-grey',
  warning: 'badge-warning',
  success: 'badge-success',
};

export default function Badge({ children, variant = 'grey', className = '', ...props }) {
  return (
    <span className={`${variants[variant] || variants.grey} ${className}`} {...props}>
      {children}
    </span>
  );
}
