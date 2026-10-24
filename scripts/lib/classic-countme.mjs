const SCALES = { k: 1e3, m: 1e6, b: 1e9 };

/** Parse the permitted Classic badge; an invalid reading is a gap, never zero. */
export function parseBadgeCount(value) {
  if (typeof value !== "string") return null;
  const message = value.trim();
  const compact = message.match(/^(\d+(?:\.\d+)?)([kmb])$/i);
  if (!compact && !/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(message)) {
    return null;
  }
  const count = compact
    ? Number(compact[1]) * SCALES[compact[2].toLowerCase()]
    : Number(message.replace(/,/g, ""));
  return Number.isFinite(count) && count >= 0 ? count : null;
}
