import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAppDispatch } from '@/store'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [form, setForm] = useState({ telegram_id: '', first_name: '', password: '' })

  const mutation = useMutation({
    mutationFn: () => authApi.register({
      telegram_id: Number(form.telegram_id),
      first_name: form.first_name,
      password: form.password || undefined,
    }),
    onSuccess: (data) => {
      dispatch(setCredentials({ user: data.user, token: data.access_token }))
      toast.success(`Xush kelibsiz, ${data.user.first_name}!`)
      navigate('/')
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.telegram_id || !form.first_name) {
      toast.error('Barcha maydonlarni to\'ldiring')
      return
    }
    mutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-glow"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              💸
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">XarajatBot</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dashboard kirish</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Telegram ID"
              type="number"
              placeholder="123456789"
              value={form.telegram_id}
              onChange={(e) => setForm({ ...form, telegram_id: e.target.value })}
              icon={<span className="text-slate-400">🆔</span>}
            />
            <Input
              label="Ism"
              placeholder="Ismingiz"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              icon={<span className="text-slate-400">👤</span>}
            />
            <Input
              label="Parol (ixtiyoriy)"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              icon={<span className="text-slate-400">🔒</span>}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={mutation.isPending}
            >
              Kirish
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              🤖 Telegram botni ham ishlatmoqchi bo'lsangiz,{' '}
              <strong>@XarajatManagerBot</strong> ga /start yuboring
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
