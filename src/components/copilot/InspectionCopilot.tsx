import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';
import { copilotApi, CopilotResponse, CopilotSource, CopilotAction } from '../../services/api/copilotApi';
import { CopilotMessage, ChatMessageItem } from './CopilotMessage';
import { CopilotInput } from './CopilotInput';

interface InspectionCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionId: string;
  productName?: string;
  initialQuery?: string | null;
  onNavigateToEvidence: (imageId?: string, ocrLineId?: string) => void;
  onNavigateToConflict: (declKey?: string) => void;
  onNavigateToFinding: (findingId?: string) => void;
  onNavigateToVerification: () => void;
  onNavigateToRules: () => void;
}

export const InspectionCopilot: React.FC<InspectionCopilotProps> = ({
  isOpen,
  onClose,
  inspectionId,
  productName = 'Commodity',
  initialQuery = null,
  onNavigateToEvidence,
  onNavigateToConflict,
  onNavigateToFinding,
  onNavigateToVerification,
  onNavigateToRules,
}) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load starter questions when inspection ID changes
  useEffect(() => {
    if (inspectionId) {
      copilotApi.getSuggestedQuestions(inspectionId).then(questions => {
        setSuggestedQuestions(questions);
      });
    }
  }, [inspectionId]);

  // Handle pre-filled initial query (e.g. from "Explain this finding" button)
  useEffect(() => {
    if (isOpen && initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    setRateLimitWarning(null);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: 'officer',
      content: userText,
      timestamp: now,
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res: CopilotResponse = await copilotApi.query(inspectionId, {
        message: userText,
        context_mode: 'INSPECTION_CONTEXT',
        conversation_history: history,
      });

      const copilotMsg: ChatMessageItem = {
        id: `cop-${Date.now()}`,
        role: 'copilot',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responsePayload: res,
      };

      setMessages(prev => [...prev, copilotMsg]);
    } catch (err: any) {
      console.error('Copilot query error:', err);
      const isRateLimit = (err.message || '').includes('limit');
      if (isRateLimit) {
        setRateLimitWarning('Rate limit reached (30 queries/minute). Please pause momentarily.');
      }

      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'copilot',
        content: isRateLimit
          ? 'Copilot request limit reached. Please wait a moment before sending another query.'
          : 'Unable to process copilot query at this time. Your inspection data remains intact for manual review.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSource = (source: CopilotSource) => {
    switch (source.type) {
      case 'EVIDENCE':
      case 'OCR':
        onNavigateToEvidence(source.image_id, source.ocr_line_id);
        break;
      case 'CONFLICT':
        onNavigateToConflict(source.declaration_key);
        break;
      case 'FINDING':
        onNavigateToFinding(source.finding_id);
        break;
      case 'RULE':
        if (source.rule_url) {
          window.open(source.rule_url, '_blank', 'noopener,noreferrer');
        } else {
          onNavigateToRules();
        }
        break;
      default:
        onNavigateToEvidence(source.image_id);
        break;
    }
  };

  const handleSelectAction = (action: CopilotAction) => {
    switch (action.type) {
      case 'OPEN_EVIDENCE':
        onNavigateToEvidence();
        break;
      case 'OPEN_CONFLICT':
        onNavigateToConflict(action.target_id);
        break;
      case 'OPEN_FINDING':
        onNavigateToFinding(action.target_id);
        break;
      case 'OPEN_VERIFICATION':
        onNavigateToVerification();
        break;
      case 'OPEN_RULE':
        onNavigateToRules();
        break;
      default:
        break;
    }
  };

  const handleFeedback = (responseId: string, feedback: 'HELPFUL' | 'NOT_HELPFUL') => {
    copilotApi.submitFeedback(inspectionId, responseId, feedback);
  };

  const handleClearHistory = () => {
    setMessages([]);
    setRateLimitWarning(null);
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="AI Inspection Copilot"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] md:w-[480px] bg-white shadow-2xl border-l border-cream-400 flex flex-col animate-slideInRight"
    >
      {/* Copilot Header */}
      <div className="bg-forest-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-forest-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-forest-800 text-cream-200 flex items-center justify-center border border-forest-700">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">NIRIKSHAK AI Copilot</h2>
              <span className="px-1.5 py-0.5 rounded bg-forest-800 border border-forest-700 text-[10px] font-mono text-emerald-300 font-bold">
                EVIDENCE ASSISTANT
              </span>
            </div>
            <div className="text-[11px] text-cream-300 truncate max-w-[240px]">
              {productName} ({inspectionId})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-cream-300 hover:text-white hover:bg-forest-800 transition-colors"
            title="Clear chat history"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-cream-300 hover:text-white hover:bg-forest-800 transition-colors"
            title="Close Copilot drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Institutional Advisory Banner */}
      <div className="bg-cream-200/90 border-b border-cream-400 px-4 py-2 flex items-center gap-2 text-[11px] text-ink-secondary">
        <ShieldCheck className="w-3.5 h-3.5 text-forest-700 flex-shrink-0" />
        <span className="leading-snug">
          <strong>Official Principle:</strong> AI explains detected packaging facts. Officer verification is legally authoritative.
        </span>
      </div>

      {/* Rate Limit Warning Pill */}
      {rateLimitWarning && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-2 flex items-center gap-2 text-xs text-amber-900">
          <AlertCircle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
          <span>{rateLimitWarning}</span>
        </div>
      )}

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream-50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-cream-200 border border-cream-400 flex items-center justify-center text-forest-800 shadow-sm">
              <Sparkles className="w-7 h-7 text-forest-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-primary">Ask About This Inspection</h3>
              <p className="text-xs text-ink-secondary mt-1 max-w-xs leading-relaxed">
                Evidence-grounded assistant for Legal Metrology officers.
              </p>
            </div>

            <div className="w-full text-left bg-cream-100 rounded-xl border border-cream-300 p-3.5 space-y-2 text-xs text-ink-primary shadow-subtle">
              <div className="text-[11px] font-mono font-bold uppercase text-forest-800">
                I can help you analyze:
              </div>
              <ul className="space-y-1 text-ink-secondary text-[11px] list-disc list-inside">
                <li>Why specific statutory findings were flagged</li>
                <li>Cross-panel conflicts (e.g. conflicting MRPs)</li>
                <li>Declarations that were not reliably detected</li>
                <li>Exact evidence locations on packaging faces</li>
                <li>A dynamic officer checklist to complete verification</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <CopilotMessage
              key={msg.id}
              message={msg}
              onSelectSource={handleSelectSource}
              onSelectAction={handleSelectAction}
              onFeedback={handleFeedback}
            />
          ))
        )}

        {isLoading && (
          <div className="flex justify-start gap-2.5 my-3 animate-fadeIn">
            <div className="w-7 h-7 rounded-full bg-cream-300 text-forest-800 flex items-center justify-center flex-shrink-0 border border-cream-400">
              <Sparkles className="w-3.5 h-3.5 text-forest-700 animate-spin" />
            </div>
            <div className="bg-cream-100 border border-cream-400 rounded-2xl rounded-tl-sm p-3.5 shadow-subtle text-xs text-ink-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-forest-600 animate-ping" />
              <span>Analyzing packaging evidence and rule evaluations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <CopilotInput
        onSend={handleSendMessage}
        isLoading={isLoading}
        suggestedQuestions={suggestedQuestions}
      />
    </aside>
  );
};
