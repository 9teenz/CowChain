const developers = [
  {
    name: 'Роман Русланович',
    telegram: 'romasishu',
    href: 'https://t.me/romasishu',
  },
  {
    name: 'Евгений Александрович',
    telegram: 'scxlpxr',
    href: 'https://t.me/scxlpxr',
  },
  {
    name: 'Сергей Александрович',
    telegram: 'IQiwei',
    href: 'https://t.me/IQiwei',
  },
]

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z" />
    </svg>
  )
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Contact</h1>
      <p className="mt-3 text-muted-foreground">
        Свяжитесь с командой разработчиков MilkChain напрямую через Telegram.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {developers.map((dev) => (
          <a
            key={dev.telegram}
            href={dev.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center transition-all duration-200 hover:border-[#2AABEE]/50 hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2AABEE]/10 transition-colors group-hover:bg-[#2AABEE]/20">
              <TelegramIcon className="h-7 w-7 text-[#2AABEE]" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{dev.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">@{dev.telegram}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
