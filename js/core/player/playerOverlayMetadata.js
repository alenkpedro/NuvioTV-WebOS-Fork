function firstText(values = []) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function asList(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
}

function formatSizeBadge(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const gibibytes = bytes / 1_073_741_824;
  if (gibibytes >= 1) {
    const rounded = gibibytes.toFixed(1);
    return `${rounded.endsWith(".0") ? rounded.slice(0, -2) : rounded} GB`;
  }
  const mebibytes = bytes / 1_048_576;
  return mebibytes > 0 ? `${Math.max(1, Math.round(mebibytes))} MB` : "";
}

function formatQualityBadge(value, width = 0, height = 0) {
  const text = String(value || "").trim();
  const search = `${text} ${width}x${height}`.toLowerCase();
  if (search.includes("4320") || search.includes("8k")) return "8K";
  if (search.includes("2160") || search.includes("4k")) return "4K";
  if (search.includes("1440")) return "1440p";
  if (search.includes("1080")) return "1080p";
  if (search.includes("720")) return "720p";
  if (search.includes("576")) return "576p";
  if (search.includes("480")) return "480p";
  return text;
}

export function buildPlayerTechnicalBadgeLabels(stream = {}, playback = {}) {
  const raw = stream.raw || {};
  const presentation = stream.streamPresentation || raw.streamPresentation || {};
  const behaviorHints = stream.behaviorHints || raw.behaviorHints || {};
  const quality = formatQualityBadge(
    firstText([presentation.resolution, presentation.quality]),
    Number(playback.videoWidth || 0),
    Number(playback.videoHeight || 0)
  );
  const size = formatSizeBadge(
    presentation.size || behaviorHints.videoSize || stream.videoSize || raw.videoSize || raw.size
  );
  const encode = firstText([presentation.encode, stream.videoCodec, raw.videoCodec]);
  const visualTags = asList(presentation.visualTags).slice(0, 2);
  const audioTags = asList(presentation.audioTags);
  const audioChannels = asList(presentation.audioChannels);
  const audio = [audioTags[0], audioChannels[0]].filter(Boolean).join(" ");
  const labels = [quality, size, encode, ...visualTags, audio].filter(Boolean);
  const seen = new Set();
  return labels
    .filter((label) => {
      const key = label.toLowerCase().replace(/[\s._-]+/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}
