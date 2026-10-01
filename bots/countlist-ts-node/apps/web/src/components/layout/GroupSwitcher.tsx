import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppSelector';
import { setSelectedGroup } from '@/store/slices/ui.slice';
import { useActiveGroup } from '@/hooks/useActiveGroup';
import { queryClient } from '@/services/query-client';
import { cn } from '@/utils/cn';
import { Dropdown } from '@/components/ui/Dropdown';

// Hamma sahifa tanlangan guruh bo'yicha ishlaydi — shuning uchun tanlov
// har doim ko'rinib turadigan joyda (header'da) bo'lishi kerak.
export function GroupSwitcher() {
  const dispatch = useAppDispatch();
  const { groups, activeGroup } = useActiveGroup();

  if (groups.length === 0) return null;

  return (
    <Dropdown
      align="left"
      trigger={(open) => (
        <button
          className={cn(
            'flex items-center gap-2 max-w-[11rem] sm:max-w-xs pl-2.5 pr-2 py-1.5 rounded-xl text-sm font-medium',
            'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
            open && 'bg-slate-100 dark:bg-slate-800',
          )}
        >
          <Building2 size={16} className="text-brand-500 flex-shrink-0" />
          <span className="truncate">{activeGroup?.title || 'Guruh tanlang'}</span>
          <ChevronsUpDown size={14} className="text-slate-400 flex-shrink-0" />
        </button>
      )}
    >
      {(close) => (
        <div className="p-1.5 max-h-80 overflow-y-auto">
          <p className="px-2.5 pt-1.5 pb-2 text-xs font-medium text-slate-400">Guruhni tanlang</p>
          {groups.map((g) => {
            const selected = g.id === activeGroup?.id;
            return (
              <button
                key={g.id}
                onClick={() => {
                  dispatch(setSelectedGroup(g.id));
                  // Boshqa guruhning keshlangan ma'lumoti bir lahza ham ko'rinmasin.
                  queryClient.invalidateQueries();
                  close();
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors',
                  selected ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', selected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-100')}>
                    {g.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {g._count?.members ?? 0} a'zo · {g._count?.expenses ?? 0} xarajat
                  </p>
                </div>
                {selected && <Check size={16} className="text-brand-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </Dropdown>
  );
}
