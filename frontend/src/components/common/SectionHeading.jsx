import React from 'react';

export default function SectionHeading({
  title,
  subtitle,
  align = 'left',
  tag,
  className = '',
  action,
}) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';

  return (
    <div className={`mb-10 sm:mb-12 ${alignClass} ${className}`}>
      {tag && (
        <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">
          {tag}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary leading-tight tracking-tight mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="text-text-muted text-base sm:text-lg max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
