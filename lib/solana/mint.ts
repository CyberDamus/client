import { getAssociatedTokenAddress } from '@solana/spl-token'
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SendTransactionError,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MEMO_PROGRAM_ID,
  METADATA_EXTENSION_SPACE,
  MINT_FEE_LAMPORTS,
  PROGRAM_ID,
  RENT_SYSVAR_ID,
  SLOT_HASHES_SYSVAR_ID,
  SYSTEM_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMintAccountSize,
  getOraclePDA,
} from './constants'
import { serializeMintFortuneTokenInstruction } from './instructions'
import { getOracleData } from './oracle'

export interface MintResult {
  signature: string
  mint: PublicKey
  cards: number[]
  fortuneNumber: number
}

export interface MintError {
  message: string
  code?: string
  logs?: string[]
}

/**
 * Calculate total cost for minting (service fee + network fee)
 */
export async function calculateMintCost(connection: Connection): Promise<{
  serviceFee: number
  networkFee: number
  total: number
}> {
  // Calculate exact mint size with extensions
  const mintLen = getMintAccountSize()
  const totalSpace = mintLen + METADATA_EXTENSION_SPACE
  const rentLamports = await connection.getMinimumBalanceForRentExemption(totalSpace)

  // Network fee includes rent + transaction fee estimate
  // Transaction fee: ~5000 lamports per signature (2 signatures) + compute units (~0.002 SOL)
  const networkFee = (rentLamports / LAMPORTS_PER_SOL) + 0.002

  return {
    serviceFee: MINT_FEE_LAMPORTS / LAMPORTS_PER_SOL,  // 0.01 SOL to treasury
    networkFee,  // rent + tx fees (~0.012 SOL)
    total: (MINT_FEE_LAMPORTS / LAMPORTS_PER_SOL) + networkFee,
  }
}

/**
 * Check if user has enough balance for minting
 */
export async function checkUserBalance(
  connection: Connection,
  userPublicKey: PublicKey
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  const balance = await connection.getBalance(userPublicKey)

  // Calculate exact mint size with extensions
  const mintLen = getMintAccountSize()
  const totalSpace = mintLen + METADATA_EXTENSION_SPACE
  const rentLamports = await connection.getMinimumBalanceForRentExemption(totalSpace)

  const requiredLamports = MINT_FEE_LAMPORTS + rentLamports

  // Add buffer for transaction fees (5000 lamports ~ 0.000005 SOL)
  const required = (requiredLamports + 5000) / LAMPORTS_PER_SOL

  return {
    sufficient: balance >= requiredLamports + 5000,
    balance: balance / LAMPORTS_PER_SOL,
    required,
  }
}

/**
 * Simulate transaction before sending (dry-run)
 */
