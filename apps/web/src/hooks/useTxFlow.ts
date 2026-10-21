import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Hash } from 'viem'
import type { TxPhase, TxProgress } from '../tx/confirmAndWait.ts'

export type StepState = { phase: TxPhase; hash?: Hash }

/**
 * Runs a multi-step transaction flow and tracks each step's phase for the UI. Chain reads are
 * refreshed when the flow ends, whether it succeeded or not.
 */
export function useTxFlow<Step extends string>() {
  const queryClient = useQueryClient()
  const [steps, setSteps] = useState<Partial<Record<Step, StepState>>>({})
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>()

  const run = async (
    flow: (onProgress: (progress: TxProgress<Step>) => void) => Promise<unknown>,
  ) => {
    setStatus('running')
    setError(undefined)
    try {
      await flow(({ step, phase, hash }) =>
        setSteps((previous) => ({ ...previous, [step]: { phase, hash } })),
      )
      setStatus('success')
    } catch (caught) {
      setError(caught)
      setStatus('error')
    } finally {
      await queryClient.invalidateQueries()
    }
  }

  const reset = () => {
    setSteps({})
    setStatus('idle')
    setError(undefined)
  }

  return { run, reset, steps, status, error }
}

export type TxFlow<Step extends string> = ReturnType<typeof useTxFlow<Step>>
