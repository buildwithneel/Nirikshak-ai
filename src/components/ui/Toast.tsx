import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 sm:px-0">
      {toasts.map(toast => {
        const borderColors = {
          success: 'border-emerald-500 bg-white text-emerald-950',
          warning: 'border-amber-500 bg-white text-amber-950',
          error: 'border-red-500 bg-white text-red-950',
          info: 'border-govnavy-600 bg-white text-institutional-900',
        };

        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
          warning: <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
          info: <Info className="w-5 h-5 text-govnavy-600 flex-shrink-0" />,
        };

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-elevated border border-institutional-200 transition-all duration-200 animate-slideIn ${borderColors[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 text-sm">
              <div className="font-semibold">{toast.title}</div>
              {toast.message && (
                <div className="text-xs text-institutional-600 mt-0.5">{toast.message}</div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-md text-institutional-400 hover:text-institutional-700 hover:bg-institutional-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
