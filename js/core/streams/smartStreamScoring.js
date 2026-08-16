// Lightweight stream ranking for TV browsers. This intentionally scores only
// metadata exposed by addons; it does not probe media URLs or start downloads.

const RESOLUTION_SCORE = {
  "2160p": 100,
  "1440p": 75,
  "1080p": 60,
  "720p": 35,
  "576p": 15,
  "480p": 10
};

function streamText(stream = {}) {
  const resolve = stream.clientResolve || stream.raw?.clientResolve || {};
  const parsed = resolve.stream?.raw?.parsed || {};
  return [
    stream.addonName,
    stream.name,
    stream.title,
    stream.description,
    stream.quality,
    stream.behaviorHints?.filename,
    stream.debridCacheStatus?.cachedName,
    resolve.filename,
    resolve.torrentName,
    parsed.rawTitle,
    parsed.parsedTitle,
    parsed.quality,
    parsed.resolution,
    parsed.codec,
    ...(parsed.hdr || []),
    ...(parsed.audio || []),
    ...(parsed.languages || []),
    ...(parsed.channels || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function has(text, pattern) {
  return pattern.test(text);
}

function resolutionFromText(text) {
  if (has(text, /\b(2160p?|4k|uhd)\b/i)) return "2160p";
  if (has(text, /\b(1440p?|2k)\b/i)) return "1440p";
  if (has(text, /\b(1080p?|fhd)\b/i)) return "1080p";
  if (has(text, /\b(720p?|hd)\b/i)) return "720p";
  if (has(text, /\b576p?\b/i)) return "576p";
  if (has(text, /\b(480p?|sd)\b/i)) return "480p";
  return "unknown";
}

function languageFromText(text) {
  const explicitPtBr = has(
    text,
    /(^|[^a-z0-9])(pt[ ._-]?br|ptbr|pob|por[ ._-]?br|portugu[eê]s(?:[ ._-]+do)?[ ._-]+brasil|portuguese[ ._-]+br(?:azil)?|brazilian[ ._-]+portuguese)([^a-z0-9]|$)/i
  );
  const dubbed = has(text, /\b(dublado|dublagem|dubbed)\b/i);
  const dualAudio = has(text, /\bdual[ ._-]+(audio|áudio)\b/i);
  if (explicitPtBr) return { id: "PT_BR", confidence: "high", label: "PT-BR" };
  if (dubbed) return { id: "PT_BR", confidence: "medium", label: "Dublado" };
  if (dualAudio) return { id: "MULTI", confidence: "medium", label: "Dual áudio" };
  if (has(text, /(^|[^a-z0-9])(pt|por|portugu[eê]s|portuguese)([^a-z0-9]|$)/i)) {
    return { id: "PT", confidence: "low", label: "Português" };
  }
  return { id: "UNKNOWN", confidence: "none", label: "" };
}

function sizeBytes(stream = {}) {
  const resolve = stream.clientResolve || stream.raw?.clientResolve || {};
  return (
    Number(
      resolve.stream?.raw?.size ??
        stream.behaviorHints?.videoSize ??
        stream.debridCacheStatus?.cachedSize ??
        0
    ) || 0
  );
}

function isReady(stream = {}) {
  const state = String(stream.debridCacheStatus?.state || "").toUpperCase();
  const resolve = stream.clientResolve || stream.raw?.clientResolve || {};
  return (
    state === "CACHED" ||
    state === "READY" ||
    resolve.isCached === true ||
    Boolean(stream.url && !String(stream.url).toLowerCase().startsWith("magnet:"))
  );
}

export function scoreSmartStream(stream = {}, { webOs = true } = {}) {
  const text = streamText(stream);
  const resolution = resolutionFromText(text);
  const language = languageFromText(text);
  const reasons = [];
  const warnings = [];
  let score = RESOLUTION_SCORE[resolution] || 0;

  if (resolution !== "unknown") reasons.push(resolution === "2160p" ? "4K" : resolution);

  if (language.id === "PT_BR") {
    score += language.confidence === "high" ? 120 : 90;
    reasons.unshift(language.label);
  } else if (language.id === "MULTI") {
    score += 35;
    reasons.unshift(language.label);
  } else if (language.id === "PT") {
    score += 20;
    reasons.unshift(language.label);
  }

  if (has(text, /\bremux\b/i)) {
    score += 45;
    reasons.push("REMUX");
  } else if (has(text, /\b(blu[ ._-]?ray|bdrip|brrip)\b/i)) {
    score += 35;
    reasons.push("Blu-ray");
  } else if (has(text, /\bweb[ ._-]?dl\b/i)) {
    score += 32;
    reasons.push("WEB-DL");
  } else if (has(text, /\bweb[ ._-]?rip\b/i)) {
    score += 20;
    reasons.push("WEBRip");
  }

  if (has(text, /\b(dolby[ ._-]?vision|dovi|dv)\b/i)) {
    score += 18;
    reasons.push("Dolby Vision");
  }
  if (has(text, /\b(hdr10\+|hdr10plus)\b/i)) {
    score += 18;
    reasons.push("HDR10+");
  } else if (has(text, /\b(hdr10|hdr|hlg)\b/i)) {
    score += 12;
    reasons.push("HDR");
  }

  if (has(text, /\b(eac3|e-ac-3|ddp|dd\+|dolby digital plus)\b/i)) {
    score += 24;
    reasons.push("DD+");
  } else if (has(text, /\b(aac|ac3|dolby digital)\b/i)) {
    score += 12;
  }
  if (has(text, /\batmos\b/i)) {
    score += 8;
    reasons.push("Atmos");
  }

  if (isReady(stream)) {
    score += 30;
    reasons.push("pronto");
  }

  if (has(text, /\b(cam|camrip|hdcam|telesync|telecine)\b/i)) {
    score -= 180;
    warnings.push("qualidade de cinema");
  }
  if (webOs && has(text, /\b(true[ ._-]?hd|dts[ ._-]?(hd|x)|flac|opus)\b/i)) {
    // These formats vary considerably across LG generations and connection
    // types. Prefer a broadly compatible alternative when scores are close.
    score -= 25;
    warnings.push("áudio pode exigir transcodificação");
  }

  const gigabytes = sizeBytes(stream) / 1_000_000_000;
  if (gigabytes > 80) {
    score -= 20;
    warnings.push("arquivo muito grande");
  }

  return {
    score,
    reasons: [...new Set(reasons)].slice(0, 6),
    warnings: [...new Set(warnings)],
    facts: { resolution, language: language.id, languageConfidence: language.confidence, gigabytes }
  };
}

export function rankSmartStreams(streams = [], options = {}) {
  return (Array.isArray(streams) ? streams : [])
    .map((stream, index) => ({ stream, index, analysis: scoreSmartStream(stream, options) }))
    .sort((left, right) => right.analysis.score - left.analysis.score || left.index - right.index);
}

