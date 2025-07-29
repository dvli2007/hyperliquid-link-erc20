import argparse
import json
import os

import requests
from dotenv import load_dotenv
from eth_account import Account
from eth_account.signers.local import LocalAccount
from hyperliquid.info import Info
from hyperliquid.utils import constants
from hyperliquid.utils.signing import get_timestamp_ms, sign_l1_action
from web3 import Web3
from web3.middleware import SignAndSendRawMiddlewareBuilder


MAINNET_EVM_RPC = 'https://rpc.hyperliquid.xyz/evm'
TESTNET_EVM_RPC = 'https://rpc.hyperliquid-testnet.xyz/evm'


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('network', nargs=1)
    parser.add_argument('contract_address', nargs=1)
    parser.add_argument('token_index', nargs=1)
    return parser.parse_args()


def main():
    args = parse_args()
    network = args.network[0].lower()
    contract_address = args.contract_address[0].lower()
    token_index = int(args.token_index[0])

    if network == 'mainnet':
        L1_API_URL = constants.MAINNET_API_URL
        EVM_RPC_URL = MAINNET_EVM_RPC
    elif network == 'testnet':
        L1_API_URL = constants.TESTNET_API_URL
        EVM_RPC_URL = TESTNET_EVM_RPC
    else:
        raise Exception(f'Unrecognized network. Must be either "mainnet" or "testnet"')

    # Connect to the JSON-RPC endpoint
    w3 = Web3(Web3.HTTPProvider(EVM_RPC_URL))
    info = Info(L1_API_URL, skip_ws=True)
    try:
        token_info = info.spot_meta()['tokens'][token_index]
    except:
        raise Exception(f'Token for index {token_index} not found')

    # The account will be used for linking it to a native spot asset.
    account: LocalAccount = Account.from_key(os.getenv('PRIVATE_ADDRESS'))
    print(f'Running with address {account.address}')
    w3.middleware_onion.add(SignAndSendRawMiddlewareBuilder.build(account))
    w3.eth.default_account = account.address
    # Verify connection
    if not w3.is_connected():
        raise Exception(f'Failed to connect to network')

    # fetch information needed about erc20 token
    erc20_contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi='[{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"}]',
    )
    erc20_decimals = erc20_contract.functions.decimals().call()
    spot_token_name = token_info['name']
    spot_decimals = token_info['weiDecimals']
    extra_wei_decimals = min(max(erc20_decimals - spot_decimals, -2), 18)
    print(f'extra_wei_decimals={extra_wei_decimals}')

    print()
    print(f'You are about to link {spot_token_name} (index={token_index}) on {network.upper()} to ERC20 token {contract_address}.')
    print('This action is irreversible.')
    print()
    user_confirmation = input('Proceed (y/n)? ').lower()
    if user_confirmation != 'y':
        raise Exception('Aborted by user')

    print()
    print('Proceeding with linking...')

    assert contract_address is not None
    action = {
        "type": "spotDeploy",
        "requestEvmContract": {
            "token": token_index,
            "address": contract_address.lower(),
            "evmExtraWeiDecimals": extra_wei_decimals,
        },
    }
    nonce = get_timestamp_ms()
    signature = sign_l1_action(account, action, None, nonce, False)
    payload = {
        "action": action,
        "nonce": nonce,
        "signature": signature,
        "vaultAddress": None,
    }
    response = requests.post(L1_API_URL + "/exchange", json=payload)
    if response.ok:
        print(f'[{response.status_code}]', response.json())
    else:
        print(f'[{response.status_code}]', response.text)


if __name__ == '__main__':
    load_dotenv('.env')

    try:
        main()
    except Exception as e:
        print(f'FAIL: {e}')
