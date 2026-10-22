import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return <select className={cn('forge-select', className)} {...props}>{children}</select>
}
