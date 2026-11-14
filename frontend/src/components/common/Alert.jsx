import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const configs = {
  success: {
    icon: CheckCircle2,
    classes: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
    iconClass: 'text-emerald-600',
  },
  error: {
    icon: AlertCircle,
    classes: 'bg-rose-50/90 border-rose-200 text-rose-900',
    iconClass: 'text-rose-600',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-amber-50/90 border-amber-200 text-amber-900',
    iconClass: 'text-amber-600',
  },
  info: {
    icon: Info,
    classes: 'bg-[#FFF5EF] border-[#FFC8A8] text-[#762D12]',
    iconClass: 'text-[#F36B21]',
  },
};

export default function Alert({
  type = 'info',
  title,
  message,
  dismissible = false,
  className = '',
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { icon: Icon, classes, iconClass } = configs[type] || configs.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${classes} ${className}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${iconClass}`} aria-hidden="true" />
      <div className="flex-1 text-xs sm:text-sm">
        {title && <p className="font-bold mb-0.5">{title}</p>}
        {message && <p className="leading-relaxed opacity-95">{message}</p>}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
