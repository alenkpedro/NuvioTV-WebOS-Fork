import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMdbListScrobblePayload,
  normalizeMdbListProgress
} from "../js/data/repository/mdbListScrobblePayload.js";

test("MDBList progress is clamped and truncated to two decimals", () => {
  assert.equal(normalizeMdbListProgress(79.999), 79.99);
  assert.equal(normalizeMdbListProgress(101), 100);
  assert.equal(normalizeMdbListProgress(-1), 0);
});

test("builds the MDBList movie payload used by the ysosrs123 fork", () => {
  assert.deepEqual(
    buildMdbListScrobblePayload({
      contentType: "movie",
      imdbId: "tt1234567",
      tmdbId: "42",
      progressPercent: 12.345
    }),
    {
      movie: { ids: { imdb: "tt1234567", tmdb: 42 } },
      progress: 12.34
    }
  );
});

test("builds a nested MDBList episode payload", () => {
  assert.deepEqual(
    buildMdbListScrobblePayload({
      contentType: "series",
      imdbId: "tt7654321",
      seasonNumber: 2,
      episodeNumber: 5,
      progressPercent: 50
    }),
    {
      show: {
        ids: { imdb: "tt7654321" },
        season: { number: 2, episode: { number: 5 } }
      },
      progress: 50
    }
  );
});

test("supports season zero specials", () => {
  assert.equal(
    buildMdbListScrobblePayload({
      contentType: "series",
      imdbId: "tt7654321",
      seasonNumber: 0,
      episodeNumber: 1,
      progressPercent: 5
    }).show.season.number,
    0
  );
});

test("rejects payloads without media identity or episode coordinates", () => {
  assert.equal(buildMdbListScrobblePayload({ contentType: "movie" }), null);
  assert.equal(
    buildMdbListScrobblePayload({ contentType: "series", imdbId: "tt123", seasonNumber: 1 }),
    null
  );
});
