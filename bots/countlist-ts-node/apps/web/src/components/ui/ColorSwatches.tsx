import { Check, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

// Rang grafiklarda (doira diagramma) va kartochka fonida kategoriyani ajratib
// ko'rsatish uchun. Tayyor ranglar — har safar palitradan qidirib o'tirmaslik uchun;
// oxirgi tugma — istalgan rang.
export const CATEGORY_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#64748b',
];

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function ColorSwatches({ value, onChange }: Props) {
  const isCustom = !CATEGORY_COLORS.includes(value.toLowerCase());
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Rang ${c}`}
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full flex items-center justify-center ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transition-transform active:scale-90"
          style={{ backgroundColor: c, boxShadow: value.toLowerCase() === c ? `0 0 0 2px ${c}` : undefined }}
        >
          {value.toLowerCase() === c && <Check size={14} className="text-white" />}
        </button>
      ))}
      <label
        title="Boshqa rang"
        className={cn(
          'relative w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-2 border-dashed',
          isCustom ? 'border-transparent' : 'border-slate-300 dark:border-slate-600 text-slate-400',
        )}
        style={isCustom ? { backgroundColor: value } : undefined}
      >
        {isCustom ? <Check size={14} className="text-white" /> : <Plus size={14} />}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
}