export async function simulateMintTransaction(
  connection: Connection,
  transaction: Transaction,
  userPublicKey: PublicKey
): Promise<{ success: boolean; error?: string }> {
  try {
    const simulation = await connection.simulateTransaction(transaction)

    if (simulation.value.err) {
      return {
        success: false,
        error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown simulation error',
    }
  }
}

/**
 * Main function: Mint CyberDamus Fortune Token-2022
 *
 * This creates a transaction that:
 * 1. Creates a new mint account (client-side keypair)
 * 2. Calls MintFortuneToken instruction
 *    - Transfers 0.01 SOL fee to treasury
 *    - Generates 3 Tarot cards on-chain (influenced by user query)
 *    - Initializes Token-2022 with Metadata Extension
 *    - Mints 1 token to user's ATA
 *
 * @param userQuery - Optional personalization query (max 256 characters)
 * @param attemptNumber - Retry attempt number for guaranteed memo uniqueness
 */
export async function mintFortuneToken(
  connection: Connection,
  userPublicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  userQuery?: string,
  attemptNumber: number = 1
): Promise<MintResult> {
  // 1. Get Oracle data
  const oracle = await getOracleData(connection)

  if (!oracle.isInitialized) {
    throw new Error('Oracle not initialized')
  }

  // 2. Derive PDAs
  const [oraclePDA] = getOraclePDA()

  // 3. Create new mint keypair (client-side)
  const mintKeypair = Keypair.generate()

  // 4. Calculate mint space and rent
  // Space: exact size for Mint + MetadataPointer + GroupPointer
  // Lamports: rent for full size (mint + metadata) to allow CPI reallocation
  const mintLen = getMintAccountSize()
  const totalSpace = mintLen + METADATA_EXTENSION_SPACE
  const rentLamports = await connection.getMinimumBalanceForRentExemption(totalSpace)

  // 5. Get user's associated token account address
  const userTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    userPublicKey,
    false, // allowOwnerOffCurve
    TOKEN_2022_PROGRAM_ID
  )

  // 6. Create mint account instruction
  // IMPORTANT: space = mintLen (only mint + pointer extensions)
  // The actual Metadata extension data will be added via CPI reallocation
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: userPublicKey,
    newAccountPubkey: mintKeypair.publicKey,
    lamports: rentLamports,      // Full lamports for mint + metadata
    space: mintLen,               // Space for mint + MetadataPointer + GroupPointer
    programId: TOKEN_2022_PROGRAM_ID,
  })

  // 7. Create MintFortuneToken instruction with optional user query
  const instructionData = serializeMintFortuneTokenInstruction(userQuery)

  const mintFortuneIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: oraclePDA, isSigner: false, isWritable: true }, // 0. Oracle account
      { pubkey: userPublicKey, isSigner: true, isWritable: true }, // 1. User (payer)
      { pubkey: oracle.treasury, isSigner: false, isWritable: true }, // 2. Treasury
      { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true }, // 3. Mint account
      { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // 4. User ATA
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, // 5. Token-2022
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // 6. ATA program
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }, // 7. System program
      { pubkey: RENT_SYSVAR_ID, isSigner: false, isWritable: false }, // 8. Rent sysvar
      { pubkey: SLOT_HASHES_SYSVAR_ID, isSigner: false, isWritable: false }, // 9. SlotHashes sysvar
    ],
    data: instructionData,
  })

  // 8. Create compute budget instruction (helps Phantom estimate fees correctly)
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300000, // ~300k CU for our transaction (createAccount + mintFortune)
  })

  // 8b. Add unique memo instruction to prevent duplicate transaction detection
  // PROBLEM: Solana RPC nodes cache getLatestBlockhash() for 2-4 seconds
  // If user clicks rapidly or retry happens, both calls get SAME blockhash from cache
  // Solana identifies duplicate by: blockhash + accounts + instruction data
  // SOLUTION: Add Memo with unique data (timestamp + random + attempt) to make each transaction unique
  // Format: "CyberDamus-{timestamp}-{random}-a{attempt}" creates unique signature even with same blockhash
  // Adding attempt number ensures memo is DIFFERENT on each retry even if timestamps are close
  const memoInstruction = new TransactionInstruction({
    keys: [{ pubkey: userPublicKey, isSigner: true, isWritable: false }],
    data: Buffer.from(`CyberDamus-${Date.now()}-${Math.random()}-a${attemptNumber}`, 'utf-8'),
    programId: MEMO_PROGRAM_ID,
  })

  // 9. Create transaction with memo to ensure uniqueness
  const transaction = new Transaction()
  transaction.add(computeBudgetIx, memoInstruction, createMintAccountIx, mintFortuneIx)

  // 10. Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  transaction.lastValidBlockHeight = lastValidBlockHeight
  transaction.feePayer = userPublicKey

  // 11. Sign transaction with mint keypair (mint must be signer)
  transaction.partialSign(mintKeypair)

  // 12. Sign transaction with user wallet (Phantom will estimate cost here)
  const signedTransaction = await signTransaction(transaction)

  // 13. Send transaction
  const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })

  console.log('Transaction sent:', signature)
  console.log(`Explorer: https://solana.fm/tx/${signature}?cluster=devnet-solana`)

  // 14. Confirm transaction
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  }, 'confirmed')

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
  }

  console.log('Transaction confirmed!')

  // 15. Return result
  // Note: We can't easily parse cards from logs here, so we return fortune number
  return {
    signature,
    mint: mintKeypair.publicKey,
    cards: [], // Will be parsed from token metadata later
    fortuneNumber: Number(oracle.totalFortunes) + 1,
  }
}

