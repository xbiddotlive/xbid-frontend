import Link from "next/link";

export default function NotFound() {
  return (
    <main className="pageShell utilityPage">
      <div className="emptyState errorState">
        <strong>contest not found</strong>
        <span>the market may not be indexed on this network yet.</span>
        <Link className="button buttonPrimary" href="/">back to explore</Link>
      </div>
    </main>
  );
}
