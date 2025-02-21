# hyperliquid-link-erc20

## Setup

1. Install python3

2. Install requirements: `pip install -r requirements.txt`*
  \**Hint: it's helpful to spin up a python virtual environment for installing the requirements. Run `python3 -m venv venv` to set up a virtual environment.*

3. Set up your environment file: `cp env.example .env`

4. Add your deployer wallet private key into the `.env` file.

## Prerequisite

1. Deploy your ERC20 contract address on HyperEVM

2. Mint ERC20 tokens such that the token supply matches the spot token's total supply

3. Send all ERC20 tokens to `0x2222222222222222222222222222222222222222`

## Usage

```
python3 link_erc20.py <network> <erc20_contract_address> <token_index>
```

### Parameters

**network** - the Hyperliquid network you wish to perform the linking on; must be either `mainnet` or `testnet`.

**erc20_contract_address** - the address for your HyperEVM ERC20 contract

**token_index** - the token index for the spot token you wish to link


### Example

```
python3 link_erc20.py testnet 0x8cDE56336E289c028C8f7CF5c20283fF02272182 PURR 1
```

In the above example, we are linking PURR on Hyperliquid testnet to the ERC20 contract `0x8cDE56336E289c028C8f7CF5c20283fF02272182`.
