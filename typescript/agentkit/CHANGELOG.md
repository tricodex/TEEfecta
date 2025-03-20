# AgentKit Changelog

## 0.4.0

### Minor Changes

- [#513](https://github.com/coinbase/agentkit/pull/513) [`e826563`](https://github.com/coinbase/agentkit/commit/e826563297aeda2ecfdb7d600ea5ed3711a62eff) Thanks [@stat](https://github.com/stat)! - Added defillama action provider for find protocol, get protocol, and get token price

### Patch Changes

- [#573](https://github.com/coinbase/agentkit/pull/573) [`81b35a2`](https://github.com/coinbase/agentkit/commit/81b35a23916b2c344972fd1bcb0cbb85d01b2cbd) Thanks [@John-peterson-coinbase](https://github.com/John-peterson-coinbase)! - Fixed bug in Morpho action provider to allow depositing ERC20 tokens of variable decimal precision

## 0.3.0

### Minor Changes

- [#261](https://github.com/coinbase/agentkit/pull/261) [`674f6c8`](https://github.com/coinbase/agentkit/commit/674f6c83f12a081c2fd605e1bff094bbb4744c1c) Thanks [@phdargen](https://github.com/phdargen)! - Added a new action provider to interact with OpenSea

- [#115](https://github.com/coinbase/agentkit/pull/115) [`9261c42`](https://github.com/coinbase/agentkit/commit/9261c42e91fecbd6b384856cdfc7ad230ce6f73e) Thanks [@fernandofcampos](https://github.com/fernandofcampos)! - Added `alloraActionProvider` to fetch inferences from Allora Network.

## [0.2.3] - 2025-02-28

### Added

- [#392](https://github.com/coinbase/agentkit/pull/392) [`c5c1513`](https://github.com/coinbase/agentkit/commit/c5c1513933626bd6aef42652a875accb0c95d82e) Thanks [@mikeghen](https://github.com/mikeghen)! - Added `compoundActionProvider` to interact with Compound protocol on Base.

- [#465](https://github.com/coinbase/agentkit/pull/465) [`165360a`](https://github.com/coinbase/agentkit/commit/165360a108ccf1ce1142ebba875c86fbaa823a6c) Thanks [@CarsonRoscoe](https://github.com/CarsonRoscoe)! - Added SmartWalletProvider powered by CDP Smart Wallets

- [#487](https://github.com/coinbase/agentkit/pull/487) [`37d7083`](https://github.com/coinbase/agentkit/commit/37d70831cb0cfe1addb6a61c420c2a8d296bd64e) Thanks [@0xRAG](https://github.com/0xRAG)! - bump @coinbase/coinbase-sdk for support for Ed25519 API keys

### Fixed

- [#486](https://github.com/coinbase/agentkit/pull/486) [`bc4d4d2`](https://github.com/coinbase/agentkit/commit/bc4d4d219b706c4902ff402de49aae3d11c11952) Thanks [@stat](https://github.com/stat)! - use network id from saved wallet

- [#488](https://github.com/coinbase/agentkit/pull/488) [`d12bc8e`](https://github.com/coinbase/agentkit/commit/d12bc8e29c8a4dd8b36788e4e244eca7eddd575e) Thanks [@John-peterson-coinbase](https://github.com/John-peterson-coinbase)! - Fixed under-reporting CDP API metrics bug by properly adding source and source version when configuring the CDP SDK

- [#467](https://github.com/coinbase/agentkit/pull/467) [008f871](https://github.com/coinbase/agentkit/commit/008f871d1c9ebf4fcb5600584b066bdc6d69c8b9) Thanks [0xRAG](https://github.com/0xRAG)! - Fixed erc20 `get_balance` action to format erc20 balance with correct number of decimals.

## [0.2.2] - 2025-02-19

### Added

- Added support for fauceting SOL on `solana-devnet`.
- Added `JupiterActionProvider` with `swap` for Solana.

### Fixed

- Fixed handling of `CDP_API_KEY_PRIVATE_KEY` by moving parsing into CDP classes.
- Fixed handling of `TokenAccountNotFoundError` within `splActionProvider` `getBalance`.
- Fixed `wowActionProvider` exports, supported networks, and ensuring response parity with python.

## [0.2.1] - 2025-02-18

### Added

- Added `get_balance` to `splActionProvider` to fetch balance of an SPL token.
- Added support for Privy Server Wallets on Solana. See [here](https://github.com/coinbase/agentkit/blob/main/typescript/agentkit/README.md#privywalletprovider-solana) for more details.

## [0.2.0] - 2025-02-15

### Added

- Added gas configuration parameters (`gasLimitMultiplier`, `feePerGasMultiplier`) to `CdpWalletProvider` and `ViemWalletProvider`.
- Added `svmWalletProvider` with `solanaKeypairWalletProvider` implementation to create a Solana wallet with a local keypair.
- Added SPL action provider with `transfer` action.
- Added `privyWalletProvider` to use a Privy server wallet for agent actions.
- Added gas configuration parameters (`gasLimitMultiplier`, `feePerGasMultiplier`) to `CdpWalletProvider` and `ViemWalletProvider`.
- Added Solana chatbot example.
- Added Privy EVM chatbot exmaple.

## [0.1.2] - 2025-02-07

### Added

- Added `alchemyTokenPricesActionProvider` to fetch token prices from Alchemy.
- Added `token_prices_by_symbol` action to fetch token prices by symbol.
- Added `token_prices_by_address` action to fetch token prices by network and address pairs.
- Added `moonwellActionProvider` to interact with Moonwell protocol on Base
- Added `agentkit` source + source version tag to CDP API correlation header

### Fixed

- Added account argument in call to estimateGas in CdpWalletProvider
- Added explicit template type arguments for `ActionProvider` extensions

## [0.1.1] - 2025-02-02

### Added

- Added re-export for `./src/network/` in `./src/index.ts`

## [0.1.0] - 2025-02-01

### Added

- Added Action Provider Paradigm
- Added Wallet Provider Paradigm
- Refactored directory structure
- Updated package name to `@coinbase/agentkit`

## [0.0.14] - 2025-01-24

### Added

- Added `address_reputation` to retrieve the reputation score for an address
- Added `deploy_contract` action to deploy a contract using the Solidity compiler
- Added `farcaster_account_details` to retrieve farcaster account details
- Added `farcaster_post_cast` to post a cast to farcaster

## [0.0.13] - 2025-01-22

### Added

- Added `morpho_deposit` action to deposit to Morpho Vault.
- Added `morpho_withdrawal` action to withdraw from Morpho Vault.

## [0.0.12] - 2025-01-17

### Added

- Added `get_balance_nft` action.
- Added `transfer_nft` action.
- Added `pyth_fetch_price_feed_id` action to fetch the price feed ID for a given token symbol from Pyth.
- Added `pyth_fetch_price` action to fetch the price of a given price feed from Pyth.

### Fixed

- Allow wallet mnemonic seed import to optionally accept `networkId` input argument.

## [0.0.11] - 2025-01-13

### Added

- Added `wrap_eth` action to wrap ETH to WETH on Base.

## [0.0.10] - 2025-01-09

### Removed

- rogue console.log

## [0.0.9] - 2025-01-08

### Added

- Supporting mnemonic phrase wallet import

### Refactored

- Tests
- Use `ZodString.min(1)` instead of deprecated `ZodString.nonempty()`.

## [0.0.8] - 2024-12-09

### Added

- Twitter (X) Agentkit.
- Twitter (X) account details action to retrieve the authenticated user's information.
- Twitter (X) account mentions action to retrieve the authenticated user's mentions.
- Twitter (X) post tweet action to the authenticated user's feed.
- Twitter (X) post tweet reply action to any post.

## [0.0.7] - 2024-12-06

### Added

- Improved prompts for all actions.

## [0.0.6] - 2024-12-03

### Fixed

## [0.0.5] - 2024-11-29

### Added

Initial release of the CDP Node.js AgentKit.
