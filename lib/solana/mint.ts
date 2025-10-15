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
 *    - Generates 3 Tarot cards on-chain
 *    - Initializes Token-2022 with Metadata Extension
 *    - Mints 1 token to user's ATA
 */
export async function mintFortuneToken(
  connection: Connection,
  userPublicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
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

  // 7. Create MintFortuneToken instruction
  const instructionData = serializeMintFortuneTokenInstruction()

  const mintFortuneIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: oraclePDA, isSigner: false, isWritable: true }, // Oracle account
      { pubkey: userPublicKey, isSigner: true, isWritable: true }, // User (payer)
      { pubkey: oracle.treasury, isSigner: false, isWritable: true }, // Treasury
      { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true }, // Mint account
      { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // User ATA
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, // Token-2022
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // ATA program
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }, // System program
      { pubkey: RENT_SYSVAR_ID, isSigner: false, isWritable: false }, // Rent sysvar
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
  // SOLUTION: Add Memo with unique data (timestamp + random) to make each transaction unique
  // Format: "CyberDamus-{timestamp}-{random}" creates unique signature even with same blockhash
  const memoInstruction = new TransactionInstruction({
    keys: [{ pubkey: userPublicKey, isSigner: true, isWritable: false }],
    data: Buffer.from(`CyberDamus-${Date.now()}-${Math.random()}`, 'utf-8'),
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
 * Parse error from SendTransactionError
 */
export function parseMintError(error: unknown): MintError {
  if (error instanceof SendTransactionError) {
    const logs = error.logs || []

    // Check for simulation failed / already processed (RPC cache/timing issue)
    if (error.message.includes('Simulation failed') ||
        error.message.includes('already been processed') ||
        error.message.includes('This transaction has already been processed')) {
      return {
        message: 'Transaction timing issue. Please try again.',
        code: 'ALREADY_PROCESSED',
        logs,
      }
    }

    // Check for insufficient funds
    if (logs.some(log => log.includes('insufficient funds'))) {
      return {
        message: 'Insufficient funds. You need at least 0.02 SOL.',
        code: 'INSUFFICIENT_FUNDS',
        logs,
      }
    }

    // Check for account already in use
    if (logs.some(log => log.includes('already in use'))) {
      return {
        message: 'Mint account already exists. Please try again.',
        code: 'ACCOUNT_IN_USE',
        logs,
      }
    }

    // Generic transaction error
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
    message: 'An unknown error occurred',
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
  maxRetries = 3
): Promise<MintResult> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await mintFortuneToken(connection, userPublicKey, signTransaction)
    } catch (error) {
      lastError = error
      console.error(`Attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
