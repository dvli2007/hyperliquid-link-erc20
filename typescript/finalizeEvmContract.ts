import dotenv from 'dotenv';
import { ethers } from 'ethers';

import { parseFinalizeEvmContractArgs } from './utils/args'
import { actionHash, constructPhantomAgent, phantomDomain } from './utils/utils'

dotenv.config({ path: '../.env' });

const main = async () => {
  const { network, tokenIndex, createNonce } = parseFinalizeEvmContractArgs(true)
  const isMainnet = network === 'mainnet';

  console.log(`\n✅ Network: ${network}`);
  console.log(`✅ Token Index: ${tokenIndex}`);

  const signer = new ethers.Wallet(process.env.PRIVATE_ADDRESS!)
  console.log(`🔐 Wallet address: ${signer.address}`);

  const nonce = Date.now()
  const action = {
    type: 'finalizeEvmContract',
    token: tokenIndex,
    input: createNonce === undefined ? 'firstStorageSlot' : { create: { nonce: createNonce } },
  }

  const hash = actionHash(action, null, nonce);
  console.log(`🔢 Action hash: ${hash}`);

  const phantomAgent = constructPhantomAgent(hash, isMainnet);
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
  console.log('✍️ Prompting Wallet for EIP-712 signature...');
  console.log('TYPED DATA')
  console.log(typedData);
  const signatureRaw = await signer.signTypedData(typedData.domain, typedData.types, typedData.message)
  const signature = ethers.Signature.from(signatureRaw)
  console.log('📜 Signature:', signature);

  const endpoint = `https://api.hyperliquid${isMainnet ? '' : '-testnet'}.xyz/exchange`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, signature, nonce }), // recommended to send the same formatted action
  });

  const body = await response.json();
  console.log('📬 API Response:', body);
};

main();
