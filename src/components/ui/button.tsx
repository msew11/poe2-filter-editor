import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4 [&_svg]:shrink-0',
  { variants: {
    variant: {
      default: 'border border-primary/60 bg-primary/15 text-primary hover:bg-primary/25',
      outline: 'border border-border bg-card text-foreground hover:bg-accent',
      ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
    },
    size: { default: 'h-9 px-3.5', sm: 'h-8 px-2.5 text-xs', icon: 'size-8' },
  }, defaultVariants: { variant: 'default', size: 'default' } },
)

function Button({ className, variant, size, type = 'button', ...props }: ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button data-slot="button" type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
