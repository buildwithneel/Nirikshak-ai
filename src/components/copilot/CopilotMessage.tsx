import React, { useState } from 'react';
import {
  Sparkles,
  User,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  ArrowRight,
  Check,
} from 'lucide-react';
import { CopilotResponse, CopilotSource, CopilotAction } from '../../services/api/copilotApi';
import { CopilotSourceCard } from './CopilotSourceCard';

export interface ChatMessageItem {
  id: string;
  role: 'officer' | 'copilot';
  content: string;
  timestamp: string;
  responsePayload?: CopilotResponse;
}

interface CopilotMessageProps {
  message: ChatMessageItem;
  onSelectSource: (source: CopilotSource) => void;
  onSelectAction: (action: CopilotAction) => void;
  onFeedback: (responseId: string, feedback: 'HELPFUL' | 'NOT_HELPFUL') => void;
}

export const CopilotMessage: React.FC<CopilotMessageProps> = ({
  message,
  onSelectSource,
  onSelectAction,
  onFeedback,
}) => {
  const [feedbackState, setFeedbackState] = useState<'HELPFUL' | 'NOT_HELPFUL' | null>(null);

  if (message.role === 'officer') {
    return (
      <div className="flex justify-end gap-2.5 my-3 animate-fadeIn">
        <div className="max-w-[85%] bg-forest-800 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-subtle">
          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">{message.content}</p>
          <div className="text-[10px] text-cream-300 text-right mt-1.5 font-mono">{message.timestamp}</div>
        </div>
        <div className="w-7 h-7 rounded-full bg-forest-900 text-cream-100 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-forest-700">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  const payload = message.responsePayload;
  const sources = payload?.sources || [];
  const actions = payload?.actions || [];

  const handleFeedbackClick = (val: 'HELPFUL' | 'NOT_HELPFUL') => {
    setFeedbackState(val);
    if (payload?.request_id) {
      onFeedback(payload.request_id, val);
    }
  };

  return (
    <div className="flex justify-start gap-2.5 my-3 animate-fadeIn">
      <div className="w-7 h-7 rounded-full bg-cream-300 text-forest-800 flex items-center justify-center flex-shrink-0 border border-cream-400">
        <Sparkles className="w-3.5 h-3.5 text-forest-700" />
      </div>

      <div className="max-w-[92%] bg-cream-100 border border-cream-400 rounded-2xl rounded-tl-sm p-4 shadow-subtle space-y-3">
        {/* Header Indicator */}
        <div className="flex items-center justify-between border-b border-cream-300 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-forest-600" />
            <span>NIRIKSHAK AI COPILOT</span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>GROUNDED IN EVIDENCE</span>
          </span>
        </div>

        {/* Text Answer */}
        <div className="text-xs sm:text-sm text-ink-primary leading-relaxed whitespace-pre-wrap font-sans">
          {message.content}
        </div>

        {/* Supporting Evidence Sources */}
        {sources.length > 0 && (
          <div className="pt-2 border-t border-cream-300 space-y-2">
            <div className="text-[11px] font-mono font-bold uppercase text-ink-secondary flex items-center gap-1">
              <span>Supporting Evidence Sources ({sources.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((src, idx) => (
                <CopilotSourceCard key={idx} source={src} onClick={onSelectSource} />
              ))}
            </div>
          </div>
        )}

        {/* Action Directives */}
        {actions.length > 0 && (
          <div className="pt-2 border-t border-cream-300 flex flex-wrap gap-2">
            {actions.map((act, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectAction(act)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <span>{act.label}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Footer with Disclaimer & Feedback */}
        <div className="pt-2 border-t border-cream-300 flex items-center justify-between text-[10px] text-ink-muted">
          <span className="italic truncate max-w-[280px]">
            AI explains evidence; officer verification is legally authoritative.
          </span>

          <div className="flex items-center gap-1 flex-shrink-0">
            {feedbackState ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                <Check className="w-3 h-3" />
                <span>Thank you</span>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleFeedbackClick('HELPFUL')}
                  className="p-1 hover:bg-cream-200 rounded text-ink-muted hover:text-forest-700 transition-colors"
                  title="Helpful response"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedbackClick('NOT_HELPFUL')}
                  className="p-1 hover:bg-cream-200 rounded text-ink-muted hover:text-red-700 transition-colors"
                  title="Not helpful or inaccurate"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
