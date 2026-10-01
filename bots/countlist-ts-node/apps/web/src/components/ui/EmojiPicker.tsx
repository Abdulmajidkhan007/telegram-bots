import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Dropdown } from './Dropdown';

// Kategoriyaga mos tayyor emojilar. Avval icon oddiy matn maydoni edi
// (maxLength=2): o'chirib yuborilsa, yangisini Telegram'dan nusxalab kelish
// kerak edi, ko'p emojilar esa 2 belgidan uzun bo'lgani uchun sig'masdi ham.
const EMOJIS = [
  '🍕', '🛒', '🍎', '☕', '🍽️', '🚗', '🚕', '🚌', '⛽', '✈️',
  '🏠', '💡', '💧', '🔥', '🛠️', '👕', '👟', '💊', '🏥', '📚',
  '🎓', '🎮', '🎬', '🎁', '⚽', '💻', '📱', '🌐', '🐾', '👶',
  '💄', '💈', '🧾', '💳', '🏦', '💰', '📦', '🎉', '🙏', '❤️',
];

interface Props {
  value: string;
  onChange: (emoji: string) => void;
  size?: 'md' | 'sm';
}

export function EmojiPicker({ value, onChange, size = 'md' }: Props) {
  const [custom, setCustom] = useState('');

  return (
    <Dropdown
      align="left"
      className="w-[17rem]"
      trigger={(open) => (
        <button
          type="button"
          aria-label="Icon tanlash"
          className={cn(
            'input-field flex items-center justify-center',
            size === 'md' ? 'h-11 text-2xl' : 'h-10 text-xl px-2',
            open && 'ring-2 ring-brand-400',
          )}
        >
          {value || '📦'}
        </button>
      )}
    >
      {(close) => (
        <div className="p-2">
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onChange(e); close(); }}
                className={cn(
                  'h-8 rounded-lg text-lg hover:bg-slate-100 dark:hover:bg-slate-800',
                  value === e && 'bg-brand-50 dark:bg-brand-900/30 ring-1 ring-brand-400',
                )}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Boshqa emoji..."
              className="input-field h-9 text-sm flex-1 min-w-0"
            />
            <button
              type="button"
              disabled={!custom.trim()}
              onClick={() => { onChange(Array.from(custom.trim()).slice(0, 4).join('')); setCustom(''); close(); }}
              className="px-3 rounded-lg bg-brand-500 text-white text-xs font-medium disabled:opacity-50"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}
