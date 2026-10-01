'use client'

import { useEffect, useState } from 'react'

interface SaleCountdownProps {
  /** ISO string dari API, Date dari server, atau null untuk tanpa batas waktu. */
  endsAt: string | Date | null
}

function format(totalSeconds: number): string {
  const pad = (part: number) => String(part).padStart(2, '0')

  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  return days > 0
    ? `${days} hari ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * Countdown for a discount window. Purely cosmetic: whether the discount
 * actually applies is decided by `lib/pricing` on the server, so a wrong or
 * deliberately changed client clock cannot buy anything at the sale price.
 *
 * Renders nothing until the first tick on the client — the server has no
 * meaningful "now" to render, and guessing one causes a hydration mismatch.
 */
export default function SaleCountdown({ endsAt }: SaleCountdownProps) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    if (!endsAt) return

    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [endsAt])

  if (!endsAt || now === null) return null

  const remaining = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1_000))

  if (remaining <= 0) {
    return <span className="text-xs font-medium text-red-600">Penawaran berakhir</span>
  }

  return (
    <span className="text-xs font-medium text-orange-600">
      Berakhir dalam <span className="tabular-nums">{format(remaining)}</span>
    </span>
  )
}
