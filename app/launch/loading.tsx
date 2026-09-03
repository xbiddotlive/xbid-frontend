import { LaunchSkeleton } from "../loading";

export default function Loading() {
  return <main aria-busy="true" className="pageShell skeletonPage"><LaunchSkeleton /></main>;
}
