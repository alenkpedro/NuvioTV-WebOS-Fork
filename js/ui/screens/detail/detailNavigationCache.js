const DETAIL_NAVIGATION_SELECTORS = Object.freeze({
  actions: ".series-detail-actions .focusable",
  seasons: ".series-season-row .series-season-btn.focusable",
  episodes: ".series-episode-track .series-episode-card.focusable",
  insightTabs: ".series-insight-tabs .series-insight-tab.focusable",
  seriesCastCards: ".series-cast-track .series-cast-card.focusable",
  movieCastCards: ".movie-cast-track .movie-cast-card.focusable",
  ratingSeasons: ".series-rating-seasons .series-rating-season.focusable",
  ratingChips: ".series-episode-ratings-grid .series-episode-rating-chip.focusable",
  moreLikeCards: ".detail-morelike-track .detail-morelike-card.focusable",
  commentModes: ".detail-comments-modes .detail-comments-mode.focusable",
  commentCards: ".detail-comments-track .detail-comment-card.focusable",
  companyTracks: ".detail-company-track"
});

export function collectDetailNavigation(container) {
  const snapshot = {};
  Object.entries(DETAIL_NAVIGATION_SELECTORS).forEach(([key, selector]) => {
    snapshot[key] = Array.from(container?.querySelectorAll?.(selector) || []);
  });
  snapshot.companyCards = snapshot.companyTracks.map((track) =>
    Array.from(track.querySelectorAll(".detail-company-card.focusable"))
  );
  return snapshot;
}

export function createDetailNavigationCache(
  container,
  MutationObserverCtor = globalThis.MutationObserver
) {
  let snapshot = null;
  const canObserve = typeof MutationObserverCtor === "function" && Boolean(container);
  const observer = canObserve
    ? new MutationObserverCtor(() => {
        snapshot = null;
      })
    : null;

  observer?.observe(container, { childList: true, subtree: true });

  return {
    get() {
      if (!canObserve) {
        return collectDetailNavigation(container);
      }
      snapshot ||= collectDetailNavigation(container);
      return snapshot;
    },

    invalidate() {
      snapshot = null;
    },

    disconnect() {
      observer?.disconnect();
      snapshot = null;
    }
  };
}
