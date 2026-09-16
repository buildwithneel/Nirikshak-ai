import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncService } from '../../services/sync/syncService';

export const ConnectionStatusBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [status, setStatus] = useState(syncService.getStatus());

  useEffect(() => {
    const unsubscribe = syncService.subscribe(newStatus => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    syncService.triggerSync();
  };

  if (status.isOnline && status.pendingCount === 0 && !status.isSyncing) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        title="Connected to NIRIKSHAK AI Network. All records synced."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="hidden sm:inline">Online</span>
      </div>
    );
  }

  if (status.isSyncing) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
        title="Synchronizing local queue with central server..."
      >
        <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (!status.isOnline) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-sm ${className}`}
        title="Field Resilience Mode: Network unavailable. Observations and drafts are securely cached in local storage."
      >
        <WifiOff className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span>Offline Mode</span>
        {status.pendingCount > 0 && (
          <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px]">
            {status.pendingCount} queued
          </span>
        )}
      </div>
    );
  }

  // Online with pending items
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
    >
      <Wifi className="w-3 h-3 text-amber-600" />
      <span>{status.pendingCount} queued</span>
      <button
        onClick={handleManualSync}
        className="ml-1 px-1.5 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-bold transition-colors"
      >
        Sync
      </button>
    </div>
  );
};
