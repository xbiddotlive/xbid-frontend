import { DirectorySkeleton } from "../loading";

export default function Loading() {
  return <main aria-busy="true" className="pageShell utilityPage skeletonPage"><DirectorySkeleton /></main>;
}
