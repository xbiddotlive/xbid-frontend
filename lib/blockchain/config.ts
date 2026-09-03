import { getDefaultConfig } from "@rainbow-me/rainbowkit";
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

export const wagmiConfig = walletConnectEnabled
  ? getDefaultConfig({
      appName: "xbid.live",
      appDescription: "The live contest market",
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      chains: [robinhoodTestnet],
      projectId: walletConnectProjectId,
      ssr: true,
      storage,
      transports: {
        [robinhoodTestnet.id]: http(process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL),
      },
    })
  : createConfig({
      chains: [robinhoodTestnet],
      connectors: [injected()],
      ssr: true,
      storage,
      transports: {
        [robinhoodTestnet.id]: http(
          process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL,
        ),
      },
    });
