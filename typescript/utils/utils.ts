import { encode } from '@msgpack/msgpack';
import { getBytes, keccak256 } from 'ethers';
import { normalizeTrailingZeros } from 'hyperliquid';

export const phantomDomain = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

export function actionHash(action: unknown, vaultAddress: string | null, nonce: number): string {
  // Normalize the action to remove trailing zeros from price and size fields
  const normalizedAction = normalizeTrailingZeros(action);

  const msgPackBytes = encode(normalizedAction);
  const additionalBytesLength = vaultAddress === null ? 9 : 29;
  const data = new Uint8Array(msgPackBytes.length + additionalBytesLength);
  data.set(msgPackBytes);
  const view = new DataView(data.buffer);
  view.setBigUint64(msgPackBytes.length, BigInt(nonce), false);
  if (vaultAddress === null) {
    view.setUint8(msgPackBytes.length + 8, 0);
  } else {
    view.setUint8(msgPackBytes.length + 8, 1);
    data.set(addressToBytes(vaultAddress), msgPackBytes.length + 9);
  }
  return keccak256(data);
}

export function addressToBytes(address: string): Uint8Array {
  return getBytes(address);
}

export function constructPhantomAgent(hash: string, isMainnet: boolean) {
  return { source: isMainnet ? 'a' : 'b', connectionId: hash };
}