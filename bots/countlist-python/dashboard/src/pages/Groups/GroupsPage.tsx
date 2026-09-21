import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '@/services/api'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'

export default function GroupsPage() {
  const { data: groups, isLoading } = useQuery({ queryKey: ['groups'], queryFn: groupsApi.list })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <Header title="Guruhlar" subtitle="Telegram guruhlar" />

      <div className="p-6">
        {!groups?.length ? (
          <Card>
            <div className="text-center py-16">
              <p className="text-4xl mb-4">👥</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Guruhlar yo'q</h3>
              <p className="text-slate-500 text-sm">Botni Telegram guruhingizga qo'shing va admin qiling</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group, i) => (
              <motion.div
                key={group.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center text-xl">
                    👥
                  </div>
                  <Badge color={group.is_active ? '#22c55e' : '#ef4444'}>
                    {group.is_active ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{group.title}</h3>
                {group.description && <p className="text-xs text-slate-500 mb-3">{group.description}</p>}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>👤 {group.member_count} a'zo</span>
                  <span>{group.currency}</span>
                  <span>{format(parseISO(group.created_at), 'dd.MM.yyyy')}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