/**
 * Parse error from SendTransactionError with detailed categorization
 */
export function parseMintError(error: unknown): MintError {
  if (error instanceof SendTransactionError) {
    const logs = error.logs || []
    const errorMsg = error.message.toLowerCase()

    // 1. Already processed - RPC lag, transaction might be OK
    if (errorMsg.includes('already been processed') ||
      errorMsg.includes('already processed') ||
      errorMsg.includes('this transaction has already been processed')) {
      return {
        message: 'Transaction may have succeeded (RPC lag). Check your wallet in 30 seconds.',
        code: 'ALREADY_PROCESSED',
        logs,
      }
    }

    // 2. Insufficient funds - clear user action needed
    if (logs.some(log => log.toLowerCase().includes('insufficient funds')) ||
      logs.some(log => log.toLowerCase().includes('insufficient lamports'))) {
      return {
        message: 'Insufficient funds. You need at least 0.02 SOL.',
        code: 'INSUFFICIENT_FUNDS',
        logs,
      }
    }

    // 3. Blockhash not found - transaction took too long
    if (errorMsg.includes('blockhash not found') ||
      errorMsg.includes('block height exceeded')) {
      return {
        message: 'Transaction expired. Please try again.',
        code: 'BLOCKHASH_EXPIRED',
        logs,
      }
    }

    // 4. Account already in use - retry might help
    if (logs.some(log => log.includes('already in use'))) {
      return {
        message: 'Mint account conflict. Retrying...',
        code: 'ACCOUNT_IN_USE',
        logs,
      }
    }

    // 5. Network/RPC errors - retry might help
    if (errorMsg.includes('networkerror') ||
      errorMsg.includes('fetch failed') ||
      errorMsg.includes('timeout')) {
      return {
        message: 'Network error. Check your connection.',
        code: 'NETWORK_ERROR',
        logs,
      }
    }

    // 6. Simulation failed - check logs for details
    if (errorMsg.includes('simulation failed')) {
      // Try to extract specific error from logs
      const specificError = logs.find(log => log.includes('Error:') || log.includes('failed:'))
      return {
        message: specificError || 'Transaction simulation failed. Please try again.',
        code: 'SIMULATION_FAILED',
        logs,
      }
    }

    // 7. Generic transaction error
    return {
      message: error.message,
      code: 'TRANSACTION_ERROR',
      logs,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    }
  }

  return {
    message: 'An unknown error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
  }
}

/**
 * Retry logic for minting
 */
export async function mintFortuneTokenWithRetry(
  connection: Connection,
  userPublicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  userQuery?: string,
  maxRetries = 1 // don't touch this! should be only 1! 
): Promise<MintResult> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await mintFortuneToken(connection, userPublicKey, signTransaction, userQuery, attempt)
    } catch (error) {
      lastError = error
      console.error(`Attempt ${attempt} failed:`, error)

      // Check if this is "already processed" error - DON'T RETRY!
      // This means transaction was already sent, just RPC is laggy
      // Retrying will create a duplicate transaction
      if (error instanceof SendTransactionError) {
        const errorMsg = error.message.toLowerCase()
        if (errorMsg.includes('already been processed') ||
          errorMsg.includes('already processed') ||
          errorMsg.includes('this transaction has already been processed')) {
          console.log('⚠️ Transaction already processed - not retrying (RPC lag)')
          throw error  // Don't retry - transaction is already sent!
        }
      }

      if (attempt < maxRetries) {
        // Longer delay to ensure fresh blockhash (RPC caches 2-4 seconds)
        // 5s, 10s instead of 2s, 4s
        const delay = Math.pow(2, attempt) * 2500
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
