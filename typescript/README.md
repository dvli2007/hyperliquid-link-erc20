# hyperliquid-link-erc20

## Setup

1. Install node

2. Install requirements: `npm i`

3. Set up your environment file: `cp env.example .env`

4. Add your deployer wallet private key into the `.env` file.

## Prerequisite

1. Deploy your ERC20 contract address on HyperEVM

2. Mint ERC20 tokens such that the token supply matches the spot token's total supply

3. Send all ERC20 tokens to its system address. The system address is the token index converted to hex (big-endian), and left-padded by 0's, and prefixed with `0x2`. For example, token index 200 would have a system address of `0x20000000000000000000000000000000000000c8`.

## Usage

```
npx ts-node linkErc20.ts <network> <erc20_contract_address> <token_index>
```

### Parameters

**network** - the Hyperliquid network you wish to perform the linking on; must be either `mainnet` or `testnet`.

**erc20_contract_address** - the address for your HyperEVM ERC20 contract

**token_index** - the token index for the spot token you wish to link


### Example

```
python3 link_erc20.py testnet 0x8cDE56336E289c028C8f7CF5c20283fF02272182 1
```

In the above example, we are linking PURR on Hyperliquid testnet to the ERC20 contract `0x8cDE56336E289c028C8f7CF5c20283fF02272182`.
