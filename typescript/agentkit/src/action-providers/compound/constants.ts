import { Address } from "viem";
import { abi as ERC20_ABI } from "../erc20/constants";

export const SUPPORTED_NETWORKS = ["base-mainnet", "base-sepolia"];

export const COMET_ADDRESSES: Record<string, Address> = {
  "base-mainnet": "0xb125E6687d4313864e53df431d5425969c15Eb2F",
  "base-sepolia": "0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017",
};

export const ASSET_ADDRESSES: Record<string, Record<string, Address>> = {
  "base-mainnet": {
    weth: "0x4200000000000000000000000000000000000006",
    cbeth: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
    cbbtc: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    wsteth: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  "base-sepolia": {
    weth: "0x4200000000000000000000000000000000000006",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    wsteth: "0x774eD9EDB0C5202dF9A86183804b5D9E99dC6CA3",
  },
};

// Re-export the ERC20 ABI from the erc20 action provider constants
export { ERC20_ABI };

export const COMET_ABI = [
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "priceFeed", type: "address" }],
    name: "getPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "borrowBalanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "numAssets",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint8", name: "i", type: "uint8" }],
    name: "getAssetInfo",
    outputs: [
      {
        components: [
          { internalType: "uint8", name: "offset", type: "uint8" },
          { internalType: "address", name: "asset", type: "address" },
          { internalType: "address", name: "priceFeed", type: "address" },
          { internalType: "uint64", name: "scale", type: "uint64" },
          { internalType: "uint64", name: "borrowCollateralFactor", type: "uint64" },
          { internalType: "uint64", name: "liquidateCollateralFactor", type: "uint64" },
          { internalType: "uint64", name: "liquidationFactor", type: "uint64" },
          { internalType: "uint128", name: "supplyCap", type: "uint128" },
        ],
        internalType: "struct CometCore.AssetInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "baseToken",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "baseTokenPriceFeed",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "asset", type: "address" },
    ],
    name: "collateralBalanceOf",
    outputs: [{ internalType: "uint128", name: "balance", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const PRICE_FEED_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
