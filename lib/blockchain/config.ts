import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { robinhoodTestnet } from "./chain";

const localhostProjectId = "b56e18d47c72ab683b10814fe9495694";
const configuredProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim()
  || process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim();

export const walletConnectProjectId = configuredProjectId
  || (process.env.NODE_ENV === "development" ? localhostProjectId : "");
export const walletConnectEnabled = walletConnectProjectId.length > 0;

const storage = createStorage({ storage: cookieStorage });

const connectors = walletConnectEnabled
  ? connectorsForWallets([{
      groupName: "recommended",
      wallets: [
        injectedWallet,
        () => walletConnectWallet({ projectId: walletConnectProjectId }),
      ],
    }], {
      appName: "xbid.live",
      appDescription: "The live contest market",
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      projectId: walletConnectProjectId,
    })
  : [injected()];

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet],
  connectors,
  ssr: true,
  storage,
  transports: {
    // Keep the real RPC URL in chain metadata for wallets. Browser reads use
    // our same-origin boundary so privacy extensions do not block the RPC host.
    [robinhoodTestnet.id]: http(
      typeof window !== "undefined" && [5042, 5042002].includes(robinhoodTestnet.id)
        ? "/api/chain" : robinhoodTestnet.rpcUrls.default.http[0],
      { timeout: 20_000 },
    ),
  },
});
