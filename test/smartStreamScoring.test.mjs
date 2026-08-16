import test from "node:test";
import assert from "node:assert/strict";

import {
  rankSmartStreams,
  scoreSmartStream
} from "../js/core/streams/smartStreamScoring.js";
import {
  isAutoPlayEffectivelyEnabled,
  selectAutoPlayStream
} from "../js/core/streams/streamAutoPlaySelector.js";

function stream(id, title, extras = {}) {
  return { id, title, url: `https://example.test/${id}.mkv`, ...extras };
}

test("recognizes common Brazilian Portuguese release labels", () => {
  for (const label of [
    "Filme.2160p.PT-BR.WEB-DL",
    "Filme.1080p.POB",
    "Filme 1080p Português Brasil",
    "Filme 720p Dublado"
  ]) {
    assert.equal(scoreSmartStream(stream("pt", label)).facts.language, "PT_BR", label);
  }
});

test("treats Dual Audio as multilingual without claiming PT-BR", () => {
  const result = scoreSmartStream(stream("dual", "Movie 1080p Dual Audio WEB-DL"));
  assert.equal(result.facts.language, "MULTI");
  assert.ok(result.reasons.includes("Dual áudio"));
});

test("ranks PT-BR and webOS-friendly audio above a larger incompatible release", () => {
  const ranked = rankSmartStreams([
    stream("lossless", "Movie 2160p REMUX TrueHD DTS-HD 95GB"),
    stream("preferred", "Movie 2160p PT-BR WEB-DL EAC3 HDR10")
  ]);
  assert.equal(ranked[0].stream.id, "preferred");
});

test("penalizes CAM releases even when labelled 4K", () => {
  const cam = scoreSmartStream(stream("cam", "Movie 4K PT-BR HDCAM"));
  const web = scoreSmartStream(stream("web", "Movie 1080p WEB-DL"));
  assert.ok(web.score > cam.score);
});

test("SMART autoplay selects the highest playable score and explains it", () => {
  const selected = selectAutoPlayStream(
    [
      stream("first", "Movie 720p WEBRip"),
      stream("best", "Movie 2160p PT-BR WEB-DL EAC3 HDR")
    ],
    { mode: "SMART" }
  );
  assert.equal(selected.id, "best");
  assert.ok(selected.smartSelection.score > 0);
  assert.ok(selected.smartSelection.reasons.includes("PT-BR"));
  assert.equal(isAutoPlayEffectivelyEnabled({ streamAutoPlayMode: "SMART" }), true);
});

