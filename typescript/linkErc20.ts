import { encode } from "@msgpack/msgpack";
import dotenv from 'dotenv';
import { ethers, getAddress, getBytes, isAddress, keccak256, Signature } from "ethers";
import { normalizeTrailingZeros } from "hyperliquid";

dotenv.config({ path: "../.env" });

const parseArgs = (): { network: 'mainnet' | 'testnet'; contractAddress: string; tokenIndex: number } => {
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

  if (!process.env.PRIVATE_ADDRESS) {
    console.log('Missing env variable PRIVATE_ADDRESS')
    process.exit(1)
  }

  return { network, contractAddress, tokenIndex }
}

const phantomDomain = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

function addressToBytes(address: string): Uint8Array {
  return getBytes(address);
}

function actionHash(action: unknown, vaultAddress: string | null, nonce: number): string {
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

function constructPhantomAgent(hash: string, isMainnet: boolean) {
  return { source: isMainnet ? 'a' : 'b', connectionId: hash };
}

const main = async () => {
  const { network, contractAddress, tokenIndex } = parseArgs()

  const signer = new ethers.Wallet(process.env.PRIVATE_ADDRESS!)

  const derivationPath = "44'/60'/0'/0/0";
  console.log("Signing with Address:", signer.address);

  const nonce = Date.now()
  const action = {
    "type": "spotDeploy",
    "requestEvmContract": {
      "token": tokenIndex,
      "address": contractAddress.toLowerCase(),
      "evmExtraWeiDecimals": 10,
    },
  }
  const hash = actionHash(action, null, nonce);
  const phantomAgent = constructPhantomAgent(hash, network === 'mainnet');
  const typedData = {
    domain: phantomDomain,
    types: {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
    },
    primaryType: 'Agent',
    message: phantomAgent,
  }
  const signatureRaw = await signer.signTypedData(typedData.domain, typedData.types, typedData.message)
  const signature = ethers.Signature.from(signatureRaw)

  const response = await fetch(`https://api.hyperliquid${network === 'testnet' ? '-testnet' : ''}.xyz/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, signature, nonce }), // recommended to send the same formatted action
  });
  const body = await response.json();
  console.log(body)
};

main();
