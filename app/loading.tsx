function Block({ className = "" }: { className?: string }) {
  return <i className={`skeletonBlock ${className}`} />;
}

function PageHeadingSkeleton() {
  return (
    <header className="skeletonHeading">
      <Block className="skeletonIcon" />
      <div>
        <Block className="skeletonLine skeletonLineShort" />
        <Block className="skeletonLine skeletonLineMedium" />
        <Block className="skeletonLine skeletonLineLong" />
      </div>
    </header>
  );
}

function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="skeletonStats">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeletonStat" key={index}>
          <Block className="skeletonLine skeletonLineShort" />
          <Block className="skeletonLine skeletonLineMedium" />
        </div>
      ))}
    </section>
  );
}

function HomeSkeleton() {
  return (
    <>
      <section className="skeletonHomeIntro">
        <div>
          <Block className="skeletonLine skeletonLineShort" />
          <Block className="skeletonLine skeletonLineLong" />
          <Block className="skeletonLine skeletonLineMedium" />
        </div>
        <Block className="skeletonIntroPanel" />
      </section>
      <StatsSkeleton />
      <section className="skeletonFeatured">
        <div className="skeletonFeaturedMain">
          <Block className="skeletonPill" />
          <Block className="skeletonLine skeletonLineLong" />
          <Block className="skeletonLine skeletonLineMedium" />
          <div className="skeletonSides"><Block /><Block /></div>
          <Block className="skeletonMeter" />
        </div>
        <Block className="skeletonFeaturedAction" />
      </section>
      <div className="skeletonToolbar"><Block className="skeletonLine skeletonLineMedium" /><Block className="skeletonButton" /></div>
      <section className="skeletonCardGrid">
        {Array.from({ length: 6 }, (_, index) => <Block className="skeletonMarketCard" key={index} />)}
      </section>
    </>
  );
}

export function LaunchSkeleton() {
  return (
    <>
      <PageHeadingSkeleton />
      <section className="skeletonLaunchWorkspace">
        <div className="skeletonFormPanel">
          <Block className="skeletonLine skeletonLineMedium" />
          <div className="skeletonFormGrid">
            <Block className="skeletonField skeletonFieldWide" />
            <Block className="skeletonField" />
            <Block className="skeletonField" />
            <Block className="skeletonField" />
            <Block className="skeletonField" />
            <Block className="skeletonField skeletonFieldTall skeletonFieldWide" />
            <Block className="skeletonField" />
            <Block className="skeletonField" />
            <Block className="skeletonField skeletonFieldWide" />
          </div>
        </div>
        <div className="skeletonPreviewPanel">
          <Block className="skeletonLine skeletonLineShort" />
          <Block className="skeletonPreviewCard" />
          <Block className="skeletonButton skeletonButtonWide" />
        </div>
      </section>
    </>
  );
}

export function ContestSkeleton() {
  return (
    <>
      <section className="skeletonContestHeading">
        <div><Block className="skeletonLine skeletonLineShort" /><Block className="skeletonLine skeletonLineLong" /></div>
        <Block className="skeletonButton" />
      </section>
      <Block className="skeletonScoreboard" />
      <section className="skeletonContestWorkspace">
        <div>
          <Block className="skeletonChart" />
          <Block className="skeletonTabs" />
          <Block className="skeletonTable" />
        </div>
        <div className="skeletonRightRail">
          <Block className="skeletonTradePanel" />
          <Block className="skeletonCommentPanel" />
        </div>
      </section>
    </>
  );
}

export function DirectorySkeleton() {
  return (
    <>
      <PageHeadingSkeleton />
      <StatsSkeleton />
      <div className="skeletonToolbar"><Block className="skeletonTabs" /><Block className="skeletonButton" /></div>
      <section className="skeletonList">
        {Array.from({ length: 7 }, (_, index) => <Block className="skeletonListRow" key={index} />)}
      </section>
    </>
  );
}

export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" className="pageShell skeletonPage" role="status">
      <span className="visuallyHidden">loading page content</span>
      <div aria-hidden="true"><HomeSkeleton /></div>
    </main>
  );
}
