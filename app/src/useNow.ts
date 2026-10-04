import { useEffect, useState } from 'react'

/** Current time, refreshed periodically so expiring reports disappear without a reload. */
export function useNow(intervalMs = 60000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
