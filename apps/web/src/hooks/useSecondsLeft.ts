import { useEffect, useState } from 'react'
import { nowInSeconds } from '../lib/time.ts'

/**
 * Seconds until `deadline` (unix seconds), updated every second; negative once it has passed.
 * `clockOffset` is how far the device clock runs behind the chain.
 */
export function useSecondsLeft(deadline: bigint, clockOffset = 0n): number {
  const read = () => Number(deadline - nowInSeconds() - clockOffset)
  const [secondsLeft, setSecondsLeft] = useState(read)

  useEffect(() => {
    const update = () => setSecondsLeft(Number(deadline - nowInSeconds() - clockOffset))
    update()
    const timer = setInterval(update, 1_000)
    return () => clearInterval(timer)
  }, [deadline, clockOffset])

  return secondsLeft
}
