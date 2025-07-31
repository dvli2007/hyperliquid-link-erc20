import TransportNodeHid from '@ledgerhq/hw-transport-node-hid';
import AppEth from '@ledgerhq/hw-app-eth';

import { parseLinkErc20Args } from './utils/args'
import { getExtraWeiDecimals } from './utils/tokens'
import { actionHash, constructPhantomAgent, phantomDomain } from './utils/utils'

const main = async () => {
  const { network, contractAddress, tokenIndex } = parseLinkErc20Args()
  const isMainnet = network === 'mainnet';

  console.log(`\n✅ Network: ${network}`);
  console.log(`✅ Token Index: ${tokenIndex}`);
  console.log(`✅ Contract: ${contractAddress}`);

  const transport = await TransportNodeHid.create();
  const eth = new AppEth(transport);
  const derivationPath = "44'/60'/0'/0/0";
  const { address } = await eth.getAddress(derivationPath);
  console.log(`🔐 Ledger address: ${address}`);

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
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    primaryType: 'Agent',
    message: phantomAgent,
  }

  console.log('✍️ Prompting Ledger for EIP-712 signature...');
  console.log('TYPED DATA')
  console.log(typedData);
  const signature = await eth.signEIP712Message(derivationPath, typedData)
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
