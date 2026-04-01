'use client'

import { cn } from '@/lib/utils'

interface CowIconProps {
  className?: string
}

export function CowIcon({ className }: CowIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-6', className)}
    >
      {/* Ears */}
      <ellipse
        cx="12"
        cy="18"
        rx="8"
        ry="6"
        fill="currentColor"
        className="opacity-80"
      />
      <ellipse
        cx="52"
        cy="18"
        rx="8"
        ry="6"
        fill="currentColor"
        className="opacity-80"
      />
      <ellipse
        cx="12"
        cy="18"
        rx="5"
        ry="3.5"
        fill="currentColor"
        className="opacity-40"
      />
      <ellipse
        cx="52"
        cy="18"
        rx="5"
        ry="3.5"
        fill="currentColor"
        className="opacity-40"
      />
      
      {/* Head */}
      <ellipse
        cx="32"
        cy="32"
        rx="22"
        ry="20"
        fill="currentColor"
      />
      
      {/* Horns */}
      <path
        d="M14 12 C10 4, 6 6, 8 14"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        className="opacity-70"
      />
      <path
        d="M50 12 C54 4, 58 6, 56 14"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        className="opacity-70"
      />
      
      {/* Snout */}
      <ellipse
        cx="32"
        cy="44"
        rx="14"
        ry="10"
        fill="currentColor"
        className="opacity-60"
      />
      
      {/* Nostrils */}
      <ellipse
        cx="26"
        cy="45"
        rx="3"
        ry="2.5"
        className="fill-background"
      />
      <ellipse
        cx="38"
        cy="45"
        rx="3"
        ry="2.5"
        className="fill-background"
      />
      
      {/* Eyes */}
      <ellipse
        cx="22"
        cy="28"
        rx="4"
        ry="5"
        className="fill-background"
      />
      <ellipse
        cx="42"
        cy="28"
        rx="4"
        ry="5"
        className="fill-background"
      />
      <ellipse
        cx="23"
        cy="29"
        rx="2"
        ry="2.5"
        fill="currentColor"
        className="opacity-90"
      />
      <ellipse
        cx="43"
        cy="29"
        rx="2"
        ry="2.5"
        fill="currentColor"
        className="opacity-90"
      />
      
      {/* Spots (decorative) */}
      <circle
        cx="18"
        cy="36"
        r="3"
        fill="currentColor"
        className="opacity-30"
      />
      <circle
        cx="46"
        cy="34"
        r="2.5"
        fill="currentColor"
        className="opacity-30"
      />
    </svg>
  )
}
