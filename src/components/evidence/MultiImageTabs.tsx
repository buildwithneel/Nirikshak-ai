import React from 'react';
import { ProductPackagingPerspective } from '../../types';

interface MultiImageTabsProps {
  activePerspective: ProductPackagingPerspective;
  onSelectPerspective: (perspective: ProductPackagingPerspective) => void;
}

export const MultiImageTabs: React.FC<MultiImageTabsProps> = ({
  activePerspective,
  onSelectPerspective,
}) => {
  const perspectives: { id: ProductPackagingPerspective; label: string; sub: string; activeInPrototype: boolean }[] = [
    { id: 'back', label: 'Back Panel (PDP / Declarations)', sub: 'Primary Evidence', activeInPrototype: true },
    { id: 'front', label: 'Front Display Panel', sub: 'Brand Face', activeInPrototype: false },
    { id: 'left', label: 'Left Side Gusset', sub: 'Barcode / Batch', activeInPrototype: false },
    { id: 'right', label: 'Right Side Gusset', sub: 'Nutritional Info', activeInPrototype: false },
    { id: 'top', label: 'Top Lid / Seal', sub: 'Date Code', activeInPrototype: false },
    { id: 'bottom', label: 'Base / Underside', sub: 'Mould Mark', activeInPrototype: false },
  ];

  return (
    <div className="bg-cream-100 rounded-xl border border-cream-400 p-2 shadow-subtle overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {perspectives.map(p => {
          const isSelected = activePerspective === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (p.activeInPrototype) {
                  onSelectPerspective(p.id);
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
                isSelected
                  ? 'bg-forest-700 text-white shadow-subtle'
                  : p.activeInPrototype
                  ? 'bg-cream-200 text-ink-primary hover:bg-cream-300 border border-cream-400'
                  : 'bg-cream-200/40 text-ink-muted border border-dashed border-cream-300 cursor-not-allowed'
              }`}
              title={p.activeInPrototype ? p.label : `${p.label} (Next Phase)`}
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                  isSelected
                    ? 'bg-forest-800 text-white'
                    : p.activeInPrototype
                    ? 'bg-cream-300 text-forest-800'
                    : 'bg-cream-200 text-ink-muted'
                }`}
              >
                {p.id.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="leading-tight flex items-center gap-1.5">
                  <span>{p.label}</span>
                  {!p.activeInPrototype && (
                    <span className="text-[9px] bg-cream-300 text-ink-secondary px-1 py-0.2 rounded font-mono">
                      Phase 2
                    </span>
                  )}
                </div>
                <div
                  className={`text-[10px] leading-tight mt-0.5 ${
                    isSelected ? 'text-forest-100' : 'text-ink-muted'
                  }`}
                >
                  {p.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
