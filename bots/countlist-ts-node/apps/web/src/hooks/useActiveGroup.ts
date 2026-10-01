import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppSelector';
import { setSelectedGroup } from '@/store/slices/ui.slice';

export interface GroupSummary {
  id: string;
  title: string;
  _count?: { members?: number; expenses?: number };
  settings?: { currency?: string } | null;
}

/**
 * Foydalanuvchining guruhlari va hozir tanlangan guruh.
 *
 * Avval tanlov faqat "Guruhlar" sahifasidagi kartani bosganda saqlanardi:
 * hech kim bosmasa u null qolib, Kategoriyalar/Xarajatlar/Limitlar guruhsiz
 * so'rov yuborardi (bo'sh ro'yxat), Dashboard esa birinchi — ko'pincha bo'sh —
 * guruhni ko'rsatardi. Endi tanlov yo'q yoki eskirgan bo'lsa (guruhdan
 * chiqilgan, boshqa akkaunt) eng ko'p xarajatli guruh avtomatik tanlanadi.
 */
export function useActiveGroup() {
  const dispatch = useAppDispatch();
  const selectedGroupId = useAppSelector((s) => s.ui.selectedGroupId);

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list().then((r) => r.data?.data || r.data),
  });
  const groups: GroupSummary[] = Array.isArray(data) ? data : [];
  const active = groups.find((g) => g.id === selectedGroupId) || null;

  useEffect(() => {
    if (isLoading || groups.length === 0 || active) return;
    const best = [...groups].sort(
      (a, b) => (b._count?.expenses || 0) - (a._count?.expenses || 0),
    )[0];
    dispatch(setSelectedGroup(best.id));
  }, [isLoading, groups, active, dispatch]);

  return { groups, activeGroup: active, isLoading };
}
