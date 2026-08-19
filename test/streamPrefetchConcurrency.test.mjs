import assert from "node:assert/strict";
import test from "node:test";

import { StreamRepository } from "../js/data/repository/streamRepository.js";

test("reuses an in-flight prefetch for the same playback target", async () => {
  const repository = new StreamRepository();
  let resolveRequest;
  repository.getStreamsFromAllAddons = () =>
    new Promise((resolve) => {
      resolveRequest = resolve;
    });

  const first = repository.prefetchStreams("series", "tt123:1:2", {
    season: 1,
    episode: 2
  });
  const duplicate = repository.prefetchStreams("series", "tt123:1:2", {
    season: 1,
    episode: 2
  });

  assert.equal(duplicate, first);
  assert.equal(repository.prefetchPromises.size, 1);

  resolveRequest({ status: "success", data: [{ streams: [{}] }] });
  await first;
  assert.equal(repository.prefetchPromises.size, 0);
});

test("keeps prefetches for different episodes independently joinable", async () => {
  const repository = new StreamRepository();
  const resolvers = new Map();
  repository.getStreamsFromAllAddons = (_type, videoId) =>
    new Promise((resolve) => {
      resolvers.set(videoId, resolve);
    });

  const episodeTwo = repository.prefetchStreams("series", "tt123:1:2", {
    season: 1,
    episode: 2
  });
  const episodeThree = repository.prefetchStreams("series", "tt123:1:3", {
    season: 1,
    episode: 3
  });
  const episodeTwoDuplicate = repository.prefetchStreams("series", "tt123:1:2", {
    season: 1,
    episode: 2
  });

  assert.notEqual(episodeTwo, episodeThree);
  assert.equal(episodeTwoDuplicate, episodeTwo);
  assert.equal(repository.prefetchPromises.size, 2);

  resolvers.get("tt123:1:2")({ status: "success", data: [{ streams: [{}] }] });
  resolvers.get("tt123:1:3")({ status: "success", data: [{ streams: [{}] }] });
  await Promise.all([episodeTwo, episodeThree]);
  assert.equal(repository.prefetchPromises.size, 0);
});

test("foreground playback consumes the matching prefetch instead of searching again", async () => {
  const repository = new StreamRepository();
  const prefetched = {
    status: "success",
    data: [{ addonId: "cached-addon", streams: [{ url: "https://example.test/video" }] }]
  };
  const key = repository.streamCacheKey("movie", "tt999", {});
  repository.prefetchPromises.set(key, Promise.resolve(prefetched));

  const result = await repository.getStreamsFromAllAddons("movie", "tt999");

  assert.equal(result, prefetched);
});
