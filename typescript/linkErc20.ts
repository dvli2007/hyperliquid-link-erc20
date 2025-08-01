import dotenv from 'dotenv';
import { ethers } from 'ethers';

import { parseLinkErc20Args } from './utils/args'
import { getExtraWeiDecimals } from './utils/tokens'
import { actionHash, constructPhantomAgent, phantomDomain } from './utils/utils'

dotenv.config({ path: '../.env' });

const main = async () => {
  const { network, contractAddress, tokenIndex } = parseLinkErc20Args(true)
  const isMainnet = network === 'mainnet';

  await getExtraWeiDecimals(contractAddress, tokenIndex, isMainnet)

  console.log(`\n✅ Network: ${network}`);
  console.log(`✅ Token Index: ${tokenIndex}`);
  console.log(`✅ Contract: ${contractAddress}`);

  const signer = new ethers.Wallet(process.env.PRIVATE_ADDRESS!)
  console.log(`🔐 Wallet address: ${signer.address}`);

  const extraWeiDecimals = await getExtraWeiDecimals(contractAddress, tokenIndex, isMainnet)

  const nonce = Date.now()
  const action = {
    type: 'spotDeploy',
    requestEvmContract: {
      token: tokenIndex,
      address: contractAddress.toLowerCase(),
      evmExtraWeiDecimals: extraWeiDecimals,
    },
  }

  const hash = actionHash(action, null, nonce);
  console.log(`🔢 Action hash: ${hash}`, action);

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
