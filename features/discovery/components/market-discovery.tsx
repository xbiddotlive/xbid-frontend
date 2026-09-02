"use client";

import { useState } from "react";

import { ContestCard } from "@/components/contest/contest-card";
import type { IndexedContest } from "@/lib/api/contests";

type ViewMode = "list" | "grid";

type MarketDiscoveryProps = {
  contests: IndexedContest[];
  apiAvailable: boolean;
};

const categories = ["All", "Live now", "Crypto", "Sports", "Culture", "Technology"];

export function MarketDiscovery({ contests, apiAvailable }: MarketDiscoveryProps) {
  const [view, setView] = useState<ViewMode>("list");
  const [category, setCategory] = useState("All");
  const featured = contests[0];
  const visibleContests = category === "All" || category === "Live now" ? contests : [];

  return (
    <>
      <section className="featuredSection" aria-labelledby="featured-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Signal board</p>
            <h2 id="featured-heading">Recommended</h2>
          </div>
          <span className="sectionNote">The arena drawing attention now</span>
        </div>
        {featured ? (
          <ContestCard contest={featured} featured rank={1} />
        ) : (
          <div className="emptyState" data-testid="contest-empty-state">
            <strong>{apiAvailable ? "No featured contest yet" : "Live data is temporarily unavailable"}</strong>
            <span>{apiAvailable ? "The first live arena will appear automatically." : "The page will recover when the API reconnects."}</span>
          </div>
        )}
      </section>

      <section className="allMarketsSection" aria-labelledby="all-markets-heading">
        <div className="marketToolbar">
          <div>
            <p className="eyebrow">Explore every arena</p>
            <h2 id="all-markets-heading">All markets</h2>
          </div>
          <div className="viewToggle" aria-label="Market layout">
            <button aria-pressed={view === "list"} onClick={() => setView("list")} type="button">
              <span aria-hidden="true">☷</span> List
            </button>
            <button aria-pressed={view === "grid"} onClick={() => setView("grid")} type="button">
              <span aria-hidden="true">⊞</span> Cards
            </button>
          </div>
        </div>

        <div className="marketFilters" aria-label="Filter markets by category">
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="marketCollection" data-view={view}>
          {visibleContests.map((contest, index) => (
            <ContestCard key={contest.contestId} contest={contest} rank={index + 1} />
          ))}
        </div>

        {visibleContests.length === 0 && apiAvailable && (
          <div className="emptyState">
            <strong>No markets in this category yet</strong>
            <span>Launch the first contest and start the rivalry.</span>
          </div>
        )}
      </section>
    </>
  );
}
