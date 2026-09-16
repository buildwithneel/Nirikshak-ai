import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, CornerDownLeft } from 'lucide-react';

interface CopilotInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  suggestedQuestions: string[];
}

export const CopilotInput: React.FC<CopilotInputProps> = ({
  onSend,
  isLoading,
  suggestedQuestions,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggestion = (q: string) => {
    if (isLoading) return;
    onSend(q);
  };

  return (
    <div className="border-t border-cream-400 bg-cream-100 p-3 space-y-2.5">
      {/* Suggested Starter Chips */}
      {suggestedQuestions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Sparkles className="w-3.5 h-3.5 text-forest-700 flex-shrink-0" />
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSuggestion(q)}
              disabled={isLoading}
              className="flex-shrink-0 px-2.5 py-1 rounded-full bg-cream-200 hover:bg-cream-300 text-ink-primary border border-cream-400 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-white rounded-xl border border-cream-400 p-2 shadow-inner focus-within:ring-2 focus-within:ring-forest-600 focus-within:border-transparent">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this inspection's evidence, findings, or checklist..."
          rows={1}
          disabled={isLoading}
          className="w-full text-xs sm:text-sm text-ink-primary placeholder-ink-muted bg-transparent resize-none focus:outline-none max-h-24 py-1"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 rounded-lg bg-forest-700 hover:bg-forest-800 text-white disabled:opacity-40 transition-all flex-shrink-0 cursor-pointer shadow-subtle"
          title="Send query (Enter)"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
      <div className="flex items-center justify-between text-[10px] text-ink-muted px-1 font-mono">
        <span>Shift + Enter for new line</span>
        <span>Enter to send</span>
      </div>
    </div>
  );
};
