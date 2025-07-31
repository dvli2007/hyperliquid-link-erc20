import { ethers } from 'ethers';
import { Hyperliquid } from 'hyperliquid';

const mainnetHyperliquidSDK = new Hyperliquid({ enableWs: false, testnet: false });
const testnetHyperliquidSDK = new Hyperliquid({ enableWs: false, testnet: true });

const mainnetEvmProvider = new ethers.JsonRpcProvider('https://rpc.hyperliquid.xyz/evm', 999);
const testnetEvmProvider = new ethers.JsonRpcProvider('https://rpc.hyperliquid-testnet.xyz/evm', 998);

const getSDK = (isMainnet: boolean): Hyperliquid =>
  isMainnet ? mainnetHyperliquidSDK : testnetHyperliquidSDK

const getEvmProvider = (isMainnet: boolean) =>
  isMainnet ? mainnetEvmProvider : testnetEvmProvider

export const getSpotMeta = async (tokenIndex: number, isMainnet: boolean) => {
  const sdk = getSDK(isMainnet)
  const { tokens } = await sdk.info.spot.getSpotMeta()
  for (const token of tokens || []) {
    if (token.index === tokenIndex) {
      return token
    }
  }
  return undefined
}

export const getTokenDecimals = async (contractAddress: string, isMainnet: boolean): Promise<number | undefined> => {
  const abi = [
    "function name() public view returns (string)",
    "function symbol() public view returns (string)",
    "function decimals() public view returns (uint8)",
    "function totalSupply() public view returns (uint256)",
  ]
  const provider = getEvmProvider(isMainnet)
  const contract = new ethers.Contract(contractAddress, abi, provider)
  const decimals = await contract.decimals!()
  return Number(decimals)
}

export const getExtraWeiDecimals = async (contractAddress: string, tokenIndex: number, isMainnet: boolean) => {
  const spotMeta = await getSpotMeta(tokenIndex, isMainnet)
  if (!spotMeta) {
    throw Error(`TokenIndex does not exist: ${tokenIndex}`)
  }
  const { weiDecimals: spotDecimals } = spotMeta

  const evmDecimals = await getTokenDecimals(contractAddress, isMainnet)
  if (evmDecimals === undefined) {
    throw Error(`Contract does not have decimals: ${contractAddress}`)
  }

  return Math.min(Math.max(evmDecimals - spotDecimals, -2), 18)
}
