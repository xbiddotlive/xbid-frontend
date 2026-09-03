import { LaunchBuilder } from "@/features/launch/components/launch-builder";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "launch a contest",
  description: "Create a two-sided XBID contest with immutable metadata and live onchain trading on Testnet.",
  path: "/launch",
});

export default function LaunchPage() {
  return <LaunchBuilder />;
}
