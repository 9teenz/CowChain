'use client'

import { cn } from '@/lib/utils'

interface CowIconProps {
  className?: string
}

export function CowIcon({ className }: CowIconProps) {
  return (
    <img
      src="/icon.svg"
      alt="MilkChain Logo"
      className={cn('h-6 w-6 object-contain', className)}
      aria-hidden="true"
    />
  )
}
