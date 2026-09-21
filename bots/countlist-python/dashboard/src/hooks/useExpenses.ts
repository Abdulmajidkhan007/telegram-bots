import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/services/api'
import type { ExpenseFilter } from '@/types'
import toast from 'react-hot-toast'

export function useExpenses(filters: ExpenseFilter = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expensesApi.list(filters),
    staleTime: 1000 * 30,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      toast.success("Xarajat qo'shildi!")
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      toast.success("Xarajat o'chirildi")
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  })
}
