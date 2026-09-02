import type { Address, Hex } from "viem";

export const contracts = {
  factory: "0x8f9208FD358c62FB4052e4C2FBbCA3152A17E4b6",
  registry: "0x0B68fD82965Fd853907CA4E2f7E6E6d478Aaef8b",
  riskController: "0xfeebdbB42de39B95f8dE5FcdBDd11e986443c278",
  feeVault: "0x82D9159cB488175cAcdcD145A7285d80563e69d0",
  settlementToken: "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0",
} as const satisfies Record<string, Address>;

export const demoContest = {
  contestId:
    (process.env.NEXT_PUBLIC_DEFAULT_CONTEST_ID ??
      "0xb73517e2deacfc81a60953d1545f6602b186483d3e9b59fc43a5a8e75497513d") as Hex,
  title: "Which side will command the live market?",
  category: "Live testnet contest",
  sideA: { name: "Side A", symbol: "XBIDA" },
  sideB: { name: "Side B", symbol: "XBIDB" },
  marketVault: "0xB48B4B842c0fCbc18Fd616d3F89DE87562A8c494",
  sideAToken: "0xFdFf0F040681b38A7275F8398338956296a8055C",
  sideBToken: "0x5530BA151C61FCB21Ba55D3f116B60cb402FCd14",
  marketVersion: 1,
} as const satisfies {
  contestId: Hex;
  title: string;
  category: string;
  sideA: { name: string; symbol: string };
  sideB: { name: string; symbol: string };
  marketVault: Address;
  sideAToken: Address;
  sideBToken: Address;
  marketVersion: number;
};

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "allowance", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const marketVaultAbi = [
  {
    type: "function",
    name: "previewBuy",
    stateMutability: "view",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "grossInputUnits", type: "uint256" },
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        components: [
          { name: "feeUnits", type: "uint256" },
          { name: "curveInputUnits", type: "uint256" },
          { name: "tokenOutputWei", type: "uint256" },
          { name: "qAAfterWei", type: "uint256" },
          { name: "qBAfterWei", type: "uint256" },
          { name: "reserveAfterUnits", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "grossInputUnits", type: "uint256" },
      { name: "minimumTokenOutputWei", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "referrer", type: "address" },
    ],
    outputs: [{ name: "tokenOutputWei", type: "uint256" }],
  },
  {
    type: "function",
    name: "qAWei",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "qA", type: "uint256" }],
  },
  {
    type: "function",
    name: "qBWei",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "qB", type: "uint256" }],
  },
  {
    type: "function",
    name: "reserveUnits",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "reserve", type: "uint256" }],
  },
] as const;

export const riskControllerAbi = [
  {
    type: "function",
    name: "effectiveMode",
    stateMutability: "view",
    inputs: [{ name: "market", type: "address" }],
    outputs: [{ name: "mode", type: "uint8" }],
  },
] as const;
