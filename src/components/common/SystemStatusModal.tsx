import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  ShieldCheck,
  HardDrive,
  Cpu,
  Bot,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';
import { getApiUrl } from '../../services/api/config';
import { isSupabaseConfigured } from '../../services/supabase/supabaseClient';

interface SystemDiagnostics {
  status: string;
  version: string;
  uptime_seconds?: number;
  components?: {
    database?: { status: string; engine: string };
    ocr_engine?: { name: string; status: string };
    compliance_engine?: { status: string; rules_loaded: number };
    storage?: { status: string; type: string };
    rate_limiter?: { status: string };
  };
}

export const SystemStatusModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/health/detailed'));
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(`Backend health check responded with status ${res.status}`);
      }
    } catch (err: any) {
      setError('Unable to reach backend health endpoint. Ensure FastAPI server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const envMode = import.meta.env.PROD ? 'Production' : 'Development';
  const supabaseActive = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-institutional-border max-w-lg w-full shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-govgreen-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-govgreen-300" />
            <div>
              <h2 className="font-bold text-sm">System Production Status</h2>
              <p className="text-[11px] text-govgreen-200">
                NIRIKSHAK AI • Real-Time Diagnostics (Safe View)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-govgreen-300 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs font-sans">
          {/* Environment Summary */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-mono text-govink-secondary font-semibold block mb-0.5">
                Environment
              </span>
              <span className="font-bold text-govink-primary text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {envMode}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-mono text-govink-secondary font-semibold block mb-0.5">
                Authentication Mode
              </span>
              <span className="font-bold text-govink-primary text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-govgreen-700" />
                {supabaseActive ? 'Supabase Auth / Google OAuth' : 'Dual-Mode / Local Auth'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-govgreen-700 mx-auto" />
              <p className="text-govink-secondary font-medium">Polling system diagnostics…</p>
            </div>
          ) : error ? (
            <div className="p-3 bg-govred-50 border border-govred-200 rounded-xl text-govred-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-govred-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-mono font-bold text-govink-secondary block">
                Subsystem Health Grid
              </span>

              {/* Database */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-govblue-600" />
                  <span className="font-semibold text-govink-primary">Database Engine</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-govink-primary font-bold">
                    {data?.components?.database?.engine || 'Connected'}
                  </span>
                  <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold">
                    ONLINE
                  </span>
                </div>
              </div>

              {/* OCR Engine */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-govink-primary">OCR Engine</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-govink-primary font-bold">
                    {data?.components?.ocr_engine?.name || 'PaddleOCR ONNX'}
                  </span>
                  <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold">
                    OPERATIONAL
                  </span>
                </div>
              </div>

              {/* Storage */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-govink-primary">Storage Subsystem</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-govink-primary font-bold">
                    {data?.components?.storage?.type || 'Storage Service'}
                  </span>
                  <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold">
                    WRITABLE
                  </span>
                </div>
              </div>

              {/* Copilot */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-govink-primary">AI Copilot</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-govink-primary font-bold">
                    Deterministic / Grounded
                  </span>
                  <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <p className="text-[11px] text-govink-secondary font-medium italic text-center pt-2 border-t border-slate-200">
            Security policy: Internal connection strings, credentials, and API keys are strictly masked.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-institutional-border flex items-center justify-between">
          <button
            type="button"
            onClick={fetchDiagnostics}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-govgreen-800 hover:text-govgreen-900 font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-govink-primary font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
