import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { analyticsApi, groupsApi } from '@/services/api';
import { useAppSelector } from '@/hooks/useAppSelector';
import { formatAmount } from '@/utils/format';

export function UsersPage() {
  const selectedGroupId = useAppSelector((s) => s.ui.selectedGroupId);

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list().then((r) => r.data?.data || r.data),
  });

  const groupId = selectedGroupId || (Array.isArray(groups) ? groups[0]?.id : undefined);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', groupId],
    queryFn: () => analyticsApi.full(groupId!).then((r) => r.data?.data || r.data),
    enabled: !!groupId,
  });

  if (groupsLoading || (groupId && isLoading)) return <PageLoader />;

  if (!groupId) {
    return (
      <EmptyState
        icon="🏢"
        title="Guruh topilmadi"
        description="Telegram botni guruhga qo'shing va /start bosing"
      />
    );
  }

  const users: any[] = analytics?.byUser || [];
  const totalAmount = users.reduce((s: number, u: any) => s + (u.amount || 0), 0);
  const totalExpenses = users.reduce((s: number, u: any) => s + (u.count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Foydalanuvchilar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {users.length} ta faol foydalanuvchi
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Faol foydalanuvchilar"
          value={String(users.length)}
          icon="👥"
          iconBg="bg-brand-50 dark:bg-brand-900/30"
          delay={0}
        />
        <StatCard
          title="Jami xarajat"
          value={formatAmount(totalAmount)}
          icon="💰"
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          delay={0.05}
        />
        <StatCard
          title="Jami operatsiyalar"
          value={String(totalExpenses)}
          icon="📊"
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          delay={0.1}
        />
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon="👤"
          title="Foydalanuvchilar yo'q"
          description="Guruh a'zolari hali xarajat qilishmagan"
        />
      ) : (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Xarajat reytingi
            </h2>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {users.map((user: any, i: number) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center justify-center w-7 text-lg flex-shrink-0">
                  {['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][i] ??
                    <span className="text-sm font-bold text-slate-400">{i + 1}</span>}
                </div>
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-base flex-shrink-0">
                  {user.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {user.firstName}
                    </p>
                    {user.username && (
                      <span className="text-xs text-slate-400 truncate">@{user.username}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-56">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${user.percentage}%` }}
                        transition={{ delay: i * 0.04 + 0.2, duration: 0.5 }}
                        className="h-full bg-brand-500 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{user.percentage}%</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formatAmount(user.amount)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{user.count} ta xarajat</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
