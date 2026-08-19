import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlayerLoadingStreamMetadata,
  buildPlayerTechnicalBadgeLabels
} from "../js/core/player/playerOverlayMetadata.js";

test("builds the fork-style active stream badges", () => {
  const labels = buildPlayerTechnicalBadgeLabels({
    behaviorHints: { videoSize: 14_173_405_184 },
    streamPresentation: {
      resolution: "2160p",
      encode: "HEVC",
      visualTags: ["HDR10"],
      audioTags: ["E-AC-3"],
      audioChannels: ["5.1"]
    }
  });

  assert.deepEqual(labels, ["4K", "13.2 GB", "HEVC", "HDR10", "E-AC-3 5.1"]);
});

test("uses the decoded video dimensions when stream quality is absent", () => {
  const labels = buildPlayerTechnicalBadgeLabels({}, { videoWidth: 1920, videoHeight: 1080 });
  assert.deepEqual(labels, ["1080p"]);
});

test("builds the fork-style loading source and filename", () => {
  const metadata = buildPlayerLoadingStreamMetadata(
    {
      addonName: "AIOStreams",
      providerName: "Real-Debrid",
      behaviorHints: { filename: "Narcos.Mexico.S02E01.1080p.mkv" }
    },
    { addonName: "AIOStreams" }
  );

  assert.deepEqual(metadata, {
    sourceLine: "AIOStreams · Real-Debrid",
    filename: "Narcos.Mexico.S02E01.1080p.mkv"
  });
});

test("loading metadata falls back to nested stream fields without duplicate providers", () => {
  const metadata = buildPlayerLoadingStreamMetadata({
    raw: {
      addonName: "Torrentio",
      clientResolve: {
        service: "Torrentio",
        filename: "episode.mkv"
      }
    }
  });

  assert.deepEqual(metadata, {
    sourceLine: "Torrentio",
    filename: "episode.mkv"
  });
});
