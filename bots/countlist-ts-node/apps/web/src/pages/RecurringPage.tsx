import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';

const examples = [
  { icon: '🏠', title: 'Ijara', desc: 'Har oy 1-sanada', amount: '2 500 000 so\'m' },
  { icon: '📱', title: 'Internet', desc: 'Har oy 15-sanada', amount: '150 000 so\'m' },
  { icon: '💡', title: 'Kommunal', desc: 'Har oy oxirida', amount: '300 000 so\'m' },
];

export function RecurringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Takroriy xarajatlar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Avtomatik qayta takrorlanadigan xarajatlar
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 border-brand-100 dark:border-brand-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
              🔄
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Tez kunda tayyor bo'ladi
                </h2>
                <span className="px-2 py-0.5 bg-brand-500 text-white text-xs rounded-full font-medium">
                  Yangi
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Takroriy xarajatlarni bir marta o'rnatib, avtomatik hisobga oling —
                ijara, obunalar, kommunal to'lovlar va boshqalar.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Shunday ishlaydi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '➕', title: 'Xarajat qo\'shing', desc: 'Miqdor, tavsif va takrorlanish muddatini kiriting' },
            { icon: '⏰', title: 'Sana belgilang', desc: 'Har hafta, har oy yoki maxsus sana tanlang' },
            { icon: '✅', title: 'Bot eslatadi', desc: 'Belgilangan kuni Telegram botda xabar olasiz' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="text-center">
                <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-xl mx-auto mb-3">
                  {item.icon}
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Namuna
        </h2>
        <Card padding="none">
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {examples.map((ex, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 opacity-50">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                  {ex.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{ex.title}</p>
                  <p className="text-xs text-slate-400">{ex.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{ex.amount}</p>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                    Oylik
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
