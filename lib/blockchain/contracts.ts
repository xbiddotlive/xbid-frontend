import type { Address, Hex } from "viem";

export const contracts = {
  factory: (process.env.NEXT_PUBLIC_XBID_FACTORY_ADDRESS ?? "0x8f9208FD358c62FB4052e4C2FBbCA3152A17E4b6") as Address,
  registry: (process.env.NEXT_PUBLIC_XBID_REGISTRY_ADDRESS ?? "0x0B68fD82965Fd853907CA4E2f7E6E6d478Aaef8b") as Address,
  riskController: (process.env.NEXT_PUBLIC_XBID_RISK_CONTROLLER_ADDRESS ?? "0xfeebdbB42de39B95f8dE5FcdBDd11e986443c278") as Address,
  feeVault: (process.env.NEXT_PUBLIC_XBID_FEE_VAULT_ADDRESS ?? "0x82D9159cB488175cAcdcD145A7285d80563e69d0") as Address,
  settlementToken: (process.env.NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS ?? "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0") as Address,
} as const satisfies Record<string, Address>;

export const contestCreationFeeUnits = 5_000_000n;

export const factoryAbi = [
  {
    type: "function",
    name: "createContest",
    stateMutability: "nonpayable",
    inputs: [{
      name: "params",
      type: "tuple",
      components: [
        { name: "userSalt", type: "bytes32" },
        { name: "metadataHash", type: "bytes32" },
        { name: "metadataURI", type: "string" },
        { name: "sideAName", type: "string" },
        { name: "sideASymbol", type: "string" },
        { name: "sideBName", type: "string" },
        { name: "sideBSymbol", type: "string" },
      ],
    }],
    outputs: [
      { name: "contestId", type: "bytes32" },
      { name: "marketVault", type: "address" },
      { name: "sideAToken", type: "address" },
      { name: "sideBToken", type: "address" },
    ],
  },
  {
    type: "function",
    name: "computeContestId",
    stateMutability: "view",
    inputs: [
      { name: "creator", type: "address" },
      { name: "userSalt", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "contestId", type: "bytes32" }],
  },
  {
    type: "event",
    name: "ContestCreated",
    anonymous: false,
    inputs: [
      { name: "contestId", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "marketVault", type: "address", indexed: true },
      { name: "sideAToken", type: "address", indexed: false },
      { name: "sideBToken", type: "address", indexed: false },
      { name: "marketVersion", type: "uint32", indexed: false },
      { name: "metadataHash", type: "bytes32", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
] as const;

export const referenceContest = {
  contestId:
    (process.env.NEXT_PUBLIC_DEFAULT_CONTEST_ID ??
      "0xb73517e2deacfc81a60953d1545f6602b186483d3e9b59fc43a5a8e75497513d") as Hex,
  title: "which side will command the live market?",
  category: "live testnet contest",
  sideA: { name: "side a", symbol: "xbida" },
  sideB: { name: "side b", symbol: "xbidb" },
  marketVault: (process.env.NEXT_PUBLIC_REFERENCE_MARKET_VAULT_ADDRESS ?? "0xB48B4B842c0fCbc18Fd616d3F89DE87562A8c494") as Address,
  sideAToken: (process.env.NEXT_PUBLIC_REFERENCE_SIDE_A_TOKEN_ADDRESS ?? "0xFdFf0F040681b38A7275F8398338956296a8055C") as Address,
  sideBToken: (process.env.NEXT_PUBLIC_REFERENCE_SIDE_B_TOKEN_ADDRESS ?? "0x5530BA151C61FCB21Ba55D3f116B60cb402FCd14") as Address,
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

export const feeVaultAbi = [
  {
    type: "function",
    name: "claimable",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "amountUnits", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimPaused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "paused", type: "bool" }],
  },
  {
    type: "function",
    name: "claimFees",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "amountUnits", type: "uint256" }],
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
    name: "previewSell",
    stateMutability: "view",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "tokenInputWei", type: "uint256" },
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        components: [
          { name: "grossOutputUnits", type: "uint256" },
          { name: "feeUnits", type: "uint256" },
          { name: "netOutputUnits", type: "uint256" },
          { name: "qAAfterWei", type: "uint256" },
          { name: "qBAfterWei", type: "uint256" },
          { name: "reserveAfterUnits", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "previewFlip",
    stateMutability: "view",
    inputs: [
      { name: "sourceSide", type: "uint8" },
      { name: "sourceTokenInputWei", type: "uint256" },
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        components: [
          { name: "sourceGrossOutputUnits", type: "uint256" },
          { name: "feeUnits", type: "uint256" },
          { name: "destinationCurveInputUnits", type: "uint256" },
          { name: "destinationTokenOutputWei", type: "uint256" },
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
    name: "sell",
    stateMutability: "nonpayable",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "tokenInputWei", type: "uint256" },
      { name: "minimumNetOutputUnits", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "netOutputUnits", type: "uint256" }],
  },
  {
    type: "function",
    name: "flip",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sourceSide", type: "uint8" },
      { name: "sourceTokenInputWei", type: "uint256" },
      { name: "minimumDestinationTokenOutputWei", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "destinationTokenOutputWei", type: "uint256" }],
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
