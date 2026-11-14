import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const configs = {
  success: { icon: CheckCircle, classes: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  error: { icon: AlertCircle, classes: 'bg-rose-50 border-rose-200 text-rose-800' },
  warning: { icon: AlertTriangle, classes: 'bg-amber-50 border-amber-200 text-amber-800' },
  info: { icon: Info, classes: 'bg-accent-50 border-accent-200 text-accent-800' },
};

export default function Alert({ type = 'info', title, message, dismissible = false, className = '' }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { icon: Icon, classes } = configs[type] || configs.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-sm border ${classes} ${className}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 text-sm">
        {title && <p className="font-bold mb-0.5">{title}</p>}
        {message && <p className="leading-relaxed opacity-95">{message}</p>}
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 hover:opacity-75 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
