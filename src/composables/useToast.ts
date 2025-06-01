import { toast as sonnerToast } from 'vue-sonner'
import { h } from 'vue'
import CustomToast from '@/components/ui/custom-toast.vue'

type ToastOptions = {
  action?: {
    label: string
    onClick: () => void
  }
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  progress?: number
  duration?: number
}

export const toast = {
  custom: (message: string, options?: ToastOptions) =>
    sonnerToast.custom(
      () => h(CustomToast, {
        message,
        action: options?.action,
        variant: 'default',
        progress: options?.progress,
        onClose: () => sonnerToast.dismiss()
      }),
      {
        ...options,
        position: options?.position || 'bottom-right',
        duration: options?.duration || 5000
      }
    ),

  success: (message: string, options?: ToastOptions) =>
    sonnerToast.custom(
      () => h(CustomToast, {
        message,
        action: options?.action,
        variant: 'success',
        progress: options?.progress,
        onClose: () => sonnerToast.dismiss()
      }),
      {
        ...options,
        position: options?.position || 'bottom-right',
        duration: options?.duration || 5000
      }
    ),

  error: (message: string, options?: ToastOptions) =>
    sonnerToast.custom(
      () => h(CustomToast, {
        message,
        action: options?.action,
        variant: 'error',
        onClose: () => sonnerToast.dismiss()
      }),
      {
        ...options,
        position: options?.position || 'bottom-right',
        duration: options?.duration || 5000
      }
    ),

  info: (message: string, options?: ToastOptions) =>
    sonnerToast.custom(
      () => h(CustomToast, {
        message,
        action: options?.action,
        variant: 'info',
        onClose: () => sonnerToast.dismiss()
      }),
      {
        ...options,
        position: options?.position || 'bottom-right',
        duration: options?.duration || 5000
      }
    ),

  warning: (message: string, options?: ToastOptions) =>
    sonnerToast.custom(
      () => h(CustomToast, {
        message,
        action: options?.action,
        variant: 'warning',
        onClose: () => sonnerToast.dismiss()
      }),
      {
        ...options,
        position: options?.position || 'bottom-right',
        duration: options?.duration || 5000
      }
    ),

  promise: <T,>(
    promise: Promise<T>,
    data: {
      loading: string
      success: string
      error: string | ((err: any) => string)
    }
  ) => {
    const toastId = sonnerToast.custom(
      () => h(CustomToast, {
        message: data.loading,
        variant: 'promise',
        class: 'animate-spin',
        onClose: () => sonnerToast.dismiss(toastId)
      }),
      {
        position: 'bottom-right',
        duration: Infinity
      }
    )

    promise
      .then(() => {
        sonnerToast.custom(
          () => h(CustomToast, {
            message: data.success,
            variant: 'success',
            onClose: () => sonnerToast.dismiss()
          }),
          {
            position: 'bottom-right',
            duration: 5000
          }
        )
      })
      .catch((err) => {
        sonnerToast.custom(
          () => h(CustomToast, {
            message: typeof data.error === 'function' ? data.error(err) : data.error,
            variant: 'error',
            onClose: () => sonnerToast.dismiss()
          }),
          {
            position: 'bottom-right',
            duration: 5000
          }
        )
      })
      .finally(() => {
        sonnerToast.dismiss(toastId)
      })
  }
} 