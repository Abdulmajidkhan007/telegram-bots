import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  animate?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddingMap = { sm: 'p-4', md: 'p-6', lg: 'p-8' }

export function Card({ children, className, hover = false, animate = true, padding = 'md' }: CardProps) {
  const base = clsx(
    'rounded-2xl border bg-white dark:bg-card-dark dark:border-slate-700/50',
    'shadow-card transition-shadow duration-200',
    hover && 'cursor-pointer hover:shadow-card-hover',
    paddingMap[padding],
    className
  )

  if (!animate) return <div className={base}>{children}</div>

  return (
    <motion.div
      className={base}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
