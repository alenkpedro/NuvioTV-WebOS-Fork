// Payload shape and progress rules ported from ysosrs123/NuvioTV-Fork.
// Original implementation: GPL-3.0, https://github.com/ysosrs123/NuvioTV-Fork

function numericId(value, minimum = 1) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum ? Math.trunc(number) : null;
}

export function normalizeMdbListProgress(value) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  // MDBList rejects values with more than two decimal places. Truncating also
  // prevents a value just below 80% from being rounded into "watched" state.
  return Math.trunc(clamped * 100) / 100;
}

export function buildMdbListScrobblePayload(context = {}) {
  const ids = {};
  const imdb = String(context.imdbId || "").trim();
  const tmdb = numericId(context.tmdbId);
  const trakt = numericId(context.traktId);
  if (imdb) ids.imdb = imdb;
  if (tmdb) ids.tmdb = tmdb;
  if (trakt) ids.trakt = trakt;

  if (!Object.keys(ids).length) return null;

  const payload = {
    progress: normalizeMdbListProgress(context.progressPercent)
  };

  if (context.contentType !== "series") {
    payload.movie = { ids };
    return payload;
  }

  const season = numericId(context.seasonNumber, 0);
  const episode = numericId(context.episodeNumber);
  if (season == null || !episode) return null;

  payload.show = {
    ids,
    season: {
      number: season,
      episode: { number: episode }
    }
  };
  return payload;
}
