import test from "node:test";
import assert from "node:assert/strict";

import { createDetailNavigationCache } from "../js/ui/screens/detail/detailNavigationCache.js";

function createFixture() {
  let containerQueries = 0;
  let companyQueries = 0;
  const companyTrack = {
    querySelectorAll() {
      companyQueries += 1;
      return [{ id: "company-card" }];
    }
  };
  const container = {
    querySelectorAll(selector) {
      containerQueries += 1;
      return selector === ".detail-company-track" ? [companyTrack] : [{ selector }];
    }
  };
  return {
    container,
    counts: () => ({ containerQueries, companyQueries })
  };
}

test("detail navigation reuses its snapshot until the DOM changes", () => {
  const fixture = createFixture();
  let observerCallback = null;
  let disconnected = false;
  class FakeMutationObserver {
    constructor(callback) {
      observerCallback = callback;
    }

    observe() {}

    disconnect() {
      disconnected = true;
    }
  }

  const cache = createDetailNavigationCache(fixture.container, FakeMutationObserver);
  const first = cache.get();
  const second = cache.get();

  assert.equal(first, second);
  assert.deepEqual(fixture.counts(), { containerQueries: 12, companyQueries: 1 });

  observerCallback();
  const refreshed = cache.get();

  assert.notEqual(refreshed, first);
  assert.deepEqual(fixture.counts(), { containerQueries: 24, companyQueries: 2 });

  cache.disconnect();
  assert.equal(disconnected, true);
});

test("detail navigation stays fresh when MutationObserver is unavailable", () => {
  const fixture = createFixture();
  const cache = createDetailNavigationCache(fixture.container, undefined);

  assert.notEqual(cache.get(), cache.get());
  assert.deepEqual(fixture.counts(), { containerQueries: 24, companyQueries: 2 });
});
