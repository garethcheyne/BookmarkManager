import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning'

export interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastState {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    // Auto-remove after duration
    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}))

// Convenience functions
export function toast(options: Omit<ToastData, 'id'>) {
  useToastStore.getState().addToast(options)
}

toast.success = (title: string, description?: string) => {
  toast({ title, description, variant: 'success' })
}

toast.error = (title: string, description?: string) => {
  toast({ title, description, variant: 'destructive' })
}

toast.warning = (title: string, description?: string) => {
  toast({ title, description, variant: 'warning' })
}
