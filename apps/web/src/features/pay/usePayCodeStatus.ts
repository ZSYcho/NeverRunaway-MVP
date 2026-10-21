import { encodePayCode, storeDepositContractAbi } from '@neverrunaway/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useConfig, useReadContract } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { findCharge, type SignedPayCode } from '../../tx/payCode.ts'

/** How often the customer's screen asks the chain whether the code was charged. */
const POLL_INTERVAL = 2_000

/**
 * Whether the store has charged the code, and the charge once it has. The customer's nonce moving
 * past the code's means a code with this nonce was charged; the Consume event says which, and for
 * how much.
 */
export function usePayCodeStatus({ code, fromBlock }: SignedPayCode) {
  const config = useConfig()
  const queryClient = useQueryClient()
  const nonce = useReadContract({
    // The app signs codes on its one chain.
    chainId: targetChain.id,
    address: code.store,
    abi: storeDepositContractAbi,
    functionName: 'nonces',
    args: [code.user],
    query: {
      refetchInterval: (query) =>
        query.state.data !== undefined && query.state.data > code.nonce ? false : POLL_INTERVAL,
    },
  })
  const charged = nonce.data !== undefined && nonce.data > code.nonce

  const charge = useQuery({
    queryKey: ['payCodeCharge', encodePayCode(code)],
    queryFn: async () => {
      const found = await findCharge(config, code, fromBlock)
      // An RPC node can serve the new nonce before it indexes the event; retrying covers that.
      if (!found) throw new Error('The charge is not indexed yet')
      return found
    },
    enabled: charged,
    retry: 5,
    retryDelay: 1_000,
  })

  // The store page under the dialog shows the new balance.
  useEffect(() => {
    if (charged) void queryClient.invalidateQueries()
  }, [charged, queryClient])

  return { charged, charge: charge.data }
}
