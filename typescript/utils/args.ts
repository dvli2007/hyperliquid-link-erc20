import { getAddress, isAddress, } from 'ethers';

export type LinkErc20Args = {
  network: 'mainnet' | 'testnet'
  contractAddress: string
  tokenIndex: number
}

export type FinalizeEvmContractArgs = {
  network: 'mainnet' | 'testnet'
  tokenIndex: number
  createNonce: number | undefined
}

export const parseFinalizeEvmContractArgs = (checkPkey?: boolean): FinalizeEvmContractArgs => {
  const networkRaw = (process.argv[2] || '').toLowerCase()
  if (networkRaw !== 'mainnet' && networkRaw !== 'testnet') {
    console.log(`Unrecognized network: ${networkRaw}`)
    process.exit(1)
  }
  const network = networkRaw as 'mainnet' | 'testnet'

  const tokenIndexRaw = process.argv[3]
  let tokenIndex: number = 0
  try {
    tokenIndex = Number(tokenIndexRaw)
  } catch {
    console.log(`Token index is not a valid number: ${tokenIndexRaw}`)
    process.exit(1)
  }

  const createNonceRaw = process.argv[4]
  let createNonce: number | undefined = undefined
  if (createNonceRaw !== undefined) {
    createNonce = Number(createNonceRaw)
  }

  if (checkPkey && !process.env.PRIVATE_ADDRESS) {
    console.log('Missing env variable PRIVATE_ADDRESS')
    process.exit(1)
  }

  return { network, tokenIndex, createNonce }
}

export const parseLinkErc20Args = (checkPkey?: boolean): LinkErc20Args => {
  const networkRaw = (process.argv[2] || '').toLowerCase()
  if (networkRaw !== 'mainnet' && networkRaw !== 'testnet') {
    console.log(`Unrecognized network: ${networkRaw}`)
    process.exit(1)
  }
  const network = networkRaw as 'mainnet' | 'testnet'

  const contractAddressRaw = process.argv[3]
  if (!isAddress(contractAddressRaw)) {
    console.log(`Not an address: ${contractAddressRaw}`)
    process.exit(1)
  }
  const contractAddress = getAddress(contractAddressRaw)

  const tokenIndexRaw = process.argv[4]
  let tokenIndex: number = 0
  try {
    tokenIndex = Number(tokenIndexRaw)
  } catch {
    console.log(`Token index is not a valid number: ${tokenIndexRaw}`)
    process.exit(1)
  }

  if (checkPkey && !process.env.PRIVATE_ADDRESS) {
    console.log('Missing env variable PRIVATE_ADDRESS')
    process.exit(1)
  }

  return { network, contractAddress, tokenIndex }
}
