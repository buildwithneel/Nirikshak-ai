import React from 'react';
import { Camera, Scale, AlertTriangle, FileText, CheckCircle2, ChevronRight, Tag } from 'lucide-react';
import { CopilotSource } from '../../services/api/copilotApi';

interface CopilotSourceCardProps {
  source: CopilotSource;
  onClick: (source: CopilotSource) => void;
}

export const CopilotSourceCard: React.FC<CopilotSourceCardProps> = ({ source, onClick }) => {
  const getIcon = () => {
    switch (source.type) {
      case 'EVIDENCE':
        return <Camera className="w-3.5 h-3.5 text-blue-700" />;
      case 'CONFLICT':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />;
      case 'FINDING':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-700" />;
      case 'RULE':
        return <Scale className="w-3.5 h-3.5 text-forest-700" />;
      case 'DECLARATION':
        return <Tag className="w-3.5 h-3.5 text-purple-700" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-gray-700" />;
    }
  };

  const getBadgeStyle = () => {
    switch (source.type) {
      case 'EVIDENCE':
        return 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100';
      case 'CONFLICT':
        return 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100';
      case 'FINDING':
        return 'bg-red-50 border-red-200 text-red-900 hover:bg-red-100';
      case 'RULE':
        return 'bg-forest-50 border-forest-200 text-forest-900 hover:bg-forest-100';
      case 'DECLARATION':
        return 'bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onClick(source)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-sm group ${getBadgeStyle()}`}
      title={`Navigate to ${source.label}`}
    >
      {getIcon()}
      <span className="truncate max-w-[170px] font-mono text-[11px] font-semibold">{source.label}</span>
      <ChevronRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
};
