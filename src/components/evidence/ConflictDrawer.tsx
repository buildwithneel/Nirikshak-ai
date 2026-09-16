import React from 'react';
import { X, AlertTriangle, ExternalLink, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { DeclarationConflict } from '../../services/api/imagesApi';
import { Button } from '../ui/Button';

interface ConflictDrawerProps {
  conflicts: DeclarationConflict[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPanelImage: (imageId: string, declarationKey?: string) => void;
}

export const ConflictDrawer: React.FC<ConflictDrawerProps> = ({
  conflicts,
  isOpen,
  onClose,
  onSelectPanelImage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-institutional-border animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-institutional-border bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-govink-primary">
                Declaration Conflict Discrepancy
              </h3>
              <p className="text-[11px] text-amber-900 font-medium">
                {conflicts.length} Cross-Panel Conflict{conflicts.length === 1 ? '' : 's'} Detected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-govink-secondary hover:text-govink-primary hover:bg-amber-100/50 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advisory Banner */}
        <div className="p-3 bg-amber-50/40 border-b border-amber-100 text-[11px] text-amber-950 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>Statutory Verification Advisory</span>
          </div>
          <p>
            AI detection observed divergent declaration values across packaging panels.
            <strong> Officer verification is mandatory.</strong> The system does not decide which value takes precedence.
          </p>
        </div>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {conflicts.length === 0 ? (
            <div className="text-center py-12 text-govink-secondary">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-govink-primary">No Cross-Panel Conflicts</p>
              <p className="text-[11px] text-govink-muted mt-0.5">
                Declarations detected across multiple package panels are consistent.
              </p>
            </div>
          ) : (
            conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-institutional-border p-4 shadow-subtle space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-govink-primary uppercase tracking-wide">
                    {conflict.field_label || conflict.field_key}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                    REVIEW REQUIRED
                  </span>
                </div>

                {/* Values Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {conflict.conflicting_values.map((val, vIdx) => (
                    <div
                      key={vIdx}
                      className="p-3 rounded-lg bg-institutional-subtle/50 border border-institutional-border space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-govink-secondary font-mono">
                          <span className="font-bold text-govink-primary">
                            Value {vIdx + 1}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-cream-200 text-govink-secondary">
                            {val.panel_type} Panel
                          </span>
                        </div>
                        <div className="text-sm font-black text-govink-primary mt-1 font-mono break-all">
                          {val.value || '[EMPTY]'}
                        </div>
                        <div className="text-[10px] text-govink-secondary mt-1">
                          OCR Confidence:{' '}
                          <strong className="text-govink-primary">
                            {Math.round(val.confidence * 100)}%
                          </strong>
                        </div>
                        <div className="text-[10px] text-govink-muted mt-0.5">
                          Source: {val.source.replace('_', ' ')}
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectPanelImage(val.image_id, conflict.field_key)}
                        className="w-full text-[11px] mt-2"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open {val.panel_type} Evidence
                      </Button>
                    </div>
                  ))}
                </div>

                {/* AI Recommendation */}
                <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-[11px] text-teal-950 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-teal-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-teal-900">AI Recommendation: </span>
                    <span>Review both package panels visually to verify manufacturer printing vs overstickering. No enforcement action is automated.</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-institutional-border bg-gray-50 flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Drawer
          </Button>
        </div>
      </div>
    </div>
  );
};
