import { DirectorySkeleton } from "../loading";

export default function Loading() {
  return <main aria-busy="true" className="pageShell skeletonPage"><DirectorySkeleton /></main>;
}
