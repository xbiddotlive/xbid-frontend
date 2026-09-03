import { ContestSkeleton } from "../../../loading";

export default function Loading() {
  return <main aria-busy="true" className="pageShell skeletonPage"><ContestSkeleton /></main>;
}
