// MDBList playback tracking ported from ysosrs123/NuvioTV-Fork.
// The Android implementation and its measured API behaviour remain credited
// to ysosrs123 under GPL-3.0. This file adapts that work to the webOS runtime.

import { MDBLIST_API_BASE_URL } from "../../config.js";
import { MdbListSettingsStore } from "../local/mdbListSettingsStore.js";
import { buildMdbListScrobblePayload } from "./mdbListScrobblePayload.js";

const API_BASE_URL = String(MDBLIST_API_BASE_URL || "https://api.mdblist.com/").replace(/\/+$/, "");
const START_DEBOUNCE_MS = 15000;
const DEDUP_WINDOW_MS = 8000;
const PROGRESS_WINDOW = 1.5;
const MAX_STOP_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;
const SERVER_OVERLOAD_DELAY_MS = 5000;

let startTimer = null;
let lastSuccessful = null;
let lastIssued = null;

function clearStartTimer() {
  if (startTimer) clearTimeout(startTimer);
  startTimer = null;
}

function currentSettings() {
  return MdbListSettingsStore.get();
}

function isReady(settings = currentSettings()) {
  return Boolean(settings.enabled && settings.trackingEnabled && String(settings.apiKey).trim());
}

function itemKey(context = {}) {
  if (context.contentType === "series") {
    return `${context.imdbId || context.tmdbId || context.traktId || "show"}:${context.seasonNumber || 0}:${context.episodeNumber || 0}`;
  }
  return String(
    context.imdbId || context.tmdbId || context.traktId || context.contentId || "movie"
  );
}

function shouldSkip(action, context) {
  const key = itemKey(context);
  if (action === "stop" && lastIssued?.action === "start" && lastIssued.key === key) {
    return false;
  }
  if (!lastSuccessful || Date.now() - lastSuccessful.timestampMs >= DEDUP_WINDOW_MS) {
    return false;
  }
  return (
    lastSuccessful.action === action &&
    lastSuccessful.key === key &&
    Math.abs(lastSuccessful.progress - Number(context.progressPercent || 0)) <= PROGRESS_WINDOW
  );
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function send(action, context = {}) {
  const settings = currentSettings();
  if (!isReady(settings) || shouldSkip(action, context)) return;

  const body = buildMdbListScrobblePayload(context);
  if (!body) return;

  const stamp = {
    action,
    key: itemKey(context),
    progress: Number(context.progressPercent || 0),
    timestampMs: Date.now()
  };
  lastIssued = stamp;
  const attempts = action === "stop" ? MAX_STOP_ATTEMPTS : 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/scrobble/${action}?apikey=${encodeURIComponent(String(settings.apiKey).trim())}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      );

      if (response.ok) {
        lastSuccessful = { ...stamp, timestampMs: Date.now() };
        return;
      }

      if (response.status === 404) {
        console.warn(`[MDBListScrobble] ${action} skipped: title was not found by MDBList`);
        return;
      }
      if (response.status === 429) {
        console.warn(`[MDBListScrobble] ${action} skipped: daily request limit reached`);
        return;
      }
      if (response.status < 500 || response.status > 599 || attempt === attempts) {
        console.warn(`[MDBListScrobble] ${action} failed (${response.status})`);
        return;
      }
      await wait(response.status >= 502 ? SERVER_OVERLOAD_DELAY_MS : RETRY_DELAY_MS * attempt);
    } catch (error) {
      if (attempt === attempts) {
        console.warn(`[MDBListScrobble] ${action} failed`, error);
        return;
      }
      await wait(RETRY_DELAY_MS * attempt);
    }
  }
}

export const MdbListScrobbleService = {
  isEnabled() {
    return isReady();
  },

  start(context) {
    clearStartTimer();
    startTimer = setTimeout(() => {
      startTimer = null;
      void send("start", context);
    }, START_DEBOUNCE_MS);
  },

  pause(context) {
    clearStartTimer();
    void send("stop", context);
  },

  stop(context) {
    clearStartTimer();
    void send("stop", context);
  },

  cancel() {
    clearStartTimer();
    lastSuccessful = null;
    lastIssued = null;
  }
};
