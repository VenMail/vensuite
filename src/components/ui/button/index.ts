import { type VariantProps, cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-none font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-red-900 dark:text-red-50 dark:hover:bg-red-800',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:border-gray-600 dark:bg-transparent dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-100',
        secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:bg-transparent dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-100',
        link: 'text-primary underline-offset-4 hover:underline dark:text-primary-400',
      },
      size: {
        default: 'h-10 px-4 py-3',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>