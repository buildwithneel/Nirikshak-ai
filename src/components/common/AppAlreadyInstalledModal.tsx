import React from 'react';
import { CheckCircle2, Smartphone, ShieldCheck, HardDrive, ArrowUpRight, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface AppAlreadyInstalledModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
  installedAt?: string | null;
  onReinstallTest?: () => void;
}

export const AppAlreadyInstalledModal: React.FC<AppAlreadyInstalledModalProps> = ({
  isOpen,
  onClose,
  isStandalone = false,
  installedAt,
  onReinstallTest,
}) => {
  if (!isOpen) return null;

  const formattedDate = installedAt
    ? new Date(installedAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Active on this Device';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131B17] rounded-3xl max-w-md w-full border border-institutional-200 dark:border-institutional-800 shadow-modal p-5 sm:p-6 space-y-4 animate-scale-in">
        {/* Header & Status Indicator */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>Single Device Instance</span>
              </div>
              <h3 className="font-bold text-base text-institutional-900 dark:text-white">
                App Already Downloaded
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-institutional-600 hover:text-institutional-900 dark:text-institutional-400 dark:hover:text-institutional-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Explanation */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-institutional-700 dark:text-institutional-300 leading-relaxed">
            <strong>Nirikshak-AI</strong> is already downloaded and registered on this system. Multiple downloads are automatically prevented so your device maintains a single, synchronized application instance.
          </p>

          {/* System Device Card */}
          <div className="p-3.5 rounded-2xl bg-institutional-50 dark:bg-[#1A2420] border border-institutional-200 dark:border-institutional-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-institutional-700 dark:text-institutional-300 font-medium flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-institutional-600 dark:text-institutional-400" />
                <span>Running State:</span>
              </span>
              <span className="font-semibold text-institutional-900 dark:text-white font-mono text-[11px]">
                {isStandalone ? 'Standalone App Mode (Active)' : 'Web Browser Session'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-institutional-200/60 dark:border-institutional-800/60 pt-2">
              <span className="text-institutional-700 dark:text-institutional-300 font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-institutional-600 dark:text-institutional-400" />
                <span>Storage &amp; Cache:</span>
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                100% Offline Ready
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-institutional-200/60 dark:border-institutional-800/60 pt-2">
              <span className="text-institutional-700 dark:text-institutional-300 font-medium">
                Installed Record:
              </span>
              <span className="font-mono text-[11px] font-semibold text-institutional-700 dark:text-institutional-300">
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Direct Action Tip */}
        <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            {isStandalone
              ? 'You are currently working inside the downloaded app.'
              : 'To access the standalone app without your browser address bar, tap the Nirikshak-AI icon on your phone Home Screen or App Drawer.'}
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-2 pt-1">
          {onReinstallTest && (
            <button
              type="button"
              onClick={onReinstallTest}
              className="text-[10px] text-institutional-600 hover:text-institutional-900 dark:text-institutional-400 underline cursor-pointer mr-auto"
            >
              Reset for testing
            </button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={onClose}
            className="w-full justify-center text-xs font-bold rounded-xl bg-[#0B2545] hover:bg-[#07192F] text-white cursor-pointer"
          >
            Got It
          </Button>
        </div>
      </div>
    </div>
  );
};
